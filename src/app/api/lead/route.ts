import { NextResponse } from 'next/server'
import { parseLead, submitLead, LeadValidationError, LeadSpamError } from '@/lib/leads'
import { writeClient } from '@/sanity/writeClient'
import { resendSender } from '@/lib/email'
import { rateLimit } from '@/lib/rateLimit'

function callerKey(request: Request): string {
  // Railway sits behind a proxy, so the socket address is the proxy's. The left-most
  // x-forwarded-for entry is the originating client.
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: Request) {
  const limited = rateLimit(callerKey(request))
  if (!limited.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many submissions. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    )
  }

  try {
    const input = parseLead(await request.json())
    const result = await submitLead(input, {
      create: (doc) => writeClient.create(doc as never),
      sender: resendSender,
    })
    return NextResponse.json({ ok: true, id: result.id })
  } catch (err) {
    // A filled honeypot is answered with success. Telling a bot it was detected only
    // teaches it which field to leave alone next time; a real person cannot reach this.
    if (err instanceof LeadSpamError) {
      return NextResponse.json({ ok: true, id: null })
    }
    if (err instanceof LeadValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 })
    }
    // The Sanity write failed — the lead is genuinely lost, so this must be loud in the
    // logs. The visitor gets a plain message rather than the underlying error.
    console.error('Lead submission failed', err)
    return NextResponse.json(
      { ok: false, error: 'Could not save your message' },
      { status: 500 },
    )
  }
}

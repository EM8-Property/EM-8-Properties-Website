import { NextResponse } from 'next/server'
import {
  parseLead,
  submitLead,
  LeadValidationError,
  LeadSpamError,
  MAX_BODY_BYTES,
} from '@/lib/leads'
import { writeClient } from '@/sanity/writeClient'
import { resendSender } from '@/lib/email'
import { rateLimit, isPowerOfTen } from '@/lib/rateLimit'

function callerKey(request: Request): string {
  // The RIGHT-most X-Forwarded-For entry, not the left-most.
  //
  // Proxies append, so the left-most value is whatever the *client* sent — it is
  // attacker-controlled. Keying on it means anyone can send a random X-Forwarded-For per
  // request and get a fresh bucket every time, which is no rate limit at all and also
  // makes the bucket map itself a memory-growth target.
  //
  // The right-most entry is the one Railway's own proxy appended, so it cannot be
  // spoofed from outside. If another proxy layer is ever added in front, this index has
  // to move with it.
  const forwarded = request.headers.get('x-forwarded-for')
  const hops = forwarded?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
  return hops.at(-1) || request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: Request) {
  const limited = rateLimit(callerKey(request))
  if (!limited.allowed) {
    // A 429 discards a submission and tells nobody — the same asymmetry that got the
    // honeypot a log line below. A refusal by the site-wide budget is the one worth
    // hearing about: it means every visitor is being turned away, not just one noisy
    // caller, and it is the only evidence for whether the hourly ceiling is set right.
    //
    // Sampled, not once per refusal. Refusals are uncapped by design, and a caller that
    // first arrives after the budget is spent never acquires a per-key bucket — so it
    // stays on the global path and one address could emit thousands of identical lines a
    // minute, burying the two lines below that mean a real lead may have been lost.
    //
    // At powers of ten rather than only the first, so the volume stays bounded (about
    // seven lines in the worst hour) without discarding the magnitude — how many visitors
    // were turned away is the evidence for whether the ceiling is set right.
    if (limited.scope === 'global' && isPowerOfTen(limited.globalRefusalsInWindow)) {
      console.warn('Lead endpoint refused a submission — site-wide hourly budget spent', {
        refusedThisHour: limited.globalRefusalsInWindow,
        retryAfterSeconds: limited.retryAfterSeconds,
      })
    }
    return NextResponse.json(
      {
        ok: false,
        // "Shortly" is honest for a per-caller block, which clears within a minute. The
        // site-wide budget resets on the hour, so saying "shortly" there would send a
        // real investor back into another refusal.
        //
        // One case still understates the wait: a caller over *both* budgets is scoped
        // 'key', because the per-caller gate runs first, so it is told to retry in a
        // minute when the site-wide budget will refuse it for up to an hour. Not worth
        // code — it is no worse than telling every per-caller block to wait an hour.
        //
        // Phrased without the words "right" or "left": the logical-properties ESLint rule
        // scans every string literal under src/, so ordinary prose containing either one
        // fails the build with a message about Tailwind utilities.
        error:
          limited.scope === 'global'
            ? 'We are receiving an unusual number of submissions. Please try again later.'
            : 'Too many submissions. Please try again shortly.',
      },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    )
  }

  try {
    // Read as text and measure before parsing. Route handlers have no default body-size
    // limit, so JSON.parse would otherwise happily consume an arbitrarily large payload.
    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: 'Submission is too large' }, { status: 413 })
    }

    const input = parseLead(JSON.parse(raw))
    const result = await submitLead(input, {
      create: (doc) => writeClient.create(doc as never),
      sender: resendSender,
      // Records whether the team was actually notified. Without it a lead nobody heard
      // about looks identical to one that went through.
      patch: (id, fields) => writeClient.patch(id).set(fields).commit(),
    })
    return NextResponse.json({ ok: true, id: result.id })
  } catch (err) {
    // A filled honeypot is answered with success. Telling a bot it was detected only
    // teaches it which field to leave alone next time.
    //
    // Logged, though, and deliberately: this path silently discards a submission and
    // tells the sender "someone will be in touch". If a password manager ever starts
    // filling the honeypot field, real investors vanish with no trace anywhere — the
    // exact outcome capture-first exists to prevent. A non-zero rate here means the
    // field name needs changing, and without this line nobody would ever find out.
    if (err instanceof LeadSpamError) {
      console.warn('Honeypot tripped — submission discarded', { caller: callerKey(request) })
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

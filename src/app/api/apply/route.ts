import { NextResponse } from 'next/server'
import {
  parseApplication,
  submitApplication,
  ApplicationValidationError,
  ApplicationSpamError,
  MAX_APPLICATION_BYTES,
} from '@/lib/applications'
import { isJobOpen } from '@/lib/jobTaxonomy'
import { writeClient } from '@/sanity/writeClient'
import { sendApplicationEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rateLimit'
import { verifyTurnstile, TURNSTILE_FIELD } from '@/lib/turnstile'

/** Railway's proxy appends the true client address last; see /api/lead for the detail. */
function callerKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const hops = forwarded?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
  return hops.at(-1) || request.headers.get('x-real-ip') || 'unknown'
}

/**
 * Reads the body, refusing it as soon as it passes `limit` bytes.
 *
 * Route handlers have no body-size limit of their own, and `request.formData()` buffers
 * whatever arrives. A declared Content-Length is checked first because it is free, but it
 * can be absent or wrong, so the stream is counted too.
 */
async function readCapped(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer> | null> {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > limit) return null
  if (!request.body) return new Uint8Array(new ArrayBuffer(0))

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const out = new Uint8Array(new ArrayBuffer(total))
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

const JOB_FOR_APPLICATION = `*[_type == "jobPosting" && slug.current == $slug][0] { _id, title, open, validThrough }`

export async function POST(request: Request) {
  const limited = rateLimit(callerKey(request))
  if (!limited.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    )
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.startsWith('multipart/form-data')) {
    return NextResponse.json({ ok: false, error: 'Expected a form upload' }, { status: 415 })
  }

  try {
    const raw = await readCapped(request, MAX_APPLICATION_BYTES)
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: 'Your files are too large. Please attach files of 5 MB or less each.' },
        { status: 413 },
      )
    }
    const form = await new Response(raw, { headers: { 'content-type': contentType } }).formData()
    const input = await parseApplication(form)

    // The job is read from the dataset, never from the form, so the title in the team's
    // inbox is the real one and a closed role cannot be applied to.
    const job = await writeClient.fetch<{
      _id: string
      title: string
      open: boolean | null
      validThrough: string | null
    } | null>(JOB_FOR_APPLICATION, { slug: input.jobSlug }, { perspective: 'published' })
    if (!job || !isJobOpen(job)) {
      return NextResponse.json(
        { ok: false, error: 'This role is no longer accepting applications.' },
        { status: 410 },
      )
    }

    // After the cheap checks, as on /api/lead: a Turnstile token is single-use, so a
    // refused file type must not have spent it.
    const check = await verifyTurnstile(form.get(TURNSTILE_FIELD))
    if (check.outcome === 'fail') {
      console.warn('Turnstile refused an application', { errorCodes: check.errorCodes })
      return NextResponse.json(
        {
          ok: false,
          error:
            'We could not confirm this was sent by a person. Please reload the page and try again.',
        },
        { status: 400 },
      )
    }
    if (check.outcome === 'unavailable') {
      console.error('Turnstile could not be checked, application accepted unverified', {
        errorCodes: check.errorCodes,
      })
    }

    const result = await submitApplication(input, job, {
      create: (doc) => writeClient.create(doc as never),
      send: sendApplicationEmail,
      patch: (id, fields) => writeClient.patch(id).set(fields).commit(),
    })
    if (!result.emailed) {
      console.error('Application saved but the email with the attachments failed', { id: result.id })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof ApplicationSpamError) {
      console.warn('Honeypot tripped on an application, discarded', { caller: callerKey(request) })
      return NextResponse.json({ ok: true })
    }
    if (err instanceof ApplicationValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 })
    }
    console.error('Application submission failed', err)
    return NextResponse.json(
      { ok: false, error: 'Could not send your application. Please try again.' },
      { status: 500 },
    )
  }
}

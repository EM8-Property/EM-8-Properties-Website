'use client'

import { useState } from 'react'
import { HONEYPOT_FIELD } from '@/lib/leads'
import { TURNSTILE_FIELD } from '@/lib/turnstile'
import { useTurnstile } from '@/components/forms/useTurnstile'

/*
 * Constants copied rather than imported from `@/lib/applications`, which reaches for
 * Node's Buffer and would pull it into the client bundle. The server re-checks both, so
 * these exist only to answer a too-large file before it is uploaded.
 */
const MAX_RESUME_BYTES = 5 * 1024 * 1024
/* Both files together; the Netlify proxy refuses a larger request. See MAX_FILES_TOTAL_BYTES. */
const MAX_FILES_TOTAL_BYTES = 8_000_000
const RESUME_ACCEPT = '.pdf,.doc,.docx'

/* `field-border`, not `rule`: an input's border has to meet 3:1. See LeadForm. */
const inputClass = 'w-full min-w-0 rounded-control border border-field-border px-3 py-2 text-xs'
const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-secondary'
const fileClass =
  'text-xs text-ink-secondary file:me-3 file:rounded-control file:border file:border-field-border file:bg-ground file:px-3 file:py-2 file:text-[11px] file:font-semibold file:uppercase file:tracking-wide file:text-ink hover:file:border-teal'

/**
 * The job application: name, contact details, an optional LinkedIn and note, a
 * required resume and an optional cover letter.
 *
 * Multipart rather than the JSON every other form posts, because of the file. It goes to
 * /api/apply, which checks each file is really a PDF or Word document, saves the application
 * and emails the team with the files attached.
 */
export function ApplicationForm({
  jobSlug,
  submitLabel,
  successMessage,
}: {
  jobSlug: string
  submitLabel: string
  successMessage: string
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)
  const { containerRef, getToken, reset, interactive, enabled } = useTurnstile('careers')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const data = new FormData(e.currentTarget)

    let total = 0
    for (const [field, what] of [
      ['resume', 'resume'],
      ['coverLetter', 'cover letter'],
    ] as const) {
      const file = data.get(field)
      if (file instanceof File && file.size > MAX_RESUME_BYTES) {
        setError(`Your ${what} is larger than 5 MB. Please attach a smaller file.`)
        return
      }
      if (file instanceof File) total += file.size
    }
    // Checked here, not only on the server: a request over the proxy's limit never reaches
    // the server, and Netlify's own refusal carries no message to show.
    if (total > MAX_FILES_TOTAL_BYTES) {
      setError(
        'Your resume and cover letter together are larger than 8 MB. Please attach smaller files.',
      )
      return
    }

    setStatus('sending')
    const token = await getToken()
    if (token) data.set(TURNSTILE_FIELD, token)
    data.set('jobSlug', jobSlug)

    try {
      const res = await fetch('/api/apply', { method: 'POST', body: data })
      const json = await res.json().catch(() => ({ ok: false }))
      if (!json.ok) {
        setError(json.error ?? 'Could not send your application. Please try again.')
        setStatus('idle')
        reset()
        return
      }
      setStatus('sent')
    } catch {
      setError('Could not reach the server. Please try again.')
      setStatus('idle')
      reset()
    }
  }

  if (status === 'sent') {
    return (
      <p role="status" className="rounded-card border border-rule bg-ground p-5 text-sm text-ink">
        {successMessage}
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3" encType="multipart/form-data">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1.5">
          <span className={labelClass}>First name</span>
          <input name="firstName" required autoComplete="given-name" className={inputClass} />
        </label>
        <label className="grid min-w-0 gap-1.5">
          <span className={labelClass}>Last name</span>
          <input name="lastName" required autoComplete="family-name" className={inputClass} />
        </label>
      </div>
      <label className="grid min-w-0 gap-1.5">
        <span className={labelClass}>Email</span>
        <input type="email" name="email" required autoComplete="email" className={inputClass} />
      </label>
      <label className="grid min-w-0 gap-1.5">
        <span className={labelClass}>Phone (optional)</span>
        <input type="tel" name="phone" autoComplete="tel" className={inputClass} />
      </label>
      <label className="grid min-w-0 gap-1.5">
        <span className={labelClass}>LinkedIn profile (optional)</span>
        <input
          type="text"
          inputMode="url"
          name="linkedin"
          placeholder="linkedin.com/in/your-name"
          className={inputClass}
        />
      </label>
      <label className="grid min-w-0 gap-1.5">
        <span className={labelClass}>Resume</span>
        <input
          type="file"
          name="resume"
          required
          accept={RESUME_ACCEPT}
          aria-describedby="resume-hint"
          className={fileClass}
        />
        <span id="resume-hint" className="text-[11px] text-ink-secondary">
          PDF or Word, up to 5 MB.
        </span>
      </label>
      <label className="grid min-w-0 gap-1.5">
        <span className={labelClass}>Cover letter (optional)</span>
        <input
          type="file"
          name="coverLetter"
          accept={RESUME_ACCEPT}
          aria-describedby="cover-letter-hint"
          className={fileClass}
        />
        <span id="cover-letter-hint" className="text-[11px] text-ink-secondary">
          PDF or Word, up to 5 MB. Both files together up to 8 MB.
        </span>
      </label>
      <label className="grid min-w-0 gap-1.5">
        <span className={labelClass}>Anything you would like us to know (optional)</span>
        <textarea name="message" rows={4} className={inputClass} />
      </label>

      {/* Honeypot; see LeadForm for why it is display:none and named as it is. */}
      <div aria-hidden="true" style={{ display: 'none' }}>
        <label>
          Reference
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {enabled && <div ref={containerRef} className={interactive ? undefined : 'absolute'} />}

      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="rounded-control bg-teal px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : submitLabel}
      </button>
    </form>
  )
}

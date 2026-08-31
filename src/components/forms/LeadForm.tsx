'use client'

import { useState } from 'react'
import { HONEYPOT_FIELD } from '@/lib/leads'

export type FieldSpec = {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox'
  required?: boolean
  options?: string[]
}

const inputClass = 'rounded-control border border-rule px-3 py-2 text-xs'

export function LeadForm({
  source,
  fields,
  submitLabel,
}: {
  source: 'keep-in-touch' | 'site-submission'
  fields: FieldSpec[]
  submitLabel: string
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    setError(null)

    const data = Object.fromEntries(new FormData(e.currentTarget).entries())
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, source }),
      })
      const json = await res.json()
      if (!json.ok) {
        setError(json.error ?? 'Something went wrong')
        setStatus('idle')
        return
      }
      setStatus('sent')
    } catch {
      setError('Could not reach the server. Please try again.')
      setStatus('idle')
    }
  }

  if (status === 'sent') {
    return (
      <p className="rounded-card border border-rule bg-panel p-5 text-sm text-ink">
        Thank you — we&rsquo;ve got it and someone will be in touch.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      {fields.map((f) => (
        <label key={f.name} className="grid gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">
            {f.label}
          </span>
          {f.type === 'textarea' ? (
            <textarea name={f.name} required={f.required} rows={4} className={inputClass} />
          ) : f.type === 'select' ? (
            <select name={f.name} required={f.required} className={inputClass}>
              <option value="">Select…</option>
              {f.options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : f.type === 'checkbox' ? (
            <input type="checkbox" name={f.name} required={f.required} className="size-4" />
          ) : (
            <input type={f.type} name={f.name} required={f.required} className={inputClass} />
          )}
        </label>
      ))}

      {/*
        Honeypot. Hidden from sight, removed from the tab order, and aria-hidden so a
        screen reader never announces it — a person cannot fill this in, while a bot that
        fills every field will. The server answers a filled honeypot with a success
        response rather than an error, so the bot learns nothing.

        `display: none` is set as an inline style rather than relying on opacity/size
        utilities: password managers and fill-everything extensions skip display:none far
        more reliably than a visually-hidden-but-rendered field, and a false positive here
        silently discards a real investor.
      */}
      <div aria-hidden="true" style={{ display: 'none' }}>
        <label>
          Reference
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-xs text-[#C0392B]">
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

'use client'

import { useEffect, useRef, useState } from 'react'
import { LeadForm } from '@/components/forms/LeadForm'

/** Remembers a dismissal so the overlay is a one-time ask, not a recurring toll gate. */
export const POPUP_DISMISSED_KEY = 'em8:investor-popup-dismissed'

const DELAY_MS = 15_000

/**
 * A one-time overlay on the homepage inviting a visitor onto the investor list.
 *
 * Interrupting someone is a real cost, so this is deliberately restrained:
 *
 *   - it waits, rather than firing on load, so a visitor sees the site before it asks
 *   - it asks for a name and an email and nothing else. Check size and the accreditation
 *     declaration belong on /investors, where someone has chosen to be
 *   - dismissing it is permanent, remembered locally. A popup that returns on every visit
 *     trains people to close it without reading, which costs more than it captures
 *
 * Every localStorage access is wrapped: private windows and locked-down browsers throw on
 * access rather than returning null, and an uncaught throw here would take the homepage
 * down with it.
 */
function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(POPUP_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function writeDismissed(): void {
  try {
    window.localStorage.setItem(POPUP_DISMISSED_KEY, '1')
  } catch {
    // Nothing to do. A visitor who cannot persist the dismissal sees it again next
    // visit, which is a far smaller problem than a thrown error on the homepage.
  }
}

export function InvestorPopup() {
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (readDismissed()) return
    const id = setTimeout(() => setOpen(true), DELAY_MS)
    return () => clearTimeout(id)
  }, [])

  function dismiss() {
    setOpen(false)
    writeDismissed()
  }

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/*
        The scrim is a button so a pointer user can dismiss by clicking away, which is the
        expected reflex. It is aria-hidden because the same escape route is already
        available to assistive tech through the labelled close button and Escape.
      */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={dismiss}
        className="absolute inset-0 bg-[rgba(26,26,26,0.55)]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="investor-popup-title"
        className="relative w-full max-w-md rounded-card border border-rule bg-white p-6 shadow-lg"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          className="absolute end-3 top-3 rounded-control p-1.5 text-ink-secondary hover:text-ink"
        >
          <span className="sr-only">Close</span>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-teal-text">
          Keep In Touch
        </p>
        <h2
          id="investor-popup-title"
          className="mt-2 text-xl font-bold leading-tight tracking-tight text-ink"
        >
          Want to see what we buy next?
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
          We develop transit-oriented multifamily and mixed-use around Chicago. Leave your
          details and we will let you know when something is open.
        </p>

        <div className="mt-5">
          <LeadForm
            source="keep-in-touch"
            submitLabel="Keep me posted"
            successMessage="Thank you — you are on the list, and we will be in touch when something fits."
            fields={[
              { name: 'firstName', label: 'Name', type: 'text', required: true },
              { name: 'email', label: 'Email address', type: 'email', required: true },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

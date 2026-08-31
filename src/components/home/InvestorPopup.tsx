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

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export type PopupCopy = {
  enabled?: boolean | null
  eyebrow?: string | null
  title?: string | null
  body?: string | null
  submitLabel?: string | null
  successMessage?: string | null
} | null

export function InvestorPopup({ copy }: { copy?: PopupCopy }) {
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // `enabled: false` turns the overlay off from the Studio, no deploy required.
    if (copy?.enabled === false) return
    if (readDismissed()) return
    const id = setTimeout(() => setOpen(true), DELAY_MS)
    return () => clearTimeout(id)
  }, [copy?.enabled])

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

  /*
   * Lock the page behind the overlay.
   *
   * Without this the background scrolls under the scrim on a wheel or a swipe, which
   * reads as the page having come apart. Restoring the previous value rather than
   * clearing it means this cannot stomp on an overflow set by anything else.
   */
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  /*
   * Keep Tab inside the dialog.
   *
   * `aria-modal="true"` tells assistive tech the rest of the page is inert, but it does
   * nothing to the tab order — so without this a keyboard user tabs straight past the
   * form into a page they cannot see behind the scrim, and the modality the attribute
   * advertises is a lie. React's onKeyDown is used rather than a document listener so
   * the handler cannot outlive the dialog.
   */
  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !dialogRef.current) return
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (items.length === 0) return
    const first = items[0]!
    const last = items[items.length - 1]!
    const active = document.activeElement

    if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="investor-popup-title"
        onKeyDown={trapTab}
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
          {copy?.eyebrow}
        </p>
        <h2
          id="investor-popup-title"
          className="mt-2 text-xl font-bold leading-tight tracking-tight text-ink"
        >
          {copy?.title}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
          {copy?.body}
        </p>

        <div className="mt-5">
          <LeadForm
            source="homepage-popup"
            submitLabel={copy?.submitLabel ?? 'Keep me posted'}
            successMessage={copy?.successMessage ?? undefined}
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

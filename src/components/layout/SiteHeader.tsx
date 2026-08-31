'use client'

import { useState } from 'react'
import Link from 'next/link'

const NAV = [
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/track-record', label: 'Track Record' },
  { href: '/insights', label: 'Insights' },
  { href: '/partners', label: 'Partners' },
  { href: '/about', label: 'About' },
]

/**
 * Client component for one reason: the small-viewport disclosure needs state.
 *
 * This header previously had no responsive behaviour at all — one flex row of seven items,
 * no breakpoint, no toggle — so on a 375px screen "About", "Investor Login" and "Get
 * Started" were painted past the right edge and could not be reached. The primary CTA and
 * the investor portal were both mobile-inaccessible, and nothing in the test suite,
 * typecheck, lint or Lighthouse reported it.
 *
 * The links are declared once and revealed with CSS. Rendering a separate mobile menu
 * would duplicate every accessible name in the tree, which is both an a11y problem and
 * what makes `getByRole` ambiguous for anything testing this component.
 */
export function SiteHeader({ agoraUrl }: { agoraUrl: string }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-y-3 px-6 py-4">
        <Link
          href="/"
          className="font-display text-lg font-bold uppercase tracking-wide text-ink"
        >
          EM8 <span className="font-light text-teal-text">Properties</span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-nav"
          className="rounded-control border border-rule p-2 text-ink md:hidden"
        >
          <span className="sr-only">Menu</span>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none">
            {open ? (
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" />
            ) : (
              <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.5" />
            )}
          </svg>
        </button>

        <nav
          id="site-nav"
          className={`${open ? 'flex' : 'hidden'} w-full flex-col items-start gap-4 pb-2 text-xs font-medium text-ink-secondary md:flex md:w-auto md:flex-row md:items-center md:gap-5 md:pb-0`}
        >
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
          {/*
            Agora is a separate product on its own domain and handles accreditation
            verification. It opens in a new tab; rel="noopener noreferrer" keeps the
            opened page from reaching back into this one via window.opener.
          */}
          <a
            href={agoraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-control border border-rule px-3 py-1.5 text-ink hover:border-teal"
          >
            Investor Login
          </a>
          <Link
            href="/investors"
            onClick={() => setOpen(false)}
            className="rounded-control bg-ink px-3 py-1.5 font-semibold uppercase tracking-wide text-white"
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  )
}

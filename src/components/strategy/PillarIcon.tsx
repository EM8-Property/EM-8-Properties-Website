import type { ReactNode } from 'react'
import { PILLAR_ICONS } from '@/lib/pillarIcons'

/**
 * The line icons above each Strategy pillar.
 *
 * Drawn inline rather than loaded as files. Seven 24px glyphs are a few hundred bytes of
 * markup against seven more network requests on a page the resource budget already
 * governs (`docs/resource-budget.md`), and inline is the only form that can inherit
 * `currentColor` — which is what keeps the accent on a token instead of a pasted hex, the
 * rule ESLint enforces across `src/`.
 *
 * `strokeWidth` is 1.5 rather than the more common 2. These sit at 20px beside 10px
 * eyebrows and 12px body copy; at 2 they are the heaviest mark on the page and pull the
 * eye off the words, which on this page are the argument.
 */
const PATHS: Record<string, ReactNode> = {
  resilience: (
    <>
      <path d="M12 3l8 3.2v5.3c0 5-3.4 9-8 10.5-4.6-1.5-8-5.5-8-10.5V6.2L12 3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  diversified: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  supply: (
    <>
      <rect x="3" y="9" width="7" height="12" rx="1" />
      <rect x="12" y="4" width="9" height="17" rx="1" />
      <path d="M15 8h3M15 12h3M15 16h3M6 13h1M6 17h1" />
    </>
  ),
  /*
   * Two overlapping circles, not a handshake. A handshake needs eight or nine curve
   * segments to be legible and turns to mush at 20px; an overlap reads as two parties and
   * what they share at any size, which is the idea the card is carrying.
   */
  partnership: (
    <>
      <circle cx="9" cy="12" r="6" />
      <circle cx="15" cy="12" r="6" />
    </>
  ),
  transit: (
    <>
      <rect x="6" y="3" width="12" height="13" rx="2" />
      <path d="M6 10h12" />
      <path d="M9.5 13h.01M14.5 13h.01" />
      <path d="M9 16l-2 4M15 16l2 4" />
    </>
  ),
  growth: (
    <>
      <path d="M22 7l-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </>
  ),
  households: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16.2 14.2c2.8.4 4.8 2.8 4.8 5.8" />
    </>
  ),
}

/**
 * Renders nothing for a name it does not recognise, which is why the schema offers a
 * dropdown rather than a string field — see `src/lib/pillarIcons.ts`. The card still
 * reads without its icon, so a mismatch degrades rather than breaks.
 */
export function PillarIcon({ name }: { name?: string | null }) {
  const paths = name ? PATHS[name] : undefined
  if (!paths) return null
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths}
    </svg>
  )
}

/** Exported so the schema and this file cannot drift apart — see the test. */
export const DRAWN_ICONS = PILLAR_ICONS.filter((name) => name in PATHS)

/**
 * The `siteSettings` leaves the site cannot render without — in one place, because it was
 * in two and they had already drifted.
 *
 * Before this module the layout threw on seven leaves and `content-integrity` gated four.
 * `contactEmail`, `ctaBand.heading.title` and `ctaBand.submitLabel` were checked by the
 * layout and not by the release gate, so a document missing any of them passed the gate
 * and then failed `next build` at deploy time — the worst place to meet it. The
 * 2026-09-03 handover predicted this drift and said deriving both from one array "would
 * make the next required field free". §5 of the 2026-09-08 spec adds ten nav labels, so
 * this is that array, written before they arrive.
 *
 * Imports nothing, deliberately: a React Server Component and a Vitest integration test
 * both consume it, and anything pulled in here would be pulled into both.
 *
 * Leaves, never parents. `headerCta { label, href }` projects to a truthy object when both
 * of its fields are null, so a guard on the parent waves a half-filled document through
 * and the header renders a dark box with no words in it.
 */
export type RequiredLeaf = {
  /** Dotted accessor into the fetched document. */
  path: string
  /** The projection this leaf needs in a GROQ query, aliased to a flat key. */
  groq: string
  /** What a visitor sees if it is missing. Used to build the thrown message. */
  describe: string
}

export const REQUIRED_SITE_SETTINGS: readonly RequiredLeaf[] = [
  {
    path: 'agoraPortalUrl',
    groq: 'agoraPortalUrl',
    describe: 'agoraPortalUrl — Investor Login has nowhere to point',
  },
  {
    path: 'contactEmail',
    groq: 'contactEmail',
    describe: 'contactEmail — the footer and the Organization JSON-LD both read it',
  },
  {
    path: 'disclaimer',
    groq: 'disclaimer',
    describe: 'disclaimer — the securities language in the footer of every page',
  },
  {
    path: 'headerCta.label',
    groq: '"headerCtaLabel": headerCta.label',
    describe: 'headerCta.label — the header button renders as a dark box with no words',
  },
  {
    path: 'headerCta.href',
    groq: '"headerCtaHref": headerCta.href',
    describe: 'headerCta.href — the header button goes nowhere',
  },
  {
    path: 'ctaBand.heading.title',
    groq: '"ctaBandTitle": ctaBand.heading.title',
    describe: 'ctaBand.heading.title — every page closes on an empty heading',
  },
  {
    path: 'ctaBand.submitLabel',
    groq: '"ctaBandSubmitLabel": ctaBand.submitLabel',
    describe: 'ctaBand.submitLabel — the closing form has an unlabelled submit button',
  },
] as const

function valueAt(source: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
      source,
    )
}

/**
 * Which required leaves are absent, empty, or blank.
 *
 * Empty strings count as missing. `setIfMissing` keys on absence rather than falsiness, so
 * a leaf holding `''` is "present" and useless — and a header button labelled `''` is
 * exactly the defect the guard exists for.
 */
export function missingLeaves(settings: unknown): RequiredLeaf[] {
  return REQUIRED_SITE_SETTINGS.filter((leaf) => {
    const value = valueAt(settings, leaf.path)
    return typeof value === 'string' ? value.trim() === '' : !value
  })
}

/**
 * The `siteSettings` leaves the site cannot render without — in one place, because it was
 * in two and they had already drifted.
 *
 * Before this module the layout threw on seven leaves and `content-integrity` gated four.
 * `contactEmail`, `ctaBand.heading.title` and `ctaBand.submitLabel` were checked by the
 * layout and not by the release gate, so a document missing any of them passed the gate
 * and then failed `next build` at deploy time — the worst place to meet it. The
 * 2026-09-03 handover predicted this drift and said deriving both from one array "would
 * make the next required field free". §5 of the 2026-09-08 spec adds nine nav labels, so
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
  /*
   * The nine navigation labels, spec §5. Hunter's decision of 2026-09-08 put the words in
   * Sanity and left the structure in code; `src/lib/navigation.ts` is the other half, and
   * `navigation.test.ts` joins the two lists in both directions so neither can grow a node
   * the other does not know about.
   *
   * Required rather than defaulted. A label falling back to a literal in the component is
   * the constants.ts fallback pattern this project removed — "There is no constants.ts
   * fallback and no sanity:sync script — both were failure modes on the old site. Missing
   * required content fails the build loudly rather than rendering a broken shell." A tab
   * reading `undefined` is that shell.
   *
   * Every one is nested, so every one carries an aliased projection. That is not stylistic:
   * `content-integrity` rebuilds the nested value from the flat row by reading
   * `leaf.groq.split('"')[1]` as the alias, and an unaliased nested projection is invalid
   * GROQ besides. `requiredContent.test.ts` enforces both the aliasing and the uniqueness.
   */
  {
    path: 'navLabels.aboutUs',
    groq: '"navAboutUs": navLabels.aboutUs',
    describe: 'navLabels.aboutUs — the first nav tab renders with no words in it',
  },
  {
    path: 'navLabels.aboutEm8',
    groq: '"navAboutEm8": navLabels.aboutEm8',
    describe: 'navLabels.aboutEm8 — the About Us menu has an unlabelled link to /about',
  },
  {
    path: 'navLabels.whyEm8',
    groq: '"navWhyEm8": navLabels.whyEm8',
    describe: 'navLabels.whyEm8 — the About Us menu has an unlabelled link to /about#why-em8',
  },
  {
    path: 'navLabels.ourTeam',
    groq: '"navOurTeam": navLabels.ourTeam',
    describe: 'navLabels.ourTeam — the About Us menu has an unlabelled link to /about#team',
  },
  {
    path: 'navLabels.strategy',
    groq: '"navStrategy": navLabels.strategy',
    describe: 'navLabels.strategy — the second nav tab renders with no words in it',
  },
  {
    path: 'navLabels.whyMidwest',
    groq: '"navWhyMidwest": navLabels.whyMidwest',
    describe: 'navLabels.whyMidwest — the Strategy menu has an unlabelled link to /strategy',
  },
  {
    path: 'navLabels.partners',
    groq: '"navPartners": navLabels.partners',
    describe: 'navLabels.partners — the Strategy menu has an unlabelled link to /partners',
  },
  {
    path: 'navLabels.portfolio',
    groq: '"navPortfolio": navLabels.portfolio',
    describe: 'navLabels.portfolio — the Portfolio tab renders with no words in it',
  },
  {
    path: 'navLabels.insights',
    groq: '"navInsights": navLabels.insights',
    describe: 'navLabels.insights — the Insights tab renders with no words in it',
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

import { Eyebrow } from './Eyebrow'

/**
 * `level` exists because this component doubles as both the page title and the section
 * headings beneath it. It hardcoded `<h2>`, so the five pages that use it for their title
 * — /portfolio, /insights, /investors, /track-record, /partners — shipped with no `<h1>`
 * at all. Lighthouse audits heading order rather than h1 presence, which is why a site
 * scoring 100 on accessibility and SEO was missing the single most important heading on
 * five of its eight pages.
 *
 * Default stays 2 so every existing section usage is untouched; only the page title opts
 * in. The class list is shared deliberately — the level is a semantic choice, not a
 * visual one, and the two must not drift apart.
 */
const HEADING_CLASS = 'mt-3 text-3xl font-bold leading-tight tracking-tight text-ink'

export function SectionHeading({
  eyebrow,
  title,
  intro,
  level = 2,
}: {
  eyebrow: string
  title: string
  intro?: string
  level?: 1 | 2
}) {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <div className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading className={HEADING_CLASS}>{title}</Heading>
      {intro && <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{intro}</p>}
    </div>
  )
}

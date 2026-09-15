type Story = {
  acquired?: string | null
  executed?: string | null
  exited?: string | null
  equityMultiple?: string | null
  exitYear?: number | null
  acquiredYear?: number | null
  grossIrr?: number | null
  salePrice?: number | null
}

/** `20500000` -> `$20.5M`. Whole millions lose the decimal: `$8M`, not `$8.0M`. */
function millions(usd: number) {
  const m = usd / 1_000_000
  return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
}

/**
 * The Acquired → Executed → Exited arc for a realized deal, and its figures.
 *
 * Every figure here describes something that already happened, so the labels say
 * "Realized". Forward-looking words — targeted, projected, underwritten — belong on live
 * offerings and would misstate a closed result if used here.
 *
 * The stage labels are h3. They were h4 while this rendered on /track-record, inside a
 * card whose title was a link rather than a heading — so the level skipped from the page's
 * h1 and nothing minded. On /portfolio/[slug] it sits directly under an h2, and heading
 * order is one of the few accessibility rules Lighthouse actually audits.
 *
 * ## "Gross IRR", never "IRR"
 *
 * The word gross is not decoration and must not be tidied away. It is before fees and
 * promote, and on Burbank that is 51.7% against a net-to-LP of 42.5% — nine points between
 * the number on this page and the number an investor received. The sheet behind this only
 * carries a net figure for two of eleven deals, so Hunter's decision of 2026-09-15 was to
 * publish gross across all of them for one consistent basis. That decision is only honest
 * while the label says which basis it is. The schema field is `grossIrr` for the same
 * reason; see `sanity/schema/property.ts`.
 *
 * ## Why every part is independently gated
 *
 * The eleven track-record properties have figures and no prose; the properties that were
 * here before have prose and, mostly, no figures. Rendering either unconditionally gives
 * the other an empty box — three blank paragraphs under three headings, in the previous
 * version of this file, for any deal whose story was never written. So each stage renders
 * only if it has a body, the stage grid only if any stage does, and each figure only if it
 * has a value. A property with nothing to say here renders nothing at all.
 */
export function DealStory({ story }: { story: Story }) {
  const stages = (
    [
      ['Acquired', story.acquired],
      ['Executed', story.executed],
      ['Exited', story.exited],
    ] as const
  ).filter(([, body]) => Boolean(body))

  const hold =
    story.acquiredYear && story.exitYear ? `${story.acquiredYear}–${story.exitYear}` : null

  const figures = [
    story.grossIrr != null ? [`${story.grossIrr}%`, 'Realized Gross IRR', true] : null,
    story.equityMultiple ? [story.equityMultiple, 'Realized Equity Multiple', true] : null,
    story.salePrice != null ? [millions(story.salePrice), 'Sale Price', false] : null,
    hold ? [hold, 'Held', false] : null,
    // The bare exit year is redundant once a hold period is showing both ends of it.
    !hold && story.exitYear ? [String(story.exitYear), 'Exit Year', false] : null,
  ].filter(Boolean) as [string, string, boolean][]

  if (stages.length === 0 && figures.length === 0) return null

  return (
    <div className="mt-4 border-t border-rule pt-4">
      {stages.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {stages.map(([label, body]) => (
            <div key={label}>
              <h3 className="text-[8px] font-semibold uppercase tracking-[0.15em] text-teal-text">
                {label}
              </h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-secondary">{body}</p>
            </div>
          ))}
        </div>
      )}
      {figures.length > 0 && (
        <div
          className={`flex flex-wrap gap-x-8 gap-y-4 ${
            stages.length > 0 ? 'mt-4 border-t border-rule pt-3' : ''
          }`}
        >
          {figures.map(([value, label, accent]) => (
            <div key={label}>
              <div
                className={`text-lg font-bold tracking-tight ${
                  accent ? 'text-teal-text' : 'text-ink'
                }`}
              >
                {value}
              </div>
              <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">
                {label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export type MetricBar = {
  label?: string | null
  value?: number | null
  highlight?: boolean | null
}

/**
 * One decimal for every row, or none for any — never a mix.
 *
 * A column reading `3.1 / 1.6 / 1` invites the reader to compare `1` against `3.1` as
 * though it were a rounder, more certain number than its neighbours. It is the same
 * series to the same precision, so it is formatted to the same precision: if any value
 * carries a fraction, all of them show one place.
 */
function formatter(values: number[]): (value: number) => string {
  const fractional = values.some((v) => !Number.isInteger(v))
  return (value) => value.toFixed(fractional ? 1 : 0)
}

/**
 * A horizontal bar chart, drawn in CSS rather than SVG.
 *
 * SVG would need a width to lay out against and a hardcoded `x` on every rect, and both
 * of those are physical-direction decisions that Phase 2's Hebrew mirror would have to
 * undo by hand. A flex row with a percentage width mirrors for free: `justify-start`
 * resolves against the writing direction, so the bars grow from the start edge in both
 * languages without a second code path.
 *
 * Bars are drawn from a **zero baseline** and the schema holds `value` to zero or above
 * for that reason. A negative rate on this chart would draw as a stub the same side as
 * every positive one and read as a small gain, which is worse than not charting it — so
 * the clamp here is a backstop for a value written past the Studio, not a rendering
 * choice.
 *
 * The bar itself is `aria-hidden`: every number it encodes is already in the `<dd>` beside
 * it, and a screen reader announcing a decorative div twice is noise. The `<dl>` is what
 * carries the data, which is also why this is a description list and not a stack of divs.
 */
/*
 * `unit` carries no default, deliberately, and this is not a style preference.
 *
 * It used to default to `'%'`. That default was unreachable and dishonest at the same
 * time: a JavaScript default fires only on `undefined`, and the page passes
 * `copy.marketUnit` straight from GROQ, which returns `null` for an empty field — so the
 * page never once got a `'%'` out of it, and only the tests did. Reading the signature,
 * though, it looked like the component had an opinion about the unit that the CMS could
 * not see.
 *
 * The default belongs in the schema, where `marketUnit` carries `initialValue: '%'`. There
 * an editor can see it, change it, and clear it. Here it would be the `constants.ts`
 * fallback this project removed: copy living in two places, with the component's copy
 * winning silently whenever the CMS's is absent.
 */
export function MetricBars({
  bars,
  unit,
  source,
}: {
  bars: MetricBar[]
  unit?: string | null
  source?: string | null
}) {
  /*
   * Rows are normalised once, here, rather than read back out of `bars` while rendering.
   * The filter is what makes `label` and `value` present, and a second pass indexing into
   * a parallel array of values re-opens exactly the question this pass just closed.
   */
  const rows = bars
    .filter((b) => b.label && typeof b.value === 'number')
    .map((b) => ({
      label: b.label as string,
      // Clamped, not dropped: see the docblock. The schema holds `value` at zero or above,
      // so this only catches a write that went past the Studio.
      value: Math.max(0, b.value as number),
      highlight: Boolean(b.highlight),
    }))
  if (rows.length === 0) return null

  const max = Math.max(...rows.map((r) => r.value))
  const format = formatter(rows.map((r) => r.value))

  return (
    <div>
      <dl className="flex flex-col gap-3">
        {rows.map((bar) => (
          <div
            key={bar.label}
            className="grid items-center gap-3 sm:grid-cols-[minmax(0,11rem)_1fr_auto]"
          >
            <dt className="text-xs font-medium text-ink">{bar.label}</dt>
            {/*
              `min-w-0` because a grid track sized `1fr` still refuses to shrink below its
              content's min-content width by default, which on a narrow viewport pushes the
              value column off the measure instead of shortening the bar.
            */}
            <div aria-hidden="true" className="flex min-w-0 items-center">
              <div
                className={`h-2.5 rounded-chip ${bar.highlight ? 'bg-teal' : 'bg-ink/15'}`}
                // A floor of 2%, so a row near zero is still a mark rather than nothing at
                // all. Below that a bar is indistinguishable from a missing row.
                style={{ width: `${max > 0 ? Math.max(2, (bar.value / max) * 100) : 2}%` }}
              />
            </div>
            <dd
              className={`text-sm font-bold tabular-nums tracking-tight ${
                bar.highlight ? 'text-teal-text' : 'text-ink'
              }`}
            >
              {format(bar.value)}
              {unit}
            </dd>
          </div>
        ))}
      </dl>

      {/*
        Attribution, and it is not decoration: spec §9's rule is that no figure ships
        without a source behind it. The schema requires this field the moment a single bar
        exists, and the section does not render at all without it — see the page.
      */}
      {source && (
        <p className="mt-5 border-t border-rule pt-3 text-[10px] leading-relaxed text-ink-secondary">
          {source}
        </p>
      )}
    </div>
  )
}

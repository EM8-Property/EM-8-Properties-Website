import type { CSSProperties } from 'react'

/**
 * The proof band — AUM, units managed, realized multiple.
 *
 * Columns are responsive rather than a flat `repeat(n)`. With five stats, a fixed inline
 * grid gives ~75px per column on a 375px viewport, which crushes both the figure and its
 * label. It starts at two columns and only opens to the full count at `lg`, where there
 * is room — *for the default tone*, whose container grows to `mx-auto max-w-[1200px]
 * px-6` at that width.
 *
 * `tone="onPhoto"` does not get that room, so it does not get that rule. It renders
 * inside `PageHero`'s hero-overlay copy column, which is capped at `max-w-[42ch]` —
 * measured at 424px — regardless of viewport width, because `lg:` is a *viewport*
 * breakpoint, not a container query: it fires once the viewport crosses 1024px, whether
 * or not the box the grid actually lives in ever grows. Five columns inside 424px works
 * out to roughly 85px each before gaps, and gaps only shrink that; measured in the
 * browser it was 45px per figure cell, well under the ~75px this docblock already
 * documents as too crushed for `text-2xl` figures like "$100M+" and "36.2%". So
 * `onPhoto` stops at the `sm:grid-cols-3` step (five stats wrap 3+2) and never adopts the
 * `lg:` override at all — not a narrower version of it, none of it. The default tone is
 * unchanged: it still opens to the full column count at `lg`, because its container
 * really does have the room. Do not restore the `lg:` rule for `onPhoto` without first
 * changing the container it measures against — see `tests/unit/ui.test.tsx`, which pins
 * the presence of the `lg:` token on the default tone and its absence on `onPhoto`.
 *
 * `tone="onPhoto"` is the same closed-set pattern `Eyebrow` already uses, and deliberately
 * reuses its exact values rather than choosing new ones: the figure takes `text-white`
 * (what `PageHero`'s own h1 already wears on a photograph) and the label takes
 * `text-white/80` (`Eyebrow`'s own `onPhoto` value). Spec §9 counts seven pre-existing
 * `text-white`-on-a-moving-token pairings a future dark re-theme has to fix and says not
 * to add an eighth; reusing these two exact, already-legal values means this component
 * adds nothing new for that re-theme to find — it moves when `Eyebrow` and the hero h1
 * move, because it is the same value, not a value that happens to match today. The
 * default tone keeps the band's own bordered, panel-grounded look — `border-rule` and
 * `bg-panel` are tokens for a hairline and a fill against a *white* ground, and against a
 * photograph under a dark scrim they either disappear or read as a stray box, so the
 * on-photo tone drops both rather than trying to make them work on an image.
 */
export function StatBand({
  stats,
  tone = 'default',
}: {
  stats: { figure: string; label: string }[]
  tone?: 'default' | 'onPhoto'
}) {
  const onPhoto = tone === 'onPhoto'
  // The `lg:` column override is scoped to the default tone only — see the docblock
  // above. `onPhoto` caps at the `sm:grid-cols-3` step and never receives the `lg:` rule,
  // in any form, because the 424px box it renders in never has room for five.
  const columns = onPhoto
    ? 'grid-cols-2 sm:grid-cols-3'
    : 'grid-cols-2 sm:grid-cols-3 lg:[grid-template-columns:repeat(var(--stat-cols),minmax(0,1fr))]'
  return (
    <div
      data-stat-band
      className={`grid ${columns} ${onPhoto ? '' : 'border-y border-rule bg-panel'}`}
      style={{ '--stat-cols': stats.length } as CSSProperties}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className={onPhoto ? 'px-5 py-5' : 'border-e border-rule px-5 py-5 last:border-e-0'}
        >
          <div
            data-stat-figure
            className={`text-2xl font-bold tracking-tight ${onPhoto ? 'text-white' : 'text-ink'}`}
          >
            {s.figure}
          </div>
          <div
            data-stat-label
            className={`mt-1 text-[8px] font-semibold uppercase tracking-[0.16em] ${
              onPhoto ? 'text-white/80' : 'text-ink-secondary'
            }`}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}

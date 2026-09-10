import type { CSSProperties } from 'react'

/**
 * The proof band — AUM, units managed, realized multiple.
 *
 * Columns are responsive rather than a flat `repeat(n)`. With five stats, a fixed inline
 * grid gives ~75px per column on a 375px viewport, which crushes both the figure and its
 * label. It starts at two columns and only opens to the full count at `lg`, where there
 * is room. The count is passed as a CSS custom property because Tailwind cannot generate
 * a class from a runtime value. `tone` does not touch this: it is a grid-width problem,
 * not a colour one, and holds regardless of what ground the stats sit on.
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
  return (
    <div
      data-stat-band
      className={`grid grid-cols-2 sm:grid-cols-3 lg:[grid-template-columns:repeat(var(--stat-cols),minmax(0,1fr))] ${
        onPhoto ? '' : 'border-y border-rule bg-panel'
      }`}
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

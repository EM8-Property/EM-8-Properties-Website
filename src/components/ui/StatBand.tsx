import type { CSSProperties } from 'react'

/**
 * The proof band — AUM, units managed, realized multiple.
 *
 * Columns are responsive rather than a flat `repeat(n)`. With five stats, a fixed inline
 * grid gives ~75px per column on a 375px viewport, which crushes both the figure and its
 * label. It starts at two columns and only opens to the full count at `lg`, where there
 * is room. The count is passed as a CSS custom property because Tailwind cannot generate
 * a class from a runtime value.
 */
export function StatBand({ stats }: { stats: { figure: string; label: string }[] }) {
  return (
    <div
      className="grid grid-cols-2 border-y border-rule bg-panel sm:grid-cols-3 lg:[grid-template-columns:repeat(var(--stat-cols),minmax(0,1fr))]"
      style={{ '--stat-cols': stats.length } as CSSProperties}
    >
      {stats.map((s) => (
        <div key={s.label} className="border-e border-rule px-5 py-5 last:border-e-0">
          <div className="text-2xl font-bold tracking-tight text-ink">{s.figure}</div>
          <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-secondary">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Small uppercase label above a heading. Always `text-teal-text` (#2C7A74), never
 * `text-teal` (#4ABDB5) — this renders at 10px, where the accent teal measures ~2.2:1
 * on white and fails WCAG AA outright.
 */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-text">
      {children}
    </p>
  )
}

/**
 * Small uppercase label above a heading. Always `text-teal-text` (#2C7A74), never
 * `text-teal` (#4ABDB5) — this renders at 10px, where the accent teal measures ~2.2:1
 * on white and fails WCAG AA outright.
 *
 * `onPhoto` is the inverse case, and the same rule read the other way round: on the
 * homepage hero this sits on photography under a heavy dark scrim, where #2C7A74 is the
 * colour that disappears. White at 80% measures comfortably there, and the accent teal
 * carries the emphasis instead.
 */
export function Eyebrow({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'onPhoto'
}) {
  const colour = tone === 'onPhoto' ? 'text-white/80' : 'text-teal-text'
  return (
    <p className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${colour}`}>
      {children}
    </p>
  )
}

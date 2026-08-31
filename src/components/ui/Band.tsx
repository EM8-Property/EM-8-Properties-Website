export type BandTone = 'ground' | 'panel'

/**
 * Assigns alternating grounds to however many sections actually rendered.
 *
 * The homepage's sections are all conditional, so hardcoding a ground on each one only
 * works for the combination that existed when it was written. Publishing the first two
 * testimonials put two panelled sections back to back — 782px of unbroken grey — without
 * anyone touching the layout.
 *
 * Starts on the plain ground because the stat band directly above is already panelled.
 */
export function alternatingTones(count: number): BandTone[] {
  return Array.from({ length: count }, (_, i) => (i % 2 === 0 ? 'ground' : 'panel'))
}

/**
 * One horizontal band of the page, owning its ground and measure so no section has to.
 *
 * The rule is drawn only on panelled bands: between two bands that already differ in
 * ground, a hairline adds nothing but noise.
 */
export function Band({
  tone,
  children,
}: {
  tone: BandTone
  children: React.ReactNode
}) {
  return (
    <section className={tone === 'panel' ? 'border-y border-rule bg-panel' : undefined}>
      <div className="mx-auto max-w-[1200px] px-6 py-14">{children}</div>
    </section>
  )
}

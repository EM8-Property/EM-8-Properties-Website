/**
 * The EM8 logo, in the one place it is drawn.
 *
 * Until 2026-09-15 the mark was `EM8 Properties` set in Oswald bold uppercase, spelled out
 * character for character in both `SiteHeader` and `SiteFooter` and a third time, in
 * Satori's own inline-style dialect, in `seo/shareCardFrame.tsx`. Three copies of a brand
 * asset drift, and the share card's docblock already said so about its own duplication —
 * "a card is the one surface where nothing in the build, the tests or a typecheck would
 * report that they had". The logo changed, and the first thing that change found was that
 * it had to be made in three files. Hence one component, two variants.
 *
 * ## The two variants are the two supplied assets, not a sizing option
 *
 * - `mark` is `EM8` alone. The header, where a stacked lockup would cost a row that
 *   `headerReservation.ts` has spent three sessions measuring.
 * - `lockup` is `EM8`, a hairline rule, and letterspaced `PROPERTIES` beneath it. The
 *   footer, which has the vertical room and is the one place a visitor might arrive
 *   without having seen the full name.
 *
 * ## Why the `8` is `teal` and not `teal-text`
 *
 * `tokens.ts` requires `tealText` (#2C7A74) below 24px because `teal` (#4ABDB5) measures
 * ~2.2:1 on white. That rule is about **text**, and it stands. The `8` is not text: WCAG
 * 1.4.3 exempts "text that is part of a logo or brand name", and the brand asset's `8` is
 * the bright teal — dropping it to the dark teal produces a different logo, not an
 * accessible one.
 *
 * The rule is still honoured rather than argued around, because the mark is set at 24px,
 * which is exactly the threshold `--color-teal`'s own comment names ("fills, buttons, and
 * figures 24px and up"). **If you shrink the wordmark below 24px, you are outside both the
 * token's rule and the reason it was safe to use here.** That is the constraint, not the
 * 24px itself.
 *
 * ## One deliberate deviation from the supplied artwork
 *
 * The lockup's `PROPERTIES` is a very light grey in the source file — around #9A9A9A,
 * roughly 2.8:1 on white. At the 10px this renders it at, that is not quiet, it is
 * illegible, and the logo exemption that covers the `8` would only mean nobody is obliged
 * to fix it. It is set in `ink-secondary` (#555555) instead, which reads as the same
 * recessive grey at this size and passes. Flagged to Hunter on 2026-09-15 rather than done
 * silently, because it is a change to a brand asset and that is his call, not mine.
 *
 * ## The accessible name is still the company's name
 *
 * The header's link is the only route home from every page, and its accessible name used to
 * be "EM8 Properties" because that is what it said. The `mark` variant says `EM8`, so it
 * carries the rest in `sr-only` text — a screen reader and a crawler both still read "EM8
 * Properties", and the visible mark is the supplied one. Without this the site's home link
 * announces as three characters.
 */
export function Wordmark({
  variant = 'mark',
  className = '',
}: {
  /** `mark` for `EM8` alone, `lockup` for the stacked full logo. */
  variant?: 'mark' | 'lockup'
  /** Layout only. Type and colour belong to the logo and are not overridable. */
  className?: string
}) {
  /*
   * `leading-none` on purpose: Cormorant is a tall-ascender face, and the default line box
   * adds ~8px of dead space above the caps that reads as the header being misaligned.
   *
   * The `8` is `1.06em` rather than a second fixed size so that it stays proportional if
   * the mark is ever set larger. Sharing a baseline with the letters, a larger glyph
   * overhangs the cap height and the baseline by the same small amount, which is the
   * relationship in the supplied artwork.
   */
  const em8 = (
    <span className="font-wordmark text-2xl font-light leading-none tracking-[0.06em] text-ink">
      EM<span className="text-[1.06em] text-teal">8</span>
    </span>
  )

  if (variant === 'mark') {
    return (
      <span className={`inline-flex items-center ${className}`}>
        {em8}
        <span className="sr-only"> Properties</span>
      </span>
    )
  }

  /*
   * `items-center`, because `EM8` sits centred over `PROPERTIES` in the supplied artwork —
   * it was left-aligned here until Hunter pointed it out on 2026-09-15.
   *
   * The rule takes `self-stretch` to opt back out of that centring and span the full width
   * of the column. The column is as wide as its widest child, which is the letterspaced
   * `PROPERTIES`, so the rule overhangs `EM8` on both sides exactly as the artwork does —
   * a proportion the layout arrives at rather than a magic number that would go stale the
   * moment the tracking changed.
   *
   * `-me-[0.42em]` cancels the trailing letter-space CSS adds after the final `S`. Without
   * it the text box is 0.42em wider than the ink it contains, so centring the box leaves
   * the word visibly a fifth of a letter left of centre — and the rule, sized by that same
   * box, overhangs further right than left. It is the difference between centred and
   * optically centred.
   */
  return (
    <span className={`inline-flex flex-col items-center ${className}`}>
      {em8}
      <span aria-hidden="true" className="mt-2.5 h-px self-stretch bg-rule" />
      <span className="-me-[0.42em] mt-2 font-wordmark text-[10px] font-light uppercase leading-none tracking-[0.42em] text-ink-secondary">
        Properties
      </span>
    </span>
  )
}

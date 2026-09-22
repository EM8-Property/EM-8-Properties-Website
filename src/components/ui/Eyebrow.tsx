/**
 * Small uppercase label above a heading. Always `text-teal-text` (#2C7A74), never
 * `text-teal` (#4ABDB5) — this renders at 10px, where the accent teal measures ~2.2:1
 * on white and fails WCAG AA outright.
 *
 * `onPhoto` is the inverse case, and the same rule read the other way round: in the hero
 * band that opens all seven section pages, this sits on photography under a heavy dark
 * scrim, where #2C7A74 is the colour that disappears. White measures comfortably there,
 * and the accent teal carries the emphasis instead.
 *
 * That branch now also sets the label in a dark lozenge rather than straight on the
 * image, and takes its own size and tracking with it. The numbers, and why the padding
 * sits where it does, are in the branch itself.
 */
export function Eyebrow({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'onPhoto' | 'onClearPhoto'
}) {
  /*
   * On a photograph the label is set in a dark lozenge rather than straight on the
   * image, and the three numbers here are all phone measurements at 375x812.
   *
   * 11px over 10px, and 0.14em over 0.24em, because the tracking is what was actually
   * hurting it: at 10px/0.24em the homepage eyebrow ("Transit-Oriented Development ·
   * Suburban Chicago", 46 characters) runs 327px and wraps, and the wrap is where a
   * letter-spaced line stops reading as one label. It still wraps at 11px/0.14em —
   * nothing short of shrinking the type fits 46 characters on a 327px line — so the
   * lozenge is built to wrap well instead of pretending it will not.
   *
   * That is what `box-decoration-break: clone` is for. The span is INLINE, so each
   * wrapped line gets its own rounded fill rather than one ragged L-shape spanning the
   * block. Two snug pills read as the reference's single pill does; one full-width
   * rounded rectangle does not.
   *
   * `leading-[2]` is load-bearing, not taste. An inline background paints the font's
   * content box plus its padding — 11px x 1.2 + 8px = about 21px here — and anything
   * taller than the line box overlaps the line above it. 11px x 2 = 22px clears it by
   * 1px. Lower the leading or raise `py` and the two pills collide.
   *
   * That pair is also the whole cost of this element, so it was costed rather than
   * chosen. At 375x812 the eyebrow block goes from 30px (10px over a 1.5 leading, no
   * lozenge) to 44px, and `py-1.5`/`leading-[2.3]` — a more generous lozenge that looks
   * no better at this size — was 51px. 14px of the hero's 47px growth is here; 21px
   * would have been a third of it for 2px of padding.
   *
   * The padding sits on the inline span, NOT on the `p`. Padding on an inline child does
   * not enter its block parent's layout box, so the `p` still measures lines x leading —
   * which is what `tests/e2e/site.spec.ts` selects (`[data-hero-overlay] p`) to prove the
   * hero copy clears the overlaid header. Move the padding onto the `p` and that box
   * grows upward by 6px on every one of the seven pages, into a clearance that was
   * already measured at 6px of margin at 320px.
   *
   * The text stays white rather than taking the reference's teal, and the scrim is why.
   * `bg-black/40` is translucent, so the ground under this text is the photograph: on a
   * pale slide it lands near L=0.48, where #4ABDB5 measures about 1.6:1 — worse than the
   * white it replaced, at a size the 24px-and-up contract for the accent teal does not
   * cover. White at 90% on the same ground is strictly better than the 80% straight on
   * the photograph that shipped before. An opaque lozenge would carry teal safely; a
   * translucent one cannot.
   *
   * `onClearPhoto` is the same lozenge for the homepage, whose phone scrim went to 10% on
   * 2026-09-22 (`PHONE_SCRIM_SCREEN` in HeroCarousel.tsx). With almost no gradient under
   * it, 40% leaves this 11px text at 3.37:1 on the palest slide, against the brightest
   * 10% of the pixels behind it. 60% measures 6.16. Phone only: above `sm` the scrim is
   * the old heavy one and the pill stays exactly as it was.
   */
  if (tone === 'onPhoto' || tone === 'onClearPhoto') {
    const fill = tone === 'onClearPhoto' ? 'bg-black/60 sm:bg-black/40' : 'bg-black/40'
    return (
      <p className="text-[11px] font-semibold uppercase leading-[2] tracking-[0.14em]">
        <span className={`rounded-full ${fill} px-3 py-1 text-white/90 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]`}>
          {children}
        </span>
      </p>
    )
  }

  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-text">
      {children}
    </p>
  )
}

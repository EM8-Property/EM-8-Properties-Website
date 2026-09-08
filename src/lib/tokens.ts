export const palette = Object.freeze({
  ground: '#FFFFFF',
  panel: '#F5F5F3',
  ink: '#1A1A1A',
  inkSecondary: '#555555',
  rule: '#D8D8D4',
  teal: '#4ABDB5',
  /**
   * Required for teal text below 24px. `teal` measures ~2.2:1 on white and fails WCAG AA;
   * the test in tests/unit/tokens.test.ts is what keeps this from quietly regressing.
   */
  tealText: '#2C7A74',
  /**
   * Colours that lived as Tailwind arbitrary values in components until 2026-09-08.
   *
   * They are here because the palette has to be *whole* before the ground can move: a
   * token swap only moves what is in the palette, and every one of these was invisible to
   * both contrast tests. `danger` is the sharpest case — it is the lead form's error
   * message, and at #C0392B it measures 3.20:1 on a dark ground, below the 4.5 a text
   * colour needs, on the only conversion path the site has.
   */
  danger: '#C0392B',
  tealHover: '#3AA8A0',
  /**
   * An input's border, which WCAG 1.4.11 holds to 3:1 because it conveys where the
   * control is. `rule` is 1.43:1 against white and stays that way — it draws dividers,
   * which 1.4.11 does not govern. LeadForm used `rule` for its inputs, so the site ships
   * a 1.43:1 field border today; that is the defect this split fixes.
   */
  fieldBorder: '#959590',
})

function channel(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const hi = la > lb ? la : lb
  const lo = la > lb ? lb : la
  return (hi + 0.05) / (lo + 0.05)
}

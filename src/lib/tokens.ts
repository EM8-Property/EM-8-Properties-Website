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

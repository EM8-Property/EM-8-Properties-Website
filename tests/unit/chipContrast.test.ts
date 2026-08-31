import { describe, it, expect } from 'vitest'
import { CHIP_COLORS, CHIP_FALLBACK_COLOR } from '@/components/ui/Chip'
import { palette, contrastRatio } from '@/lib/tokens'

/**
 * Chips render white text on a solid fill, so every fill has to clear 4.5:1 against
 * white. The original palette ranged 2.16:1 to 4.37:1 — all ten failing — and nothing
 * caught it because the contrast test only covered the brand palette, not the colours
 * invented for this component.
 *
 * This makes the chip palette self-guarding: adding a colour that fails is now a test
 * failure rather than something a reviewer has to notice.
 */
describe('chip fills', () => {
  it('has a colour for every kind the schema can produce', () => {
    for (const kind of [
      'multifamily',
      'mixed-use',
      'townhomes',
      'industrial',
      'senior',
      'stabilized',
      'lease-up',
      'under-construction',
      'renovation-complete',
      'sold',
    ]) {
      expect(CHIP_COLORS[kind], `no colour for "${kind}"`).toBeDefined()
    }
  })

  it('carries white text at 4.5:1 or better on every fill', () => {
    const failures = Object.entries(CHIP_COLORS)
      .map(([kind, hex]) => ({ kind, hex, ratio: contrastRatio(hex, '#FFFFFF') }))
      .filter(({ ratio }) => ratio < 4.5)
    expect(
      failures,
      `chip fills below 4.5:1 on white:\n  ${failures
        .map((f) => `${f.kind} ${f.hex} = ${f.ratio.toFixed(2)}:1`)
        .join('\n  ')}`,
    ).toEqual([])
  })

  it('holds the fallback colour to the same standard', () => {
    expect(contrastRatio(CHIP_FALLBACK_COLOR, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })

  it('never uses the accent teal as a chip fill', () => {
    // #4ABDB5 measures 2.27:1 against white. It is a large-figure and button colour,
    // not a background for 10px uppercase text.
    expect(Object.values(CHIP_COLORS)).not.toContain(palette.teal)
  })
})

describe('teal-filled controls', () => {
  it('carries ink text on the accent teal, not white', () => {
    // Every primary call to action sits on #4ABDB5. White on it is 2.27:1 — worse than
    // the accent-teal-text case spec §2.3 forbids, and Lighthouse failed the site's
    // accessibility score on exactly this. Ink on the same fill is 7.66:1, so the accent
    // colour itself is unchanged and only the text colour moved.
    expect(contrastRatio(palette.ink, palette.teal)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#FFFFFF', palette.teal)).toBeLessThan(4.5)
  })
})

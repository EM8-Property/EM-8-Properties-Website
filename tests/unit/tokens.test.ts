import { describe, it, expect } from 'vitest'
import { palette, contrastRatio } from '@/lib/tokens'

describe('brand palette', () => {
  it('uses the exact EM8 teal', () => {
    expect(palette.teal).toBe('#4ABDB5')
  })

  it('small teal text passes WCAG AA on white', () => {
    expect(contrastRatio(palette.tealText, palette.ground)).toBeGreaterThanOrEqual(4.5)
  })

  it('accent teal does NOT pass as body text — this is why tealText exists', () => {
    expect(contrastRatio(palette.teal, palette.ground)).toBeLessThan(4.5)
  })

  it('body text passes on both grounds', () => {
    expect(contrastRatio(palette.ink, palette.ground)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(palette.inkSecondary, palette.panel)).toBeGreaterThanOrEqual(4.5)
  })
})

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

describe('tokens that were literals in components', () => {
  it('carries a danger colour that passes as text on the ground', () => {
    // #C0392B was `text-[#C0392B]` in LeadForm. It measures 5.44:1 on white and 3.20:1
    // on #1A1A1A — so the value that ships today fails the moment the ground moves, on
    // the error message of the site's only conversion path.
    expect(contrastRatio(palette.danger, palette.ground)).toBeGreaterThanOrEqual(4.5)
  })

  it('carries a teal hover that is darker than the accent', () => {
    // #3AA8A0 was `hover:bg-[#3AA8A0]` in Button and OfferingBlock. It measures 2.88:1 on
    // white and 6.04:1 on #1A1A1A — 2.88 is below the 3:1 WCAG 1.4.11 asks of a control
    // boundary. Spec §4 logs this as a known defect and schedules no fix for it in this
    // PR: unlike fieldBorder, it has no replacement value to move to today. The dark
    // re-theme in spec §9 is what resolves it, to 6.04.
    //
    // The assertion below checks against a hardcoded '#FFFFFF', not palette.ground, and
    // that is deliberate rather than an oversight: white here is a fixed yardstick for
    // measuring which of two colours is darker, not a stand-in for the page background. A
    // hover state has to be darker than the colour it hovers over, and contrast against a
    // constant reference is a monotonic proxy for darkness — a property of the two colours
    // themselves, so it holds under any theme. Writing this against palette.ground instead
    // would invert and fail once the ground goes dark, because tealHover is not one of the
    // tokens spec §9 moves alongside it.
    expect(contrastRatio(palette.tealHover, '#FFFFFF')).toBeGreaterThan(
      contrastRatio(palette.teal, '#FFFFFF')
    )
  })

  it('carries a field border at 3:1, which `rule` deliberately is not', () => {
    // WCAG 1.4.11: an input's border conveys where the control is, so it needs 3:1. A
    // divider does not. `rule` is 1.43:1 against white by design; splitting the token is
    // what lets both be correct.
    expect(contrastRatio(palette.fieldBorder, palette.ground)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(palette.rule, palette.ground)).toBeLessThan(3)
  })
})

import { describe, it, expect } from 'vitest'
import { formatWalk, formatUnits } from '@/lib/format'

describe('formatWalk', () => {
  it('renders the TOD claim as a countable fact', () => {
    expect(formatWalk(2, 'Tinley Park')).toBe('2 min walk · Tinley Park Metra')
  })

  it('returns null when the property is not near a station', () => {
    expect(formatWalk(undefined, undefined)).toBeNull()
    expect(formatWalk(5, undefined)).toBeNull()
    expect(formatWalk(undefined, 'Tinley Park')).toBeNull()
  })

  it('handles the one-minute case', () => {
    expect(formatWalk(1, 'Oak Forest')).toBe('1 min walk · Oak Forest Metra')
  })

  it('renders a zero-minute walk rather than treating 0 as missing', () => {
    // A property at the station is the strongest possible version of the TOD claim.
    // A falsy check on minutes would silently drop it.
    expect(formatWalk(0, 'Oak Forest')).toBe('0 min walk · Oak Forest Metra')
  })
})

describe('formatUnits', () => {
  // The residential/retail split exists because the live site and the internal portfolio
  // sheet disagreed on three properties — the sheet counted retail suites in the unit
  // total, the site did not. Rendering one combined number would hide that distinction
  // again, so a mixed-use asset must state both.
  it('states residential and retail separately for a mixed-use asset', () => {
    expect(formatUnits(90, 3)).toBe('90 Residential · 3 Retail')
  })

  it('says only "Units" when there is no retail component', () => {
    expect(formatUnits(40, null)).toBe('40 Units')
    expect(formatUnits(40, 0)).toBe('40 Units')
  })

  it('does not render "1 Units" for a single-tenant asset', () => {
    expect(formatUnits(1, null)).toBe('1 Unit')
    expect(formatUnits(90, 1)).toBe('90 Residential · 1 Retail')
  })

  it('handles a retail-only asset', () => {
    expect(formatUnits(null, 4)).toBe('4 Retail')
  })

  it('returns null when neither count is known, so no stray separator renders', () => {
    expect(formatUnits(null, null)).toBeNull()
    expect(formatUnits(undefined, undefined)).toBeNull()
  })
})

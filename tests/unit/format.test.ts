import { describe, it, expect } from 'vitest'
import { formatWalk } from '@/lib/format'

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

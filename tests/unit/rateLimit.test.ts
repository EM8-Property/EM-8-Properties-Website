import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, resetRateLimits } from '@/lib/rateLimit'

beforeEach(() => resetRateLimits())

describe('rateLimit', () => {
  it('allows a normal burst of submissions', () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit('1.2.3.4', 1000).allowed).toBe(true)
    }
  })

  it('blocks once the window limit is exceeded', () => {
    for (let i = 0; i < 5; i++) rateLimit('1.2.3.4', 1000)
    const blocked = rateLimit('1.2.3.4', 1000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('tracks callers independently', () => {
    for (let i = 0; i < 6; i++) rateLimit('1.2.3.4', 1000)
    expect(rateLimit('5.6.7.8', 1000).allowed).toBe(true)
  })

  it('lets a blocked caller back in after the window rolls over', () => {
    for (let i = 0; i < 6; i++) rateLimit('1.2.3.4', 1000)
    expect(rateLimit('1.2.3.4', 1000).allowed).toBe(false)
    expect(rateLimit('1.2.3.4', 1000 + 60_001).allowed).toBe(true)
  })
})

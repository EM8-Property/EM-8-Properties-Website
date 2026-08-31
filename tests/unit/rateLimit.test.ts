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

/**
 * The global ceiling had no coverage at all until now, which is how it went unnoticed
 * that 100/hour is shared by every form on the site: the newsletter capture in `CtaBand`
 * (twelve pages), the homepage overlay, /investors Keep in Touch, and the /partners site
 * submission all POST to the same `/api/lead`. The limiter runs before the body is read,
 * so it cannot tell an email-only newsletter signup from an accredited investor.
 *
 * That makes the ceiling a shared budget, and the investor form the thing that must not
 * be starved out of it.
 */
describe('rateLimit — global ceiling', () => {
  it('admits a legitimate site-wide burst well past the old hundred-per-hour ceiling', () => {
    for (let i = 0; i < 300; i++) {
      expect(rateLimit(`10.0.${Math.floor(i / 256)}.${i % 256}`, 1000).allowed).toBe(true)
    }
  })

  it('still caps total damage once the hourly budget is spent', () => {
    for (let i = 0; i < 400; i++) rateLimit(`10.1.${Math.floor(i / 256)}.${i % 256}`, 1000)

    // A caller who has never been seen before, so only the global budget can refuse it.
    const blocked = rateLimit('203.0.113.7', 1000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('reopens the global budget when the hour rolls over', () => {
    for (let i = 0; i < 401; i++) rateLimit(`10.2.${Math.floor(i / 256)}.${i % 256}`, 1000)
    expect(rateLimit('203.0.113.7', 1000).allowed).toBe(false)
    expect(rateLimit('203.0.113.7', 1000 + 3_600_001).allowed).toBe(true)
  })
})

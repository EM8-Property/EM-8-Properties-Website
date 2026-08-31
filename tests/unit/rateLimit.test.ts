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

  it('names which budget refused, so a 429 can be diagnosed', () => {
    for (let i = 0; i < 5; i++) rateLimit('1.2.3.4', 1000)
    expect(rateLimit('1.2.3.4', 1000).scope).toBe('key')
    expect(rateLimit('5.6.7.8', 1000).scope).toBe(null)
  })
})

/** Distinct, never-repeated caller keys, so only the global budget can refuse them. */
function distinctKey(prefix: string, i: number): string {
  return `${prefix}.${Math.floor(i / 256)}.${i % 256}`
}

/**
 * The global ceiling had no coverage at all until now, which is how two things went
 * unnoticed: that 100/hour is shared by every form on the site, and that refused requests
 * were spending it.
 *
 * Every form POSTs to the same `/api/lead` — the newsletter capture in `CtaBand` on the
 * homepage and every property page, the homepage overlay, /investors Keep in Touch, and
 * the /partners site submission. The limiter runs before the body is read, so it cannot
 * tell an email-only newsletter signup from an accredited investor. That makes the
 * ceiling a shared budget, and the investor form the thing that must not be starved out
 * of it.
 */
describe('rateLimit — global ceiling', () => {
  it('sets the site-wide ceiling inside the approved 300–500 band', () => {
    // Probed rather than asserted against the constant: the product decision was a
    // range, not a number, so a later retune within that range is not a regression.
    let admitted = 0
    for (let i = 0; i < 2000; i++) {
      if (!rateLimit(distinctKey('10.0', i), 1000).allowed) break
      admitted++
    }
    expect(admitted).toBeGreaterThanOrEqual(300)
    expect(admitted).toBeLessThanOrEqual(500)
  })

  it('refuses with the global scope and an hour-long retry once the budget is spent', () => {
    let refused = rateLimit('198.51.100.1', 1000)
    for (let i = 0; i < 2000 && refused.allowed; i++) {
      refused = rateLimit(distinctKey('10.1', i), 1000)
    }
    expect(refused.allowed).toBe(false)
    expect(refused.scope).toBe('global')
    // Distinguishes a global refusal from a per-key one, which retries within a minute.
    expect(refused.retryAfterSeconds).toBeGreaterThan(3000)
  })

  it('reopens the global budget when the hour rolls over', () => {
    for (let i = 0; i < 2000; i++) {
      if (!rateLimit(distinctKey('10.2', i), 1000).allowed) break
    }
    expect(rateLimit('203.0.113.7', 1000).allowed).toBe(false)
    expect(rateLimit('203.0.113.7', 1000 + 3_600_001).allowed).toBe(true)
  })

  /**
   * The ceiling has to bound *damage* — documents written and emails sent — not traffic.
   *
   * While the global counter incremented on every attempt, one unspoofed address could
   * spend the entire hourly budget on requests the per-key limiter had already refused:
   * 400 cheap requests, 5 of them served, and every visitor after that got a 429 for the
   * rest of the hour. That is a strictly worse version of the failure this ceiling was
   * raised to prevent, and it cost an attacker almost nothing.
   */
  it('does not let one caller spend the site-wide budget on requests it is not served', () => {
    for (let i = 0; i < 1000; i++) rateLimit('1.2.3.4', 1000)
    expect(rateLimit('203.0.113.7', 1000).allowed).toBe(true)
  })

  it('charges a caller its own budget only for requests that are served', () => {
    // Spend the global budget with other callers, then refuse a caller that has never
    // been seen. Its per-minute budget must be intact once the hour rolls over.
    for (let i = 0; i < 2000; i++) {
      if (!rateLimit(distinctKey('10.3', i), 1000).allowed) break
    }
    for (let i = 0; i < 20; i++) {
      expect(rateLimit('203.0.113.7', 1000).scope).toBe('global')
    }
    // The 20 global refusals above must not have counted against this caller's own five.
    for (let i = 0; i < 5; i++) {
      expect(rateLimit('203.0.113.7', 1000 + 3_600_001).allowed).toBe(true)
    }
  })
})

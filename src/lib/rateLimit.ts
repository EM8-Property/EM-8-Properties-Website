/**
 * Minimal fixed-window rate limiter, in process memory.
 *
 * Deliberately small. It exists so a single script cannot hammer the public lead
 * endpoint into writing thousands of documents and sending thousands of emails, which is
 * the realistic abuse of a form that writes to a CMS.
 *
 * **Known limitation:** the counter lives in one server process. Railway running more
 * than one instance means the effective limit is `LIMIT × instances`, and a deploy
 * resets it. That is an acceptable first line of defence alongside the honeypot; if lead
 * spam ever becomes a real problem, this is the piece to replace with a shared store,
 * not the thing to tune.
 */

type Bucket = { count: number; resetAt: number }

const WINDOW_MS = 60_000
const LIMIT = 5
const MAX_TRACKED_KEYS = 10_000

const buckets = new Map<string, Bucket>()

/**
 * A ceiling across all callers combined.
 *
 * Per-key limiting can always be diluted — by a botnet, or by any weakness in deriving
 * the key from proxy headers. This bounds total damage regardless of how many distinct
 * keys an attacker can present: at worst they burn the global budget for the hour, and
 * the CMS survives it.
 *
 * **Why 400 and not 100.** Every form on the site posts to the same `/api/lead`, and the
 * limiter runs before the body is read, so it cannot tell them apart: the newsletter
 * capture in `CtaBand` renders on the homepage and every property page (twelve today,
 * thirteen the day someone adds a property), the homepage overlay is one more form on
 * that same homepage, and /investors Keep in Touch and the /partners site submission
 * share the budget too. At 100/hour a run of ordinary newsletter signups could spend the
 * whole ceiling and answer a real accredited investor with a 429 — which writes no `lead`
 * document and sends no email, losing the submission outright. That inverts the
 * capture-first rationale this endpoint exists to serve.
 *
 * 400 also clears one boundary that 300 does not: a single well-behaved caller can be
 * served at most 5/minute, or 300/hour, so no one compliant key can exhaust the site-wide
 * budget on its own.
 *
 * It does not *fix* the sharing: a distributed flood can still starve the investor form,
 * just at four times the cost. Scoping the budget per lead `source` would fix that
 * properly, but it means parsing the body before rate limiting — a security-ordering
 * change, and a separate decision.
 *
 * On the mail account specifically, this limiter was never the protection: Resend's
 * allowance is around 100/day, which even the old 100/hour ceiling exceeded. Capture-first
 * is what contains that — the `lead` document is still written and `submitLead` records
 * `emailed: false`, so a lead nobody was told about is still recoverable.
 */
const GLOBAL_WINDOW_MS = 3_600_000
const GLOBAL_LIMIT = 400
let globalBucket: Bucket = { count: 0, resetAt: 0 }

export type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
  /** Which budget refused, for logging. `null` when the request is allowed. */
  scope: 'key' | 'global' | null
}

export function rateLimit(key: string, now: number = Date.now()): RateLimitResult {
  // The per-key check comes FIRST, and neither counter is committed until the request is
  // known to be served.
  //
  // While the global counter incremented on every attempt, a refused request still spent
  // site-wide budget — so one unspoofed address could send 400 cheap requests, have 5 of
  // them served, and 429 every visitor for the rest of the hour. That made the ceiling
  // bound traffic, which is the cheap thing, rather than damage, which is what the
  // comment above claims and what the ceiling is for.
  //
  // Ordering it this way keeps the reasoning behind the ceiling intact — a botnet's
  // *served* requests still hit 400 and stop — while making per-key-refused spam unable
  // to starve the investor form at all.
  const existing = buckets.get(key)
  const keyWindowIsFresh = !existing || now >= existing.resetAt

  if (existing && !keyWindowIsFresh && existing.count >= LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      scope: 'key',
    }
  }

  if (now >= globalBucket.resetAt) {
    globalBucket = { count: 0, resetAt: now + GLOBAL_WINDOW_MS }
  }
  if (globalBucket.count >= GLOBAL_LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((globalBucket.resetAt - now) / 1000)),
      scope: 'global',
    }
  }

  // Served. Commit both counters together.
  globalBucket.count += 1

  if (existing && !keyWindowIsFresh) {
    existing.count += 1
  } else {
    // Opportunistic sweep so a stream of unique keys cannot grow the map without bound.
    if (buckets.size > MAX_TRACKED_KEYS) {
      for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k)
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
  }

  return { allowed: true, retryAfterSeconds: 0, scope: null }
}

/** Test seam. */
export function resetRateLimits(): void {
  buckets.clear()
  globalBucket = { count: 0, resetAt: 0 }
}

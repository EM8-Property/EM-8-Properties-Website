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
 * the CMS and the mail account survive it.
 *
 * **Why 400 and not 100.** Every form on the site posts to the same `/api/lead`, and the
 * limiter runs before the body is read, so it cannot tell them apart: the newsletter
 * capture in `CtaBand` appears on twelve pages, the homepage overlay on one more, and
 * /investors Keep in Touch and the /partners site submission share the same budget. At
 * 100/hour a run of ordinary newsletter signups could spend the whole ceiling and answer
 * a real accredited investor with a 429 — which writes no `lead` document and sends no
 * email, losing the submission outright. That inverts the capture-first rationale this
 * endpoint exists to serve, and it fails in exactly the direction the site cannot afford.
 *
 * 400 keeps a real ceiling on abuse — a spammer still cannot write thousands of
 * documents — while leaving the shared budget far clear of legitimate traffic. It does
 * not *fix* the sharing: a determined flood can still starve the investor form, just at
 * four times the cost. Scoping the budget per `source` would fix it properly, but that
 * means parsing the body before rate limiting, which is a security-ordering change and a
 * separate decision.
 */
const GLOBAL_WINDOW_MS = 3_600_000
const GLOBAL_LIMIT = 400
let globalBucket: Bucket = { count: 0, resetAt: 0 }

export function rateLimit(
  key: string,
  now: number = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  if (now >= globalBucket.resetAt) {
    globalBucket = { count: 0, resetAt: now + GLOBAL_WINDOW_MS }
  }
  globalBucket.count += 1
  if (globalBucket.count > GLOBAL_LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((globalBucket.resetAt - now) / 1000)),
    }
  }

  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    // Opportunistic sweep so a stream of unique keys cannot grow the map without bound.
    if (buckets.size > MAX_TRACKED_KEYS) {
      for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k)
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  existing.count += 1
  if (existing.count > LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

/** Test seam. */
export function resetRateLimits(): void {
  buckets.clear()
  globalBucket = { count: 0, resetAt: 0 }
}

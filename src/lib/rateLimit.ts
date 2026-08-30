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

export function rateLimit(
  key: string,
  now: number = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
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
}

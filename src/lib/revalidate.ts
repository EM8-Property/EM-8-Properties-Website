/**
 * Auth for the Sanity publish webhook.
 *
 * Split out from the route handler so it can be tested without Next's request plumbing.
 *
 * Deliberately NOT marked `import 'server-only'`, unlike writeClient.ts and email.ts.
 * That package throws outside a React Server context, so adding it here makes this module
 * unimportable from Vitest and takes all six of its tests with it — including the ones
 * proving the check fails closed on an unset secret. The trade is not worth it: this file
 * holds no secret of its own, it reads `SANITY_REVALIDATE_SECRET` at call time, Next
 * never inlines a non-`NEXT_PUBLIC_` variable into a client bundle, and its only importer
 * is a route handler that is server-side by definition.
 */

export type VerifyResult = { ok: true } | { ok: false; status: 401 | 500; message: string }

/**
 * Constant-time string comparison. A plain `===` on a secret leaks its length and, in
 * principle, its contents through timing. The cost of doing this properly is negligible.
 */
export function isValidSignature(received: string, expected: string): boolean {
  if (!expected || !received) return false
  if (received.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < received.length; i++) {
    diff |= received.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

export async function verifyRevalidateRequest(request: Request): Promise<VerifyResult> {
  const expected = process.env.SANITY_REVALIDATE_SECRET

  // Fail closed. An unconfigured secret must never mean "anyone may purge the cache" —
  // that would let a stranger force a full re-render of every page on demand.
  if (!expected) {
    return {
      ok: false,
      status: 500,
      message: 'SANITY_REVALIDATE_SECRET is not configured on the server.',
    }
  }

  const received = request.headers.get('x-revalidate-secret') ?? ''
  if (!isValidSignature(received, expected)) {
    return { ok: false, status: 401, message: 'Invalid or missing revalidation secret.' }
  }

  return { ok: true }
}

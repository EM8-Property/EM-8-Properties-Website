/**
 * Resolves the address lead notifications are sent from.
 *
 * Deliberately a separate module with no `server-only` import, so it can be unit tested.
 * `email.ts` cannot be — `server-only` throws outside a React Server context — and the
 * hardcoded sender in that untestable file is exactly what broke lead notifications in
 * production: `website@em-8.com` while em-8.com was unverified in Resend, so every send
 * returned 403 and a real investor's enquiry reached nobody.
 *
 * Configurable via `RESEND_FROM` so the whole path can be proven with Resend's sandbox
 * sender before any DNS changes, and switching back afterwards is a variable change
 * rather than a code change and a redeploy.
 */

/** Used once em-8.com is verified in Resend. Requires the DKIM and return-path records. */
export const PRODUCTION_SENDER = 'EM8 Website <website@em-8.com>'

export function resolveSenderAddress(override?: string): string {
  const trimmed = override?.trim()
  if (!trimmed) return PRODUCTION_SENDER

  // A malformed override would come back from Resend as a 422, which `submitLead`
  // swallows into `emailed: false` — the same silent failure this whole change exists to
  // stop. Falling back keeps the failure mode at "unverified domain", which is at least
  // a message that names its own cause.
  if (!trimmed.includes('@')) return PRODUCTION_SENDER

  return trimmed
}

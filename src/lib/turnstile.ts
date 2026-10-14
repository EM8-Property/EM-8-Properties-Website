/**
 * Cloudflare Turnstile, the bot check on every lead form.
 *
 * Added 2026-10-14. The honeypot alone stopped catching it: on 10/10 and 10/14 something
 * filled /contact, /investors and /partners one after another, about 35 seconds apart,
 * in the small hours. A bot that skips a `display: none` field and fills only what a
 * person can see walks straight past a honeypot. Turnstile checks the browser itself.
 *
 * The browser posts its token in this field. It is read by the route and never reaches
 * `parseLead`, whose whitelist would drop it anyway, so it is never stored.
 */
export const TURNSTILE_FIELD = 'cf-turnstile-response'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Cloudflare documents 2048 characters as the longest token it issues. */
const MAX_TOKEN = 2048

/**
 * - `pass`: Cloudflare confirmed the token.
 * - `fail`: no token, or Cloudflare rejected it. The submission is refused.
 * - `unavailable`: Cloudflare could not be asked. The submission is accepted.
 * - `disabled`: no secret is configured, so there is nothing to check against.
 */
export type TurnstileOutcome = 'pass' | 'fail' | 'unavailable' | 'disabled'

/**
 * Asks Cloudflare whether a token is genuine.
 *
 * An outage is `unavailable`, not `fail`, and the route lets the lead through. That is
 * the same capture-first rule `submitLead` follows: some spam on the day Cloudflare is
 * down costs a few deletions in the Studio, while refusing every investor that day loses
 * people nobody will ever hear from. A bot cannot cause the outage, so it cannot use it.
 *
 * Tokens are single-use, so this must run once per submission and only after the cheap
 * checks have passed. Otherwise a typo in an email address burns the visitor's token.
 */
export async function verifyTurnstile(
  token: unknown,
  opts: { secret?: string; siteKey?: string; fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<{ outcome: TurnstileOutcome; errorCodes?: string[] }> {
  const secret = opts.secret ?? process.env.TURNSTILE_SECRET_KEY
  // The site key too, not just the secret. It is inlined at build, so this is whether the
  // forms in this build render a widget at all. A secret set on Railway before a rebuild
  // picks up the site key would otherwise refuse every visitor, since none could send a
  // token.
  const siteKey = opts.siteKey ?? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!secret || !siteKey) return { outcome: 'disabled' }

  if (typeof token !== 'string' || token === '' || token.length > MAX_TOKEN) {
    return { outcome: 'fail', errorCodes: ['missing-or-malformed-token'] }
  }

  const doFetch = opts.fetch ?? fetch
  let res: Response
  try {
    res = await doFetch(SITEVERIFY_URL, {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
    })
  } catch {
    return { outcome: 'unavailable' }
  }
  // A 5xx is Cloudflare's fault. A 4xx is read like a 200: Cloudflare answers a bad
  // secret with a 400 and an error code, so a bad *token* may come back as a 400 too, and
  // treating every non-200 as an outage would wave that bot through.
  if (res.status >= 500) return { outcome: 'unavailable' }

  let json: { success?: unknown; 'error-codes'?: unknown }
  try {
    json = await res.json()
  } catch {
    return { outcome: 'unavailable' }
  }

  const errorCodes = Array.isArray(json['error-codes'])
    ? json['error-codes'].filter((c): c is string => typeof c === 'string')
    : []

  // `internal-error` is Cloudflare saying the fault is theirs, not the visitor's.
  if (errorCodes.includes('internal-error')) return { outcome: 'unavailable', errorCodes }
  // A bad secret is our misconfiguration. Refusing on it would turn away every visitor
  // for a mistake in Railway's variables, so it is treated like an outage and logged.
  if (errorCodes.includes('invalid-input-secret') || errorCodes.includes('missing-input-secret')) {
    return { outcome: 'unavailable', errorCodes }
  }

  return json.success === true ? { outcome: 'pass' } : { outcome: 'fail', errorCodes }
}

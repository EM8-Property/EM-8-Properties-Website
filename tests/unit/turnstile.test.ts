import { describe, it, expect, vi } from 'vitest'
import { verifyTurnstile } from '@/lib/turnstile'

const keys = { secret: 'secret', siteKey: 'site' }

function cloudflare(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }))
}

describe('verifyTurnstile', () => {
  it('is disabled with no secret, and never calls Cloudflare', async () => {
    const fetch = cloudflare({ success: true })
    expect(await verifyTurnstile('t', { secret: '', siteKey: 'site', fetch })).toEqual({
      outcome: 'disabled',
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('is disabled when the build has no site key, so a lone secret cannot refuse everyone', async () => {
    // With no site key no form renders a widget, so no visitor could ever send a token.
    const fetch = cloudflare({ success: true })
    expect(await verifyTurnstile(undefined, { secret: 'secret', siteKey: '', fetch })).toEqual({
      outcome: 'disabled',
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fails a missing, empty, non-string or oversized token without asking Cloudflare', async () => {
    const fetch = cloudflare({ success: true })
    for (const token of [undefined, '', 42, 'x'.repeat(2049)]) {
      expect((await verifyTurnstile(token, { ...keys, fetch })).outcome).toBe('fail')
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it('passes a token Cloudflare confirms, sending the secret and token as a form post', async () => {
    const fetch = cloudflare({ success: true })
    expect(await verifyTurnstile('tok', { ...keys, fetch })).toEqual({ outcome: 'pass' })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    expect(init.method).toBe('POST')
    const sent = init.body as URLSearchParams
    expect(sent.get('secret')).toBe('secret')
    expect(sent.get('response')).toBe('tok')
  })

  it('fails a token Cloudflare rejects, and reports why', async () => {
    const fetch = cloudflare({ success: false, 'error-codes': ['timeout-or-duplicate'] })
    expect(await verifyTurnstile('tok', { ...keys, fetch })).toEqual({
      outcome: 'fail',
      errorCodes: ['timeout-or-duplicate'],
    })
  })

  it('fails a rejection that arrives as a 400, rather than calling it an outage', async () => {
    // Cloudflare answers some bad input with a 400. Treating every non-200 as an outage
    // would let a bot's forged token through on the outage path.
    const fetch = cloudflare({ success: false, 'error-codes': ['invalid-input-response'] }, 400)
    expect((await verifyTurnstile('tok', { ...keys, fetch })).outcome).toBe('fail')
  })

  it('treats a bad secret as unavailable, so a Railway typo does not turn away every visitor', async () => {
    const fetch = cloudflare({ success: false, 'error-codes': ['invalid-input-secret'] }, 400)
    expect(await verifyTurnstile('tok', { ...keys, fetch })).toEqual({
      outcome: 'unavailable',
      errorCodes: ['invalid-input-secret'],
    })
  })

  it('treats a network error, a 5xx, an internal-error or a non-JSON reply as unavailable', async () => {
    const cases: (typeof fetch)[] = [
      vi.fn(async () => {
        throw new Error('timeout')
      }),
      cloudflare({}, 503),
      cloudflare({ success: false, 'error-codes': ['internal-error'] }),
      vi.fn(async () => new Response('<html>', { status: 200 })),
    ]
    for (const fetch of cases) {
      expect((await verifyTurnstile('tok', { ...keys, fetch })).outcome).toBe('unavailable')
    }
  })
})

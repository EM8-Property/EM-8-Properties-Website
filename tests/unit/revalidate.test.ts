import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isValidSignature, verifyRevalidateRequest } from '@/lib/revalidate'

const SECRET = 'test-secret'

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('SANITY_REVALIDATE_SECRET', SECRET)
})

describe('verifyRevalidateRequest', () => {
  it('accepts a request carrying the shared secret', async () => {
    const req = new Request('https://em-8.com/api/revalidate', {
      method: 'POST',
      headers: { 'x-revalidate-secret': SECRET },
    })
    await expect(verifyRevalidateRequest(req)).resolves.toEqual({ ok: true })
  })

  it('rejects a request with the wrong secret', async () => {
    const req = new Request('https://em-8.com/api/revalidate', {
      method: 'POST',
      headers: { 'x-revalidate-secret': 'wrong' },
    })
    await expect(verifyRevalidateRequest(req)).resolves.toMatchObject({ ok: false, status: 401 })
  })

  it('rejects a request with no secret at all', async () => {
    const req = new Request('https://em-8.com/api/revalidate', { method: 'POST' })
    await expect(verifyRevalidateRequest(req)).resolves.toMatchObject({ ok: false, status: 401 })
  })

  it('fails closed when the server has no secret configured', async () => {
    // An unset secret must never mean "allow anyone to purge the cache".
    vi.stubEnv('SANITY_REVALIDATE_SECRET', '')
    const req = new Request('https://em-8.com/api/revalidate', {
      method: 'POST',
      headers: { 'x-revalidate-secret': '' },
    })
    await expect(verifyRevalidateRequest(req)).resolves.toMatchObject({ ok: false, status: 500 })
  })
})

describe('isValidSignature', () => {
  it('compares in constant time and rejects a length mismatch', () => {
    expect(isValidSignature('abc', 'abc')).toBe(true)
    expect(isValidSignature('abc', 'abcd')).toBe(false)
    expect(isValidSignature('abc', 'abd')).toBe(false)
  })

  it('treats an empty expected value as never matching', () => {
    expect(isValidSignature('', '')).toBe(false)
  })
})

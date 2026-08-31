import { describe, it, expect } from 'vitest'
import { resolveSenderAddress, PRODUCTION_SENDER } from '@/lib/emailFrom'

/**
 * The sender address is the single thing that broke lead notifications in production:
 * `website@em-8.com` was hardcoded while em-8.com was unverified in Resend, so every
 * send returned 403 and no one was told about a real investor.
 *
 * Making it configurable lets the path be proven with Resend's sandbox sender before
 * touching DNS, and switching back afterwards is a variable change rather than a deploy.
 */
describe('resolveSenderAddress', () => {
  it('uses the production sender when nothing is configured', () => {
    expect(resolveSenderAddress(undefined)).toBe(PRODUCTION_SENDER)
    expect(resolveSenderAddress('')).toBe(PRODUCTION_SENDER)
    expect(resolveSenderAddress('   ')).toBe(PRODUCTION_SENDER)
  })

  it('uses an override when one is set', () => {
    expect(resolveSenderAddress('onboarding@resend.dev')).toBe('onboarding@resend.dev')
    expect(resolveSenderAddress('EM8 <onboarding@resend.dev>')).toBe('EM8 <onboarding@resend.dev>')
  })

  it('trims surrounding whitespace, which a copy-paste into a variable field adds', () => {
    expect(resolveSenderAddress('  onboarding@resend.dev  ')).toBe('onboarding@resend.dev')
  })

  it('falls back rather than sending from an address with no @ in it', () => {
    // A malformed override must not become a silent 422 from Resend. Falling back to a
    // known-good address keeps the failure mode "unverified domain", which is at least
    // a message someone can act on.
    expect(resolveSenderAddress('not-an-address')).toBe(PRODUCTION_SENDER)
  })
})

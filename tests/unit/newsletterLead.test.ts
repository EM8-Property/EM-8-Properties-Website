import { describe, it, expect, vi } from 'vitest'
import { parseLead, submitLead, LeadValidationError, LeadSpamError, HONEYPOT_FIELD } from '@/lib/leads'

/**
 * The homepage CTA captures an email address and nothing else.
 *
 * Every comparable sponsor site — BAM, Gray Capital, Roers — opens with a low-friction
 * ask and escalates later. This site's only ask was the /investors form, which requests
 * check size and an accreditation declaration on first contact. That is the highest
 * friction possible for a stranger, so `newsletter` exists to accept just an address.
 *
 * It reuses the same endpoint, honeypot, rate limiter and capture-first write. The one
 * difference is that a name is not required, because it is not asked for.
 */
describe('parseLead — newsletter source', () => {
  it('accepts an email on its own', () => {
    const lead = parseLead({ source: 'newsletter', email: 'someone@example.org' })
    expect(lead.source).toBe('newsletter')
    expect(lead.email).toBe('someone@example.org')
    expect(lead.firstName).toBeUndefined()
  })

  it('still requires a first name on the forms that ask for one', () => {
    expect(() => parseLead({ source: 'keep-in-touch', email: 'a@b.co' })).toThrow(
      LeadValidationError,
    )
    expect(() => parseLead({ source: 'site-submission', email: 'a@b.co' })).toThrow(
      LeadValidationError,
    )
  })

  it('still rejects a malformed address', () => {
    expect(() => parseLead({ source: 'newsletter', email: 'not-an-email' })).toThrow(
      LeadValidationError,
    )
  })

  it('still rejects an unknown source', () => {
    expect(() => parseLead({ source: 'nonsense', email: 'a@b.co' })).toThrow(LeadValidationError)
  })

  it('is still honeypot-protected', () => {
    expect(() =>
      parseLead({ source: 'newsletter', email: 'a@b.co', [HONEYPOT_FIELD]: 'bot' }),
    ).toThrow(LeadSpamError)
  })

  it('discards anything beyond the whitelist', () => {
    const lead = parseLead({
      source: 'newsletter',
      email: 'a@b.co',
      _type: 'siteSettings',
      agoraPortalUrl: 'https://phishing.example',
    }) as Record<string, unknown>
    expect(lead._type).toBeUndefined()
    expect(lead.agoraPortalUrl).toBeUndefined()
  })
})

describe('submitLead — newsletter source', () => {
  it('writes the record and notifies without a name in the subject', async () => {
    const create = vi.fn().mockResolvedValue({ _id: 'lead-1' })
    const send = vi.fn().mockResolvedValue(undefined)
    const patch = vi.fn().mockResolvedValue(undefined)

    const result = await submitLead(parseLead({ source: 'newsletter', email: 'a@b.co' }), {
      create,
      sender: { send },
      patch,
    })

    expect(result.emailed).toBe(true)
    expect(create.mock.calls[0]![0]).toMatchObject({
      _type: 'lead',
      source: 'newsletter',
      email: 'a@b.co',
    })
    // Regression guard: the subject was built from `firstName` and `lastName`, so an
    // email-only lead produced "New newsletter lead: undefined".
    expect(send.mock.calls[0]![0].subject).not.toMatch(/undefined/)
    expect(send.mock.calls[0]![0].body).not.toMatch(/undefined/)
    expect(send.mock.calls[0]![0].body).toContain('a@b.co')
  })
})

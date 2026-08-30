import { describe, it, expect, vi } from 'vitest'
import { parseLead, submitLead, LeadValidationError, LeadSpamError } from '@/lib/leads'

const valid = {
  source: 'keep-in-touch',
  firstName: 'Dana',
  lastName: 'Levi',
  email: 'dana@example.com',
}

describe('parseLead', () => {
  it('accepts a valid submission', () => {
    expect(parseLead(valid).email).toBe('dana@example.com')
  })

  it('rejects a malformed email', () => {
    expect(() => parseLead({ ...valid, email: 'nope' })).toThrow(LeadValidationError)
  })

  it('rejects an unknown source', () => {
    expect(() => parseLead({ ...valid, source: 'spam' })).toThrow(LeadValidationError)
  })

  it('rejects a missing first name', () => {
    expect(() => parseLead({ ...valid, firstName: '   ' })).toThrow(LeadValidationError)
  })

  it('rejects a non-object body', () => {
    expect(() => parseLead(null)).toThrow(LeadValidationError)
    expect(() => parseLead('a string')).toThrow(LeadValidationError)
  })

  // --- B1: mass assignment -------------------------------------------------------
  it('drops unknown fields instead of passing them through', () => {
    const parsed = parseLead({ ...valid, sneaky: 'value', exportedToAgora: true })
    expect(parsed).not.toHaveProperty('sneaky')
    expect(parsed).not.toHaveProperty('exportedToAgora')
  })

  it('refuses to let a submission choose its own document type', () => {
    // The attack: POST {_type: "siteSettings"} and the write token creates a
    // siteSettings document. The site reads *[_type=="siteSettings"][0] for
    // agoraPortalUrl, so a forged one repoints the Investor Login button at a
    // phishing host.
    const parsed = parseLead({ ...valid, _type: 'siteSettings', _id: 'siteSettings' })
    expect(parsed).not.toHaveProperty('_type')
    expect(parsed).not.toHaveProperty('_id')
  })

  it('trims whitespace so a padded email is still matched later', () => {
    expect(parseLead({ ...valid, email: '  dana@example.com  ' }).email).toBe('dana@example.com')
  })

  // --- B2: the accreditation checkbox -------------------------------------------
  it('coerces an HTML checkbox value to a real boolean', () => {
    // FormData yields the string "on" for a checked box. The Sanity field is a
    // boolean, and this one is the 506(c) accreditation artifact.
    expect(parseLead({ ...valid, accreditedConfirmed: 'on' }).accreditedConfirmed).toBe(true)
    expect(parseLead({ ...valid, accreditedConfirmed: true }).accreditedConfirmed).toBe(true)
  })

  it('treats an absent checkbox as false, never as missing', () => {
    expect(parseLead(valid).accreditedConfirmed).toBe(false)
  })

  // --- B3: spam ------------------------------------------------------------------
  it('rejects a submission that filled the honeypot', () => {
    expect(() => parseLead({ ...valid, company: 'buy-cheap-pills' })).toThrow(LeadSpamError)
  })

  it('caps free text so the endpoint cannot be used as storage', () => {
    expect(() => parseLead({ ...valid, message: 'x'.repeat(6000) })).toThrow(LeadValidationError)
  })
})

describe('submitLead', () => {
  it('persists before emailing', async () => {
    const order: string[] = []
    const create = vi.fn(async () => {
      order.push('persist')
      return { _id: 'lead.1' }
    })
    const send = vi.fn(async () => {
      order.push('email')
    })
    await submitLead(parseLead(valid), { create, sender: { send } })
    expect(order).toEqual(['persist', 'email'])
  })

  it('still succeeds when email fails — the lead is already saved', async () => {
    const create = vi.fn(async () => ({ _id: 'lead.2' }))
    const send = vi.fn(async () => {
      throw new Error('SMTP down')
    })
    const result = await submitLead(parseLead(valid), { create, sender: { send } })
    expect(result).toEqual({ id: 'lead.2', emailed: false })
  })

  it('propagates a persistence failure — that one is fatal', async () => {
    const create = vi.fn(async () => {
      throw new Error('Sanity down')
    })
    const send = vi.fn(async () => {})
    await expect(submitLead(parseLead(valid), { create, sender: { send } })).rejects.toThrow(
      'Sanity down',
    )
    expect(send).not.toHaveBeenCalled()
  })

  it('always writes a lead document, never another type', async () => {
    const seen: Record<string, unknown>[] = []
    const create = async (doc: Record<string, unknown>) => {
      seen.push(doc)
      return { _id: 'lead.3' }
    }
    await submitLead(parseLead({ ...valid, _type: 'siteSettings' }), {
      create,
      sender: { send: async () => {} },
    })
    expect(seen[0]).toMatchObject({ _type: 'lead' })
  })

  it('stamps its own submittedAt rather than trusting the client', async () => {
    const seen: Record<string, unknown>[] = []
    const create = async (doc: Record<string, unknown>) => {
      seen.push(doc)
      return { _id: 'lead.4' }
    }
    await submitLead(parseLead({ ...valid, submittedAt: '1999-01-01T00:00:00Z' }), {
      create,
      sender: { send: async () => {} },
    })
    expect(String(seen[0]?.submittedAt)).not.toContain('1999')
  })
})

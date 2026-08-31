import { describe, it, expect, vi } from 'vitest'
import {
  parseLead,
  submitLead,
  LeadValidationError,
  LeadSpamError,
  HONEYPOT_FIELD,
} from '@/lib/leads'

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
    expect(() => parseLead({ ...valid, [HONEYPOT_FIELD]: 'buy-cheap-pills' })).toThrow(
      LeadSpamError,
    )
  })

  it('does not use a honeypot name a password manager would autofill', () => {
    // "company" is among the most commonly autofilled field names there is, and
    // autocomplete="off" is widely ignored for organisation fields. A false positive
    // here silently discards a real investor — the exact outcome capture-first exists
    // to prevent.
    expect(['company', 'organization', 'name', 'phone', 'address', 'email']).not.toContain(
      HONEYPOT_FIELD,
    )
  })

  it('caps free text so the endpoint cannot be used as storage', () => {
    expect(() => parseLead({ ...valid, message: 'x'.repeat(6000) })).toThrow(LeadValidationError)
  })

  it('caps the required fields too, not just the optional ones', () => {
    // firstName is required and was previously unbounded, so a multi-megabyte value
    // would have gone straight into a Sanity document and the notification email.
    expect(() => parseLead({ ...valid, firstName: 'x'.repeat(500) })).toThrow(
      LeadValidationError,
    )
    expect(() =>
      parseLead({ ...valid, email: `${'x'.repeat(250)}@example.com` }),
    ).toThrow(LeadValidationError)
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

describe('submitLead records whether anyone was actually notified', () => {
  /*
   * The lead document is the safety net for a notification that never arrives. That only
   * works if the failure is written down: a lead nobody was told about must be
   * distinguishable, later, from one that was.
   *
   * This was found in production. A real submission was captured correctly, the Resend
   * send failed 403 because the sender domain was unverified, and the stored document
   * came back with `emailed: null` — identical to a successful one. The flag existed
   * only in the HTTP response, which nobody reads after the fact.
   */
  it('marks the document emailed:true once the notification is sent', async () => {
    const create = vi.fn(async () => ({ _id: 'lead.3' }))
    const send = vi.fn(async () => {})
    const patch = vi.fn(async () => {})
    await submitLead(parseLead(valid), { create, sender: { send }, patch })
    expect(patch).toHaveBeenCalledWith('lead.3', { emailed: true })
  })

  it('marks the document emailed:false when the notification fails', async () => {
    const create = vi.fn(async () => ({ _id: 'lead.4' }))
    const send = vi.fn(async () => {
      throw new Error('Resend failed: 403')
    })
    const patch = vi.fn(async () => {})
    const result = await submitLead(parseLead(valid), { create, sender: { send }, patch })
    expect(patch).toHaveBeenCalledWith('lead.4', { emailed: false })
    expect(result).toEqual({ id: 'lead.4', emailed: false })
  })

  it('still reports success if the flag write itself fails', async () => {
    // The flag is bookkeeping. Losing it must never turn a captured lead into an error
    // response that makes the sender think their details were not received.
    const create = vi.fn(async () => ({ _id: 'lead.5' }))
    const send = vi.fn(async () => {})
    const patch = vi.fn(async () => {
      throw new Error('patch failed')
    })
    const result = await submitLead(parseLead(valid), { create, sender: { send }, patch })
    expect(result).toEqual({ id: 'lead.5', emailed: true })
  })
})

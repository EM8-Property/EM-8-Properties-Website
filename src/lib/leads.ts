export class LeadValidationError extends Error {}

/** Thrown when a submission looks automated. Handled as a silent success upstream. */
export class LeadSpamError extends Error {}

const SOURCES = ['keep-in-touch', 'site-submission'] as const
export type LeadSource = (typeof SOURCES)[number]

export type LeadInput = {
  source: LeadSource
  firstName: string
  lastName?: string
  email: string
  phone?: string
  investorType?: string
  checkSize?: string
  accreditedConfirmed: boolean
  propertyAddress?: string
  message?: string
}

export type EmailSender = { send(msg: { subject: string; body: string }): Promise<void> }
type CreateFn = (doc: Record<string, unknown>) => Promise<{ _id: string }>
type PatchFn = (id: string, fields: Record<string, unknown>) => Promise<unknown>

/**
 * Name of the hidden field a person never sees and a naive bot fills.
 *
 * Deliberately NOT "company", "name", "phone", or anything else a password manager
 * recognises. `autocomplete="off"` is widely ignored by 1Password, Bitwarden, and
 * LastPass for organisation-type fields, and "company" is among the most commonly
 * autofilled names there is — so a real investor with a password manager could have had
 * their submission silently discarded. Given the site exists to capture investor
 * contacts, a false positive here is worse than the spam it prevents.
 */
export const HONEYPOT_FIELD = 'contact_ref_2'

const MAX_SHORT = 200
const MAX_EMAIL = 254
const MAX_MESSAGE = 5000

/**
 * Ceiling on the raw request body.
 *
 * App Router route handlers have no default body-size limit — `bodySizeLimit` applies to
 * Server Actions only — so without this a single request can stream arbitrary megabytes
 * into JSON.parse before any field-level cap is reached.
 */
export const MAX_BODY_BYTES = 20_000

function str(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/**
 * Parses and validates a public submission into exactly the shape we will store.
 *
 * The whitelist is the security boundary, and it is why this function returns a freshly
 * constructed object rather than the request body. The original design validated three
 * fields and returned the raw input, which `submitLead` then spread into a document
 * *after* `_type` — so a request carrying `{"_type":"siteSettings"}` would write a
 * siteSettings document using the server's write token. The site reads
 * `*[_type=="siteSettings"][0]` to populate `agoraPortalUrl`, the Investor Login
 * destination, so a forged one repoints investors at an attacker's host.
 *
 * Anything not named here is discarded. Adding a field to the form means adding it here.
 */
export function parseLead(input: unknown): LeadInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new LeadValidationError('Body must be an object')
  }
  const v = input as Record<string, unknown>

  // Honeypot: a hidden field, off-screen and aria-hidden, that no person can fill in.
  if (str(v[HONEYPOT_FIELD])) {
    throw new LeadSpamError('Honeypot field was filled')
  }

  const source = str(v.source)
  if (!source || !SOURCES.includes(source as LeadSource)) {
    throw new LeadValidationError('Unknown source')
  }

  const firstName = str(v.firstName)
  if (!firstName) throw new LeadValidationError('First name required')

  const email = str(v.email)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new LeadValidationError('Valid email required')
  }
  // 254 is the maximum length of an email address per RFC 5321.
  if (email.length > MAX_EMAIL) throw new LeadValidationError('Email is too long')

  const message = str(v.message)
  if (message && message.length > MAX_MESSAGE) {
    throw new LeadValidationError('Message is too long')
  }
  // firstName is included here, not just the optional fields. It is required and was
  // previously unbounded, so a multi-megabyte value would have gone straight into a
  // Sanity document and into the notification email body.
  for (const [label, value] of [
    ['First name', firstName],
    ['Last name', str(v.lastName)],
    ['Phone', str(v.phone)],
    ['Investor type', str(v.investorType)],
    ['Check size', str(v.checkSize)],
    ['Property address', str(v.propertyAddress)],
  ] as const) {
    if (value && value.length > MAX_SHORT) {
      throw new LeadValidationError(`${label} is too long`)
    }
  }

  // An HTML checkbox posts the string "on" when ticked and is simply absent when not.
  // The Sanity field is a boolean, and for keep-in-touch this is the Rule 506(c)
  // accreditation artifact — it must be stored as a real boolean, never as "on".
  const accreditedConfirmed = v.accreditedConfirmed === true || v.accreditedConfirmed === 'on'

  return {
    source: source as LeadSource,
    firstName,
    ...(str(v.lastName) ? { lastName: str(v.lastName) } : {}),
    email,
    ...(str(v.phone) ? { phone: str(v.phone) } : {}),
    ...(str(v.investorType) ? { investorType: str(v.investorType) } : {}),
    ...(str(v.checkSize) ? { checkSize: str(v.checkSize) } : {}),
    ...(str(v.propertyAddress) ? { propertyAddress: str(v.propertyAddress) } : {}),
    ...(message ? { message } : {}),
    accreditedConfirmed,
  }
}

/**
 * Capture-first: write the record, then try to email.
 *
 * The Sanity write is the source of truth and its failure is fatal. Email is best-effort,
 * because a mail outage must never lose a lead — the document is the only thing standing
 * between a spam-filtered notification and a permanently lost investor.
 */
export async function submitLead(
  input: LeadInput,
  deps: { create: CreateFn; sender: EmailSender; patch?: PatchFn },
): Promise<{ id: string; emailed: boolean }> {
  const doc = await deps.create({
    ...input,
    // Written last so no field of `input` can ever override them. `input` is already
    // whitelisted by parseLead; this is defence in depth.
    _type: 'lead',
    submittedAt: new Date().toISOString(),
    exportedToAgora: false,
  })

  let emailed = true
  try {
    await deps.sender.send({
      subject: `New ${input.source} lead: ${input.firstName} ${input.lastName ?? ''}`.trim(),
      body: [
        `Name: ${input.firstName} ${input.lastName ?? ''}`.trim(),
        `Email: ${input.email}`,
        input.phone ? `Phone: ${input.phone}` : '',
        input.investorType ? `Investor type: ${input.investorType}` : '',
        input.checkSize ? `Check size: ${input.checkSize}` : '',
        input.source === 'keep-in-touch'
          ? `Accreditation confirmed: ${input.accreditedConfirmed ? 'yes' : 'no'}`
          : '',
        input.propertyAddress ? `Property: ${input.propertyAddress}` : '',
        input.message ? `\n${input.message}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    })
  } catch {
    emailed = false
  }

  // Write the outcome back to the document.
  //
  // Without this the flag lives only in the HTTP response, which nobody reads after the
  // fact — so a lead nobody was notified about is indistinguishable from one that went
  // through. That is precisely the case this document exists to catch, and it happened:
  // an unverified Resend sender domain returned 403, the lead was captured correctly,
  // and the record gave no indication that the team was never told.
  //
  // Failing to write the flag is not allowed to fail the submission. The lead is already
  // saved and the sender has already been helped; losing the bookkeeping is a smaller
  // problem than telling a real investor their details did not go through.
  try {
    await deps.patch?.(doc._id, { emailed })
  } catch {
    // Intentionally swallowed. See above.
  }

  return { id: doc._id, emailed }
}

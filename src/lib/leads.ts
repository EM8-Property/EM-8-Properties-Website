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

/** Name of the hidden field a human never sees and a naive bot always fills. */
export const HONEYPOT_FIELD = 'company'

const MAX_SHORT = 200
const MAX_MESSAGE = 5000

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

  const message = str(v.message)
  if (message && message.length > MAX_MESSAGE) {
    throw new LeadValidationError('Message is too long')
  }
  for (const [label, value] of [
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
  deps: { create: CreateFn; sender: EmailSender },
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

  return { id: doc._id, emailed }
}

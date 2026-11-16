/**
 * Job applications from /careers/[slug]: parse, validate, save, email.
 *
 * Kept apart from `leads.ts` on purpose. A lead is a small JSON body capped at 20 KB; an
 * application carries a resume and an optional cover letter, up to 5 MB each, as multipart
 * form data, goes to a different document type, and its email has attachments. Folding it
 * into the lead path would mean raising the lead endpoint's body cap five hundredfold for
 * every form on the site.
 *
 * Plain functions with their effects passed in, like `submitLead`, so the whole flow is
 * unit-testable without a network.
 */

import { HONEYPOT_FIELD, LeadValidationError, LeadSpamError } from './leads'

export { LeadValidationError as ApplicationValidationError, LeadSpamError as ApplicationSpamError }

/** Every application id starts with this. The dot hides it from tokenless reads. */
export const APPLICATION_ID_PREFIX = 'application.'

/**
 * The ceiling on each file, the resume and the optional cover letter alike. Resend's
 * limit is 40 MB per email, so two at 5 MB fit with room to spare.
 */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024

/** The whole request: both files plus a few KB of fields and multipart framing. */
export const MAX_APPLICATION_BYTES = 2 * MAX_RESUME_BYTES + 64 * 1024

/**
 * Accepted resume formats, identified by their first bytes rather than the browser's
 * declared type, which is whatever the file's extension says. A file is sent on to the
 * team's inbox as an attachment, so it must be what it claims to be.
 */
const RESUME_FORMATS = [
  { ext: 'pdf', type: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  {
    ext: 'docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    magic: [0x50, 0x4b, 0x03, 0x04], // a zip
  },
  { ext: 'doc', type: 'application/msword', magic: [0xd0, 0xcf, 0x11, 0xe0] }, // OLE2
] as const

/** For the file input's `accept`, so the picker offers the right files to begin with. */
export const RESUME_ACCEPT = '.pdf,.doc,.docx'

const MAX_SHORT = 200
const MAX_EMAIL = 254
const MAX_MESSAGE = 5000

export type Resume = { filename: string; contentType: string; content: Uint8Array }

export type ApplicationInput = {
  jobSlug: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  linkedin?: string
  message?: string
  resume: Resume
  coverLetter?: Resume
}

/** The subset of `File` this module reads, so tests can pass a plain object. */
export type FileLike = { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> }

function str(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function isFileLike(v: unknown): v is FileLike {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as FileLike).arrayBuffer === 'function' &&
    typeof (v as FileLike).size === 'number'
  )
}

/** Leaves a file name safe to put in an email header: no path, no control characters. */
export function safeFilename(name: string, ext: string, fallback = 'resume'): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const clean = base.replace(/[^\w.\- ()]/g, '_').replace(/^\.+/, '').slice(0, 100)
  const stem = clean.replace(/\.[^.]*$/, '') || fallback
  return `${stem}.${ext}`
}

/** Checks one uploaded document. `what` names it in every message the candidate sees. */
async function parseDocument(file: FileLike, what: 'resume' | 'cover letter'): Promise<Resume> {
  if (file.size > MAX_RESUME_BYTES) {
    throw new LeadValidationError(`Your ${what} is larger than 5 MB. Please attach a smaller file.`)
  }
  const content = new Uint8Array(await file.arrayBuffer())
  const format = RESUME_FORMATS.find((f) => f.magic.every((b, i) => content[i] === b))
  if (!format) {
    throw new LeadValidationError(`Please attach your ${what} as a PDF or Word document.`)
  }
  return {
    filename: safeFilename(file.name, format.ext, what === 'resume' ? 'resume' : 'cover-letter'),
    contentType: format.type,
    content,
  }
}

export async function parseResume(file: unknown): Promise<Resume> {
  if (!isFileLike(file) || file.size === 0) {
    throw new LeadValidationError('Please attach your resume.')
  }
  return parseDocument(file, 'resume')
}

/** Optional: an empty file input posts a zero-byte file, which means "none". */
export async function parseCoverLetter(file: unknown): Promise<Resume | undefined> {
  if (!isFileLike(file) || file.size === 0) return undefined
  return parseDocument(file, 'cover letter')
}

/**
 * Whitelists the submitted fields into exactly the shape stored, as `parseLead` does and
 * for the same reason: nothing a visitor sends can choose a document type or id.
 */
export async function parseApplication(form: {
  get(name: string): unknown
}): Promise<ApplicationInput> {
  if (str(form.get(HONEYPOT_FIELD))) throw new LeadSpamError('Honeypot field was filled')

  const jobSlug = str(form.get('jobSlug'))
  if (!jobSlug || jobSlug.length > MAX_SHORT) throw new LeadValidationError('Unknown job')

  const firstName = str(form.get('firstName'))
  const lastName = str(form.get('lastName'))
  if (!firstName) throw new LeadValidationError('First name required')
  if (!lastName) throw new LeadValidationError('Last name required')

  const email = str(form.get('email'))
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new LeadValidationError('Valid email required')
  }
  if (email.length > MAX_EMAIL) throw new LeadValidationError('Email is too long')

  const phone = str(form.get('phone'))
  let linkedin = str(form.get('linkedin'))
  for (const [label, value] of [
    ['First name', firstName],
    ['Last name', lastName],
    ['Phone', phone],
    ['LinkedIn', linkedin],
  ] as const) {
    if (value && value.length > MAX_SHORT) throw new LeadValidationError(`${label} is too long`)
  }
  if (linkedin) {
    // People paste "linkedin.com/in/name" without the scheme. Anything that is still not
    // an http(s) URL is refused, so a `javascript:` link never reaches the Studio.
    if (!/^https?:\/\//i.test(linkedin)) linkedin = `https://${linkedin}`
    try {
      const u = new URL(linkedin)
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error()
    } catch {
      throw new LeadValidationError('Please enter your LinkedIn profile as a web address.')
    }
  }

  const message = str(form.get('message'))
  if (message && message.length > MAX_MESSAGE) throw new LeadValidationError('Note is too long')

  const resume = await parseResume(form.get('resume'))
  const coverLetter = await parseCoverLetter(form.get('coverLetter'))

  return {
    jobSlug,
    firstName,
    lastName,
    email,
    ...(phone ? { phone } : {}),
    ...(linkedin ? { linkedin } : {}),
    ...(message ? { message } : {}),
    resume,
    ...(coverLetter ? { coverLetter } : {}),
  }
}

export type ApplicationEmail = {
  subject: string
  body: string
  replyTo: string
  attachments: { filename: string; content: string }[]
}

/**
 * Capture first, then email: the same order as `submitLead`.
 *
 * The record (without the file) is saved before anything is sent, so an email outage
 * still leaves the team the candidate's name and address. The resume travels only in the
 * email, base64-encoded as Resend takes it.
 */
export async function submitApplication(
  input: ApplicationInput,
  job: { _id: string; title: string },
  deps: {
    create: (doc: Record<string, unknown>) => Promise<{ _id: string }>
    send: (msg: ApplicationEmail) => Promise<void>
    patch?: (id: string, fields: Record<string, unknown>) => Promise<unknown>
  },
): Promise<{ id: string; emailed: boolean }> {
  const { resume, coverLetter: rawCover, jobSlug: _slug, ...fields } = input
  void _slug
  // Two files both called "Document.pdf" would arrive as two identical attachment names,
  // and the team could not tell which was which.
  const coverLetter =
    rawCover && rawCover.filename === resume.filename
      ? { ...rawCover, filename: `Cover letter - ${rawCover.filename}` }
      : rawCover
  const doc = await deps.create({
    ...fields,
    job: { _type: 'reference', _ref: job._id, _weak: true },
    jobTitle: job.title,
    resumeFilename: resume.filename,
    ...(coverLetter ? { coverLetterFilename: coverLetter.filename } : {}),
    // Last, so nothing above can override them.
    _id: `${APPLICATION_ID_PREFIX}${crypto.randomUUID()}`,
    _type: 'jobApplication',
    submittedAt: new Date().toISOString(),
  })

  const name = `${input.firstName} ${input.lastName}`
  let emailed = true
  try {
    await deps.send({
      subject: `Application for ${job.title}: ${name}`,
      replyTo: input.email,
      body: [
        `Role: ${job.title}`,
        `Name: ${name}`,
        `Email: ${input.email}`,
        input.phone ? `Phone: ${input.phone}` : '',
        input.linkedin ? `LinkedIn: ${input.linkedin}` : '',
        `Resume: attached (${resume.filename})`,
        coverLetter ? `Cover letter: attached (${coverLetter.filename})` : 'Cover letter: none',
        input.message ? `\n${input.message}` : '',
        '\nReply to this email to answer the candidate directly.',
      ]
        .filter(Boolean)
        .join('\n'),
      attachments: [resume, ...(coverLetter ? [coverLetter] : [])].map((f) => ({
        filename: f.filename,
        content: Buffer.from(f.content).toString('base64'),
      })),
    })
  } catch {
    emailed = false
  }

  try {
    await deps.patch?.(doc._id, { emailed })
  } catch {
    // The application is saved and the candidate helped; losing the flag is the smaller harm.
  }

  return { id: doc._id, emailed }
}

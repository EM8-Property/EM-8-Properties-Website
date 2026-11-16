import { describe, it, expect, vi } from 'vitest'
import { jobPostingJsonLd, jobDescriptionHtml } from '@/lib/structuredData'
import { formatSalary, isJobOpen, formatLocation } from '@/lib/jobTaxonomy'
import {
  parseApplication,
  parseResume,
  safeFilename,
  submitApplication,
  ApplicationValidationError,
  ApplicationSpamError,
  APPLICATION_ID_PREFIX,
  MAX_RESUME_BYTES,
} from '@/lib/applications'
import { HONEYPOT_FIELD } from '@/lib/leads'
import { JOBS } from '../../scripts/content/em8-content.mjs'

const SITE = 'https://em-8.com'

const JOB = {
  title: 'Controller',
  slug: 'controller',
  datePosted: '2026-11-16',
  employmentType: 'FULL_TIME',
  workplace: 'on-site',
  location: { city: 'Oak Forest', state: 'IL', postalCode: '60452' },
  salary: { min: 80000, max: 105000, unit: 'YEAR' },
  summary: 'Own the books.',
  sections: [
    { heading: 'About EM8', body: 'We build <places>.' },
    { heading: 'Responsibilities', items: ['Reconcile & close', '', 'Review packages'] },
  ],
}

describe('JobPosting structured data', () => {
  const ld = jobPostingJsonLd({ siteUrl: SITE, job: JOB })

  it("carries every property Google's job search requires", () => {
    // https://developers.google.com/search/docs/appearance/structured-data/job-posting
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('JobPosting')
    expect(ld.title).toBe('Controller')
    expect(ld.datePosted).toBe('2026-11-16')
    expect(typeof ld.description).toBe('string')
    expect(ld.hiringOrganization).toMatchObject({ '@type': 'Organization', name: 'EM8 Properties', sameAs: SITE })
    expect(ld.jobLocation).toEqual({
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Oak Forest',
        addressRegion: 'IL',
        postalCode: '60452',
        addressCountry: 'US',
      },
    })
  })

  it('states the salary band as a MonetaryAmount range', () => {
    expect(ld.baseSalary).toEqual({
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: { '@type': 'QuantitativeValue', minValue: 80000, maxValue: 105000, unitText: 'YEAR' },
    })
    expect(ld.employmentType).toBe('FULL_TIME')
    expect(ld.directApply).toBe(true)
    expect(ld.url).toBe(`${SITE}/careers/controller`)
  })

  it('builds the description as escaped HTML from the same sections the page shows', () => {
    const html = jobDescriptionHtml(JOB)
    expect(html).toBe(
      '<p>Own the books.</p>' +
        '<p><strong>About EM8</strong></p><p>We build &lt;places&gt;.</p>' +
        '<p><strong>Responsibilities</strong></p><ul><li>Reconcile &amp; close</li><li>Review packages</li></ul>',
    )
  })

  it('omits validThrough with no closing date, and ends it at close of day when set', () => {
    expect(ld).not.toHaveProperty('validThrough')
    const dated = jobPostingJsonLd({ siteUrl: SITE, job: { ...JOB, validThrough: '2027-01-31' } })
    expect(dated.validThrough).toBe('2027-01-31T23:59:59-06:00')
  })

  it('marks a remote role TELECOMMUTE with an applicant location instead of an address', () => {
    const remote = jobPostingJsonLd({ siteUrl: SITE, job: { ...JOB, workplace: 'remote' } })
    expect(remote.jobLocationType).toBe('TELECOMMUTE')
    expect(remote.applicantLocationRequirements).toEqual({ '@type': 'Country', name: 'USA' })
    expect(remote).not.toHaveProperty('jobLocation')
  })

  it('validates the seeded Controller posting', () => {
    const seeded = JOBS[0]!
    const out = jobPostingJsonLd({ siteUrl: SITE, job: { ...seeded, slug: seeded.slug.current } })
    expect(out.title).toBe('Controller')
    expect(out.description).toContain('<li>Experience with QuickBooks and AppFolio</li>')
    expect(out.baseSalary).toBeDefined()
  })
})

describe('job helpers', () => {
  it('formats the salary line as the posting reads', () => {
    expect(formatSalary({ min: 80000, max: 105000, unit: 'YEAR', note: 'base, depending on experience' })).toBe(
      '$80,000 to $105,000 base, depending on experience',
    )
    expect(formatSalary({ min: 25, unit: 'HOUR' })).toBe('$25 an hour')
    expect(formatSalary({ note: 'competitive' })).toBeNull()
    expect(formatSalary(null)).toBeNull()
  })

  it('treats a posting as open until the end of its closing day in Chicago', () => {
    const job = { open: true, validThrough: '2027-01-31' }
    // 11pm in Chicago on the 31st is 05:00 UTC on Feb 1.
    expect(isJobOpen(job, new Date('2027-02-01T05:00:00Z'))).toBe(true)
    expect(isJobOpen(job, new Date('2027-02-01T07:00:00Z'))).toBe(false)
    expect(isJobOpen({ open: true }, new Date())).toBe(true)
    expect(isJobOpen({ open: false }, new Date())).toBe(false)
    expect(isJobOpen({ open: null }, new Date())).toBe(false)
  })

  it('formats a location', () => {
    expect(formatLocation({ city: 'Oak Forest', state: 'IL' })).toBe('Oak Forest, IL')
  })
})

/** A File-alike carrying the given bytes. */
function file(name: string, bytes: number[], size = bytes.length) {
  const buf = new Uint8Array(bytes)
  return { name, size, arrayBuffer: async () => buf.buffer }
}
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]
const DOCX = [0x50, 0x4b, 0x03, 0x04, 0x14]

function form(fields: Record<string, unknown>) {
  return { get: (k: string) => fields[k] ?? null }
}
const VALID = {
  jobSlug: 'controller',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  resume: file('Ada CV.pdf', PDF),
}

describe('resume checks', () => {
  it('accepts a PDF and a Word file by their first bytes', async () => {
    expect((await parseResume(file('cv.pdf', PDF))).contentType).toBe('application/pdf')
    expect((await parseResume(file('cv.docx', DOCX))).filename).toBe('cv.docx')
  })

  it('refuses a file that only claims to be a PDF', async () => {
    await expect(parseResume(file('cv.pdf', [0x4d, 0x5a, 0x90, 0x00]))).rejects.toThrow(/PDF or Word/)
  })

  it('refuses a missing, empty or oversized file', async () => {
    await expect(parseResume(null)).rejects.toThrow(/attach your resume/)
    await expect(parseResume(file('cv.pdf', []))).rejects.toThrow(/attach your resume/)
    await expect(parseResume(file('cv.pdf', PDF, MAX_RESUME_BYTES + 1))).rejects.toThrow(/5 MB/)
  })

  it('names the attachment by its real format, with no path', () => {
    expect(safeFilename('C:\\Users\\me\\My CV.exe', 'pdf')).toBe('My CV.pdf')
    expect(safeFilename('../../etc/passwd', 'docx')).toBe('passwd.docx')
    expect(safeFilename('', 'pdf')).toBe('resume.pdf')
  })
})

describe('parseApplication', () => {
  it('whitelists the fields and adds a scheme to a bare LinkedIn address', async () => {
    const out = await parseApplication(
      form({ ...VALID, linkedin: 'linkedin.com/in/ada', _type: 'siteSettings', _id: 'siteSettings' }),
    )
    expect(out).toMatchObject({ firstName: 'Ada', lastName: 'Lovelace', linkedin: 'https://linkedin.com/in/ada' })
    expect(out).not.toHaveProperty('_type')
    expect(out).not.toHaveProperty('_id')
  })

  it('refuses a missing name, a bad email and a javascript: link', async () => {
    await expect(parseApplication(form({ ...VALID, firstName: '' }))).rejects.toBeInstanceOf(ApplicationValidationError)
    await expect(parseApplication(form({ ...VALID, email: 'nope' }))).rejects.toThrow(/email/)
    await expect(parseApplication(form({ ...VALID, linkedin: 'javascript:alert(1)' }))).rejects.toThrow(/LinkedIn/)
  })

  it('treats a filled honeypot as spam', async () => {
    await expect(parseApplication(form({ ...VALID, [HONEYPOT_FIELD]: 'x' }))).rejects.toBeInstanceOf(ApplicationSpamError)
  })
})

describe('submitApplication', () => {
  it('saves a private record without the file, then emails the resume as an attachment', async () => {
    const input = await parseApplication(form({ ...VALID, phone: '555' }))
    const create = vi.fn(async (doc: Record<string, unknown>) => ({ _id: doc._id as string }))
    const send = vi.fn(async () => {})
    const patch = vi.fn(async () => ({}))

    const res = await submitApplication(input, { _id: 'job-controller', title: 'Controller' }, { create, send, patch })

    const doc = create.mock.calls[0]![0]
    expect(doc._type).toBe('jobApplication')
    expect(String(doc._id).startsWith(APPLICATION_ID_PREFIX)).toBe(true)
    expect(doc.job).toEqual({ _type: 'reference', _ref: 'job-controller', _weak: true })
    expect(doc.resumeFilename).toBe('Ada CV.pdf')
    expect(doc).not.toHaveProperty('resume')

    const msg = (send.mock.calls[0] as unknown as [{ subject: string; replyTo: string; attachments: { filename: string; content: string }[] }])[0]
    expect(msg.subject).toBe('Application for Controller: Ada Lovelace')
    expect(msg.replyTo).toBe('ada@example.com')
    expect(msg.attachments[0]!.filename).toBe('Ada CV.pdf')
    expect(Buffer.from(msg.attachments[0]!.content, 'base64')).toEqual(Buffer.from(PDF))

    expect(patch).toHaveBeenCalledWith(doc._id, { emailed: true })
    expect(res.emailed).toBe(true)
  })

  it('keeps the application and records the failure when the email fails', async () => {
    const input = await parseApplication(form(VALID))
    const patch = vi.fn(async () => ({}))
    const res = await submitApplication(input, { _id: 'j', title: 'Controller' }, {
      create: async (d) => ({ _id: d._id as string }),
      send: async () => {
        throw new Error('Resend down')
      },
      patch,
    })
    expect(res.emailed).toBe(false)
    expect(patch).toHaveBeenCalledWith(expect.any(String), { emailed: false })
  })
})

describe('cover letter', () => {
  it('is optional: an empty file input means none', async () => {
    const out = await parseApplication(form({ ...VALID, coverLetter: file('', []) }))
    expect(out).not.toHaveProperty('coverLetter')
  })

  it('gets the same format and size checks as the resume, named in the message', async () => {
    await expect(
      parseApplication(form({ ...VALID, coverLetter: file('letter.pdf', [0x4d, 0x5a, 0x90, 0x00]) })),
    ).rejects.toThrow('Please attach your cover letter as a PDF or Word document.')
    await expect(
      parseApplication(form({ ...VALID, coverLetter: file('letter.pdf', PDF, MAX_RESUME_BYTES + 1) })),
    ).rejects.toThrow('Your cover letter is larger than 5 MB.')
  })

  it('is emailed as a second attachment and recorded by name, never stored', async () => {
    const input = await parseApplication(form({ ...VALID, coverLetter: file('Letter.docx', DOCX) }))
    const create = vi.fn(async (doc: Record<string, unknown>) => ({ _id: doc._id as string }))
    const send = vi.fn(async () => {})
    await submitApplication(input, { _id: 'j', title: 'Controller' }, { create, send })

    const doc = create.mock.calls[0]![0]
    expect(doc.coverLetterFilename).toBe('Letter.docx')
    expect(doc).not.toHaveProperty('coverLetter')
    const msg = (send.mock.calls[0] as unknown as [{ body: string; attachments: { filename: string }[] }])[0]
    expect(msg.attachments.map((a) => a.filename)).toEqual(['Ada CV.pdf', 'Letter.docx'])
    expect(msg.body).toContain('Cover letter: attached (Letter.docx)')
  })

  it('is renamed when it has the same file name as the resume', async () => {
    const input = await parseApplication(
      form({ ...VALID, resume: file('Document.pdf', PDF), coverLetter: file('Document.pdf', PDF) }),
    )
    const send = vi.fn(async () => {})
    await submitApplication(input, { _id: 'j', title: 'Controller' }, {
      create: async (d) => ({ _id: d._id as string }),
      send,
    })
    const msg = (send.mock.calls[0] as unknown as [{ attachments: { filename: string }[] }])[0]
    expect(msg.attachments.map((a) => a.filename)).toEqual(['Document.pdf', 'Cover letter - Document.pdf'])
  })
})

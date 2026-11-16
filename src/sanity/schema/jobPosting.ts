import { defineType, defineField } from 'sanity'
import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  WORKPLACES,
  WORKPLACE_LABELS,
  SALARY_UNITS,
} from '../../lib/jobTaxonomy'

/**
 * One open role, at /careers/[slug].
 *
 * Every field Google's JobPosting rich result reads is a real field here, so the job page
 * and its structured data are built from the same values and cannot disagree:
 * https://developers.google.com/search/docs/appearance/structured-data/job-posting
 *
 * The body is a list of titled sections rather than Portable Text. Google wants the full
 * description in the markup as HTML, and a fixed shape (heading, optional paragraph,
 * optional bullets) converts to that exactly, where arbitrary rich text would need a second
 * renderer that could drift from the page.
 *
 * To take a role down, untick "Accepting applications" or let the closing date pass. The
 * page then 404s and leaves the sitemap, which is what Google asks for. Deleting the
 * document does the same.
 */
export const jobPosting = defineType({
  name: 'jobPosting',
  title: 'Job posting',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Job title', type: 'string', validation: (r) => r.required().max(80) }),
    defineField({
      name: 'slug',
      type: 'slug',
      description: 'The web address: em-8.com/careers/<this>. Changing it after posting breaks shared links.',
      options: { source: 'title' },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'open',
      title: 'Accepting applications',
      type: 'boolean',
      description: 'Untick when the role is filled. The page comes down and Google is told it has closed.',
      initialValue: true,
    }),
    defineField({
      name: 'datePosted',
      title: 'Date posted',
      type: 'date',
      description: 'Shown to Google as the posting date. Set it when the role goes live, and do not move it later.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'validThrough',
      title: 'Closing date',
      type: 'date',
      description: 'Optional. The page comes down after this date. Leave empty for a role that stays open until filled.',
    }),
    defineField({
      name: 'employmentType',
      title: 'Employment type',
      type: 'string',
      options: {
        list: EMPLOYMENT_TYPES.map((v) => ({ title: EMPLOYMENT_TYPE_LABELS[v], value: v })),
        layout: 'radio',
      },
      initialValue: 'FULL_TIME',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'workplace',
      type: 'string',
      options: {
        list: WORKPLACES.map((v) => ({ title: WORKPLACE_LABELS[v], value: v })),
        layout: 'radio',
      },
      initialValue: 'on-site',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'location',
      type: 'object',
      description: 'Where the job is. Google needs at least the city and state; the street address and ZIP help it place the job on a map.',
      fields: [
        defineField({ name: 'streetAddress', title: 'Street address', type: 'string' }),
        defineField({ name: 'city', type: 'string', validation: (r) => r.required() }),
        defineField({
          name: 'state',
          type: 'string',
          description: 'Two-letter code, e.g. IL.',
          validation: (r) => r.required().length(2).uppercase(),
        }),
        defineField({ name: 'postalCode', title: 'ZIP code', type: 'string' }),
      ],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'salary',
      type: 'object',
      description: 'Shown on the page and to Google. Illinois requires a pay range on job postings from employers with 15 or more staff.',
      fields: [
        defineField({ name: 'min', title: 'From', type: 'number', validation: (r) => r.required().positive() }),
        defineField({
          name: 'max',
          title: 'To',
          type: 'number',
          validation: (r) =>
            r.positive().custom((max, ctx) => {
              const min = (ctx.parent as { min?: number } | undefined)?.min
              return max == null || min == null || max >= min ? true : '"To" must not be below "From".'
            }),
        }),
        defineField({
          name: 'unit',
          title: 'Per',
          type: 'string',
          options: { list: SALARY_UNITS.map((v) => ({ title: v.toLowerCase(), value: v })) },
          initialValue: 'YEAR',
          validation: (r) => r.required(),
        }),
        defineField({
          name: 'note',
          type: 'string',
          description: 'Words after the figure, e.g. "base, depending on experience".',
          validation: (r) => r.max(80),
        }),
      ],
    }),
    defineField({
      name: 'summary',
      type: 'text',
      rows: 3,
      description: 'One or two sentences. Shown on the careers list and as the Google search snippet.',
      validation: (r) => r.required().max(200),
    }),
    defineField({
      name: 'sections',
      title: 'Job description',
      type: 'array',
      description: 'In page order, e.g. About EM8, Responsibilities, Qualifications, What we offer.',
      of: [
        {
          type: 'object',
          name: 'jobSection',
          fields: [
            defineField({ name: 'heading', type: 'string', validation: (r) => r.required().max(60) }),
            defineField({ name: 'body', title: 'Paragraph', type: 'text', rows: 4 }),
            defineField({ name: 'items', title: 'Bullet points', type: 'array', of: [{ type: 'string' }] }),
          ],
          preview: { select: { title: 'heading' } },
        },
      ],
      validation: (r) => r.required().min(1),
    }),
  ],
  orderings: [{ title: 'Newest', name: 'datePostedDesc', by: [{ field: 'datePosted', direction: 'desc' }] }],
  preview: {
    select: { title: 'title', open: 'open', city: 'location.city' },
    prepare: ({ title, open, city }) => ({
      title,
      subtitle: [open ? 'Open' : 'Closed', city].filter(Boolean).join(' · '),
    }),
  },
})

/**
 * A candidate's application, written by /api/apply and never edited in the Studio.
 *
 * Its id carries a dot (`application.<uuid>`), which hides it from tokenless reads of the
 * public dataset; see `LEAD_ID_PREFIX`. The resume and cover letter are NOT stored here: a
 * Sanity file asset in a public dataset can be listed by anyone holding the project id, so
 * the files are only ever sent as email attachments. This record is the safety net for the
 * person, not the files: `emailed: false` means the team was never told, and the candidate
 * can be asked to resend.
 */
export const jobApplication = defineType({
  name: 'jobApplication',
  title: 'Job application',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({ name: 'job', type: 'reference', to: [{ type: 'jobPosting' }] }),
    defineField({ name: 'jobTitle', type: 'string' }),
    defineField({ name: 'firstName', type: 'string' }),
    defineField({ name: 'lastName', type: 'string' }),
    defineField({ name: 'email', type: 'string' }),
    defineField({ name: 'phone', type: 'string' }),
    defineField({ name: 'linkedin', title: 'LinkedIn', type: 'url' }),
    defineField({ name: 'message', title: 'Note', type: 'text' }),
    defineField({ name: 'resumeFilename', title: 'Resume file name', type: 'string' }),
    defineField({ name: 'coverLetterFilename', title: 'Cover letter file name', type: 'string' }),
    defineField({ name: 'submittedAt', type: 'datetime' }),
    defineField({
      name: 'emailed',
      title: 'Team was emailed the files',
      type: 'boolean',
      description: 'False means the application was saved but the email with the resume failed. Ask the candidate to resend it.',
    }),
  ],
  orderings: [{ title: 'Newest', name: 'submittedAtDesc', by: [{ field: 'submittedAt', direction: 'desc' }] }],
  preview: {
    select: { first: 'firstName', last: 'lastName', job: 'jobTitle' },
    prepare: ({ first, last, job }) => ({ title: [first, last].filter(Boolean).join(' '), subtitle: job }),
  },
})

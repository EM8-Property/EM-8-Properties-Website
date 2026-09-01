import { defineType, defineField } from 'sanity'

/**
 * One pinned singleton per page, holding the copy that used to live in TSX.
 *
 * This closes plan revision D4, which recorded the hardcoded marketing copy as a conscious
 * Phase 1 tradeoff: the Partners cards, the Investors steps and the homepage hero were all
 * literals in components, so the team could not edit its own investor-facing words without
 * a developer.
 *
 * Explicitly named fields rather than a generic list of keyed sections. Typegen checks
 * every usage, so renaming a field fails the build with a clear message; a keyed lookup
 * would miss silently and render a blank section to a visitor. It is more schema to write
 * once and far less to debug later.
 *
 * Each page's copy is required. That is the same rule as siteSettings and the same reason:
 * missing required content fails the build loudly rather than rendering a shell, which is
 * the failure mode the old site's constants.ts fallback created.
 */

export const homePage = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  fields: [
    defineField({ name: 'seo', type: 'seoBlock', validation: (r) => r.required() }),
    defineField({ name: 'hero', type: 'heroBlock', validation: (r) => r.required() }),
    defineField({
      name: 'factorsHeading',
      title: 'Success factors heading',
      type: 'headingBlock',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'insightsHeading', type: 'headingBlock', validation: (r) => r.required() }),
    defineField({ name: 'portfolioHeading', type: 'headingBlock', validation: (r) => r.required() }),
    defineField({
      name: 'offeringsHeading',
      title: 'Current offerings heading',
      type: 'headingBlock',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'testimonialsHeading',
      type: 'headingBlock',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'partnersTeaser',
      title: 'Partners teaser',
      type: 'headingBlock',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'partnersTeaserCta', type: 'ctaLink', validation: (r) => r.required() }),
    defineField({
      name: 'portfolioCta',
      title: 'Portfolio "view all" button',
      type: 'ctaLink',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'popup', title: 'Homepage popup', type: 'popupBlock' }),
  ],
  preview: { prepare: () => ({ title: 'Home page' }) },
})

/**
 * The closing call to action. Lives on siteSettings, not on any one page: it closes the
 * homepage, every property page, and the five content pages that had no call to action at
 * all. One record, so they cannot drift apart.
 */
export const ctaBand = defineType({
  name: 'ctaBand',
  title: 'Closing call to action',
  type: 'object',
  fields: [
    defineField({ name: 'heading', type: 'headingBlock', validation: (r) => r.required() }),
    defineField({ name: 'submitLabel', type: 'string', validation: (r) => r.required().max(40) }),
    defineField({
      name: 'successMessage',
      type: 'text',
      rows: 2,
      validation: (r) => r.required().max(240),
    }),
    defineField({ name: 'callTitle', title: 'Book-a-call heading', type: 'string', validation: (r) => r.required().max(80) }),
    defineField({ name: 'callBody', title: 'Book-a-call text', type: 'text', rows: 2, validation: (r) => r.required().max(300) }),
    defineField({ name: 'callLabel', title: 'Book-a-call button', type: 'string', validation: (r) => r.required().max(40) }),
  ],
})

export const popupBlock = defineType({
  name: 'popupBlock',
  title: 'Homepage popup',
  type: 'object',
  description: 'Shown once per visitor after a short delay. Leave the whole block empty to disable it.',
  fields: [
    defineField({ name: 'enabled', type: 'boolean', initialValue: true }),
    defineField({ name: 'eyebrow', type: 'string', validation: (r) => r.max(40) }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.max(120) }),
    defineField({ name: 'body', type: 'text', rows: 3, validation: (r) => r.max(300) }),
    defineField({ name: 'submitLabel', type: 'string', validation: (r) => r.max(40) }),
    defineField({ name: 'successMessage', type: 'text', rows: 2, validation: (r) => r.max(240) }),
  ],
})

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About page',
  type: 'document',
  fields: [
    defineField({ name: 'seo', type: 'seoBlock', validation: (r) => r.required() }),
    defineField({ name: 'hero', type: 'heroBlock', validation: (r) => r.required() }),
    defineField({ name: 'factorsHeading', type: 'headingBlock', validation: (r) => r.required() }),
    defineField({
      name: 'leadershipTitle',
      type: 'string',
      validation: (r) => r.required().max(120),
    }),
    defineField({ name: 'boardTitle', type: 'string', validation: (r) => r.required().max(120) }),
  ],
  preview: { prepare: () => ({ title: 'About page' }) },
})

export const partnersPage = defineType({
  name: 'partnersPage',
  title: 'Partners page',
  type: 'document',
  fields: [
    defineField({ name: 'seo', type: 'seoBlock', validation: (r) => r.required() }),
    defineField({ name: 'heading', type: 'headingBlock', validation: (r) => r.required() }),
    defineField({
      name: 'partners',
      type: 'array',
      of: [{ type: 'labelledCard' }],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: 'submissionHeading',
      title: 'Site submission heading',
      type: 'headingBlock',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'facts', type: 'array', of: [{ type: 'factItem' }] }),
    defineField({ name: 'formTitle', type: 'string', validation: (r) => r.required().max(60) }),
    defineField({ name: 'submitLabel', type: 'string', validation: (r) => r.required().max(40) }),
  ],
  preview: { prepare: () => ({ title: 'Partners page' }) },
})

export const investorsPage = defineType({
  name: 'investorsPage',
  title: 'Investors page',
  type: 'document',
  fields: [
    defineField({ name: 'seo', type: 'seoBlock', validation: (r) => r.required() }),
    defineField({ name: 'heading', type: 'headingBlock', validation: (r) => r.required() }),
    defineField({
      name: 'loginLabel',
      title: 'Investor login button',
      type: 'string',
      validation: (r) => r.required().max(40),
    }),
    defineField({ name: 'stepsTitle', type: 'string', validation: (r) => r.required().max(120) }),
    defineField({
      name: 'steps',
      type: 'array',
      of: [{ type: 'stepItem' }],
      description: 'Every step describes process, never outcome. No step may state or imply a return.',
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: 'keepInTouchHeading',
      type: 'headingBlock',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'submitLabel', type: 'string', validation: (r) => r.required().max(40) }),
    defineField({
      name: 'testimonialsHeading',
      type: 'headingBlock',
      validation: (r) => r.required(),
    }),
  ],
  preview: { prepare: () => ({ title: 'Investors page' }) },
})

/**
 * Three routes that had no document of their own.
 *
 * /portfolio, /insights and /track-record were the pages revision D4 never reached,
 * because their visible copy is a single heading each and the rest is generated from the
 * property and post collections. Their search title and description were still literals in
 * TSX, which is the whole reason these exist.
 *
 * They hold `seo` only, deliberately. Their headings could move here too, but that is
 * copy-migration work with its own before-and-after check, and bundling it into a schema
 * change about metadata would make both harder to verify. The fields are here when someone
 * wants them.
 */
export const portfolioPage = defineType({
  name: 'portfolioPage',
  title: 'Portfolio page',
  type: 'document',
  fields: [defineField({ name: 'seo', type: 'seoBlock', validation: (r) => r.required() })],
  preview: { prepare: () => ({ title: 'Portfolio page' }) },
})

export const insightsPage = defineType({
  name: 'insightsPage',
  title: 'Insights page',
  type: 'document',
  fields: [defineField({ name: 'seo', type: 'seoBlock', validation: (r) => r.required() })],
  preview: { prepare: () => ({ title: 'Insights page' }) },
})

export const trackRecordPage = defineType({
  name: 'trackRecordPage',
  title: 'Track record page',
  type: 'document',
  fields: [defineField({ name: 'seo', type: 'seoBlock', validation: (r) => r.required() })],
  preview: { prepare: () => ({ title: 'Track record page' }) },
})

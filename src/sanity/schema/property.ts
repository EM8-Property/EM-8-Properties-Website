import { defineType, defineField } from 'sanity'

export const ASSET_CLASSES = ['multifamily', 'mixed-use', 'townhomes', 'industrial', 'senior'] as const
export const STATUSES = ['stabilized', 'lease-up', 'under-construction', 'renovation-complete', 'sold'] as const

/**
 * Human-readable labels, defined next to the slugs they describe.
 *
 * These previously lived in three places — Chip, PortfolioFilter, and the schema's own
 * slug arrays — so adding an asset class meant editing three files, and forgetting one
 * left a raw slug rendered on the site. One definition, imported everywhere.
 */
export const ASSET_CLASS_LABELS: Record<string, string> = {
  multifamily: 'Multifamily',
  'mixed-use': 'Mixed-Use',
  townhomes: 'Townhomes',
  industrial: 'Industrial',
  senior: 'Senior Living',
}

export const STATUS_LABELS: Record<string, string> = {
  stabilized: 'Stabilized',
  'lease-up': 'In Lease-Up',
  'under-construction': 'Under Construction',
  'renovation-complete': 'Renovation Complete',
  sold: 'Sold',
}

/**
 * One document per asset, at one canonical URL: /portfolio/[slug], regardless of status.
 * /track-record is a filtered view over `status == "sold"`, never a second set of pages —
 * duplicate URLs for one asset would split its search ranking and double the editing surface.
 */
export const property = defineType({
  name: 'property',
  title: 'Property',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'assetClass',
      type: 'string',
      options: { list: ASSET_CLASSES.map((v) => ({ title: v, value: v })) },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: { list: STATUSES.map((v) => ({ title: v, value: v })) },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'city', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'state', type: 'string', initialValue: 'IL', validation: (r) => r.required() }),
    defineField({
      name: 'coordinates',
      title: 'Map location',
      type: 'geopoint',
      description: 'Right-click the spot in Google Maps and click the numbers to copy.',
      validation: (r) => r.required(),
    }),
    // Metra distance is a field, not prose: it renders on every card and every property
    // page, which is what turns the TOD claim into a repeated, countable fact.
    defineField({ name: 'metraStation', title: 'Nearest Metra station', type: 'string' }),
    defineField({
      name: 'walkMinutes',
      title: 'Walk to station (minutes)',
      type: 'number',
      validation: (r) => r.min(0).max(60),
    }),
    defineField({ name: 'unitCount', title: 'Units', type: 'number' }),
    defineField({ name: 'squareFeet', type: 'number' }),
    defineField({ name: 'yearBuilt', type: 'number' }),
    defineField({ name: 'yearRenovated', type: 'number' }),
    defineField({
      name: 'cardBlurb',
      title: 'Card blurb',
      type: 'text',
      rows: 3,
      validation: (r) => r.required().max(180),
    }),
    defineField({ name: 'overview', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'businessPlan', type: 'array', of: [{ type: 'block' }] }),
    defineField({
      name: 'gallery',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              type: 'string',
              title: 'Alt text',
              validation: (r) => r.required(),
            }),
          ],
        },
      ],
    }),
    defineField({
      name: 'dealStory',
      title: 'Deal story',
      type: 'object',
      hidden: ({ parent }) => (parent as { status?: string } | undefined)?.status !== 'sold',
      fields: [
        defineField({ name: 'acquired', type: 'text', rows: 3 }),
        defineField({ name: 'executed', type: 'text', rows: 3 }),
        defineField({ name: 'exited', type: 'text', rows: 3 }),
        defineField({ name: 'equityMultiple', title: 'Realized equity multiple', type: 'string' }),
        defineField({ name: 'exitYear', type: 'number' }),
      ],
    }),
    defineField({
      name: 'publiclyOffered',
      title: 'Show offering publicly',
      type: 'boolean',
      description:
        'Only enable for offerings filed under Rule 506(c). Hides target returns and the deal room when off.',
      initialValue: false,
    }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'city', media: 'gallery.0' },
  },
})

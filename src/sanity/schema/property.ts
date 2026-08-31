import { defineType, defineField } from 'sanity'

// The vocabulary lives in src/lib/propertyTaxonomy.ts, which imports nothing. Components
// need the labels too, and this file imports the `sanity` package — so exporting them
// from here would drag the whole Studio library into the RSC graph and break the build.
import { ASSET_CLASSES, STATUSES } from '@/lib/propertyTaxonomy'

export { ASSET_CLASSES, STATUSES }

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
    // Residential and retail counts are separate fields, not one total.
    //
    // The live site published residential units; the internal June 2026 portfolio sheet
    // published residential + retail combined. That is the entire reason the two sources
    // disagreed on three properties (66/71, 90/93, 29/31) — not a data error. Storing one
    // "units" number would re-encode that ambiguity and guarantee the argument recurs.
    defineField({ name: 'unitCount', title: 'Residential units', type: 'number' }),
    defineField({
      name: 'retailUnitCount',
      title: 'Retail units',
      type: 'number',
      description: 'Street-level retail suites. Leave empty for a purely residential asset.',
      validation: (r) => r.min(0),
    }),
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
    /**
     * Spec §4: publiclyOffered "gates only the offering block: target returns, 'Enter the
     * deal room,' and the offering's appearance in any current-opportunity module."
     *
     * The toggle shipped without the block, because the only candidate at the time was
     * Boulevard, whose target returns could not be sourced. Nothing here is
     * optional-by-accident: every figure is entered from a real OM or left empty, and the
     * block collapses entirely when the offering is not public, so a 506(b) raise cannot
     * be generally solicited by forgetting to clear a field.
     *
     * Return language is constrained by the compliance rule — targeted, projected,
     * underwritten, estimated, pro forma. Never guaranteed or will return.
     */
    defineField({
      name: 'offering',
      title: 'Current offering',
      type: 'object',
      hidden: ({ parent }) =>
        (parent as { publiclyOffered?: boolean } | undefined)?.publiclyOffered !== true,
      fields: [
        defineField({
          name: 'summary',
          title: 'Offering summary',
          type: 'text',
          rows: 3,
          validation: (r) => r.max(400),
        }),
        defineField({
          name: 'targetIrr',
          title: 'Targeted levered IRR',
          type: 'string',
          description: 'As underwritten, base case only. For example: 17.7%',
        }),
        defineField({
          name: 'targetEquityMultiple',
          title: 'Targeted equity multiple',
          type: 'string',
          description: 'As underwritten. For example: 2.2x',
        }),
        defineField({ name: 'targetHoldYears', title: 'Target hold (years)', type: 'number' }),
        defineField({
          name: 'dealRoomUrl',
          title: 'Deal room URL',
          type: 'url',
          description: 'Agora offering link. Accreditation is verified there, not here.',
        }),
      ],
    }),
    /**
     * Whether the property appears in the assets listing on /portfolio and the homepage.
     *
     * Antioch Shopping Plaza is the case this exists for: under contract, not owned, so
     * listing it under "Assets across the Chicago MSA" would state that EM8 owns it.
     *
     * It hides the property from that listing and nothing else. The offering module, the
     * track record, and the property page itself all ignore it — one flag meaning four
     * different things is how a toggle becomes impossible to reason about.
     */
    defineField({
      name: 'showInPortfolio',
      title: 'Show in Assets',
      type: 'boolean',
      description:
        'Turn off for a property EM8 does not own yet. It keeps its own page and can still be offered.',
      initialValue: true,
    }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'city', media: 'gallery.0' },
  },
})

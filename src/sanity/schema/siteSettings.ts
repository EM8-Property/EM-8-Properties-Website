import { defineType, defineField } from 'sanity'

/**
 * Singleton. Every field is required: the root layout throws when this document is
 * missing rather than rendering a broken shell, because missing required content must
 * fail the build loudly — that is the failure mode the old constants.ts fallback created.
 */
export const siteSettings = defineType({
  name: 'siteSettings',
  type: 'document',
  fields: [
    defineField({
      name: 'agoraPortalUrl',
      title: 'Investor Login URL',
      type: 'url',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'contactEmail', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'bookACallUrl',
      title: 'Book a call URL',
      type: 'url',
      description: 'Scheduling link used by the homepage call to action.',
    }),
    /**
     * The banner carousel that runs above the hero on the main content pages.
     *
     * It lives on the singleton rather than on each property on purpose: the same photos
     * appear on every page that shows it, so there is one list to edit and no way for the
     * pages to drift apart. Reordering here reorders the band everywhere at once.
     *
     * Each slide links to a property, which is what makes the band navigation rather than
     * decoration. The reference is required for that reason — a slide that goes nowhere is
     * a large image asking to be clicked and doing nothing.
     */
    defineField({
      name: 'heroCarousel',
      title: 'Top-of-page photo carousel',
      type: 'array',
      description:
        'Shown above the hero on the home, portfolio, track record, insights, partners and about pages. Each photo links to its property.',
      of: [
        {
          type: 'object',
          name: 'carouselSlide',
          fields: [
            defineField({
              name: 'image',
              type: 'image',
              options: { hotspot: true },
              fields: [
                defineField({
                  name: 'alt',
                  title: 'Alt text',
                  type: 'string',
                  validation: (r) => r.required(),
                }),
              ],
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'property',
              type: 'reference',
              to: [{ type: 'property' }],
              description: 'Clicking the photo opens this property.',
              validation: (r) => r.required(),
            }),
          ],
          preview: {
            select: { title: 'property.title', media: 'image', subtitle: 'image.alt' },
          },
        },
      ],
    }),
    defineField({ name: 'defaultShareImage', type: 'image' }),
    defineField({ name: 'disclaimer', type: 'text', rows: 5, validation: (r) => r.required() }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
})

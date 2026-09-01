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
        'The photo band on the portfolio, track record, insights, partners and about pages, and the ' +
        'homepage hero. Each photo links to its property. ' +
        'IMPORTANT: on the homepage the headline sits ON TOP of these photographs, so they must be ' +
        'dark. A pale sky or a bright lobby will make the headline unreadable.',
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
    defineField({
      name: 'defaultShareImage',
      type: 'image',
      // Hotspot matters here now that this field is rendered rather than ignored: the
      // card is a fixed 1200x630 crop, and a portrait upload centre-cropped to that can
      // cut the subject's head off. Same reason every other image in this schema has it.
      options: { hotspot: true },
      description: 'Shown when a page is shared. Upload at least 1200x630.',
    }),
    /**
     * The closing call to action, on siteSettings because it really is shared.
     *
     * It lived on homePage, and the schema comment claimed it was "shared by the homepage
     * and every property page" — but a property page passed no copy at all, so all eleven
     * rendered a headless email box: no heading, no intro, and no book-a-call, because
     * that block hides itself when the label is missing. One record is what the comment
     * always described; this is where a record shared by every page belongs.
     */
    defineField({ name: 'ctaBand', type: 'ctaBand', validation: (r) => r.required() }),
    defineField({ name: 'disclaimer', type: 'text', rows: 5, validation: (r) => r.required() }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
})

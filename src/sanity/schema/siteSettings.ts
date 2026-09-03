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
    /**
     * The dark button at the end of the header. The canonical account of this field.
     *
     * Sits beside `agoraPortalUrl` because the two are the header's only buttons and are
     * read as a pair. It shipped as the literal "Get Started" pointing at a literal
     * /investors, and it is now the only *label* in the site chrome the team can change
     * without a developer.
     *
     * Not "the last hardcoded string in the chrome" — the five nav labels and the words
     * "Investor Login" are still literals in SiteHeader.tsx, and deliberately: those
     * name routes and a third-party product rather than carrying marketing copy, so
     * changing them is a change to the site's structure, not to its wording. Only
     * `agoraPortalUrl`, Investor Login's *destination*, was already in the CMS. This
     * button is the one thing in the header that is copy, and copy belongs to the team.
     *
     * `required()` here is a courtesy to the editor; the guard that matters is in
     * `(site)/layout.tsx`, which throws per leaf, and the release gate is in
     * content-integrity. Sanity's required() gates the Publish button and nothing else.
     */
    defineField({
      name: 'headerCta',
      title: 'Header button',
      type: 'ctaLink',
      description:
        'The dark button at the end of the top navigation. Appears on every page, so keep ' +
        'the label short — two or three words. It is the primary call to action for the ' +
        'whole site.',
      /*
       * 20, where ctaLink's own cap is 40.
       *
       * 40 is right for a button in a page body and wrong for this one: the header is a
       * single flex-wrap row holding the wordmark, five nav links, Investor Login and
       * this button, so the label is what decides how tall the header is. Measured on
       * /about at the md breakpoint, which is the tightest:
       *
       *   768px   11 chars -> header 62px    14 -> 102px    39 -> 118px
       *   820px   18 chars -> header 62px    21 -> 102px
       *   900px   25 chars -> header 62px    39 -> 102px
       *
       * Nothing collides at any length the schema allows — even 39 chars leaves 45px
       * between the header and the hero eyebrow — so this is a guardrail on the design,
       * not on correctness. It keeps the header from going three rows deep on a tablet.
       *
       * A field-level rule, not a tighter max() on ctaLink: narrowing the shared block
       * would move the cap on every other button on the site.
       */
      validation: (r) =>
        r
          .required()
          // Typed here because `ctaLink` is a named object type, so Sanity resolves the
          // rule's value to `{}` and the label is invisible to it.
          .custom((v: { label?: string } | undefined) =>
            !v?.label || v.label.length <= 20
              ? true
              : 'Keep the header button to 20 characters — it shares one row with the whole nav',
          ),
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

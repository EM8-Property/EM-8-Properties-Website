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
     * The visible text of every navigation tab and panel link.
     *
     * Hunter's decision, 2026-09-08, over the recommendation to keep these in code. The
     * split is deliberate and it is the whole design: Sanity owns the words, and
     * `src/lib/navigation.ts` owns which nodes exist, how they nest and where each points.
     * A bad edit here makes a tab read oddly; it cannot re-aim it or remove it.
     *
     * The failure that split leaves open is a label that lies about its destination —
     * "Insights" over a link to /partners is individually valid on both halves and
     * catchable by no test. Each description below names the destination it labels,
     * because that is the only place an editor will ever be told. Spec §5 records this as a
     * trust decision taken knowingly.
     *
     * Nine fields, not the ten §5's prose counts. The tenth in its table is Investor Login,
     * which names a third-party product rather than carrying copy — the same rule that
     * keeps it a literal in SiteHeader, stated on `headerCta` above and in the README.
     *
     * Every one is required content. The guard is the per-leaf throw in
     * `(site)/layout.tsx`, driven by `REQUIRED_SITE_SETTINGS`, and the pre-deploy check is
     * in `content-integrity`. The `required()` calls below gate the Publish button and
     * nothing else.
     *
     * Caps: 10 on the four bar labels, 24 on the five panel labels. Originally 12 — this
     * field's own comment said so, and so did the arithmetic in Task 6's spec — until Task
     * 6 measured it rather than trusting that arithmetic: at all four bar labels padded out
     * to 12 characters, the nav wrapped to two lines at 390px as well as 320px, not just at
     * the narrow end the spec expected. 10 characters keeps a single nav line at 390px; the
     * numbers for both are in the PR that lowered this.
     *
     * The bar is measured in characters and its four labels share one row on a phone, so
     * their length decides how tall the header is — and because these are CMS fields now,
     * that length is no longer a build-time fact. A panel row has the width of the panel
     * and none of that problem. Like `headerCta.label`'s cap this is a guardrail on the
     * design rather than on correctness — over-long labels wrap the nav to a second line
     * rather than overflowing it, which is graceful and which nobody would be told about.
     */
    defineField({
      name: 'navLabels',
      title: 'Navigation labels',
      type: 'object',
      description:
        'The words on the top navigation. Where each one goes is set in code and cannot ' +
        'be changed here — the description under each field names its destination.',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'aboutUs',
          title: 'About Us (tab)',
          type: 'string',
          description:
            'The first tab. Opens a menu; it is not a link itself. Its three menu links ' +
            'go to /about, /about#why-em8 and /about#team.',
          validation: (r) => r.required().max(10),
        }),
        defineField({
          name: 'aboutEm8',
          title: 'About EM8 (under About Us)',
          type: 'string',
          description: 'Goes to /about.',
          validation: (r) => r.required().max(24),
        }),
        defineField({
          name: 'whyEm8',
          title: 'Why EM8 (under About Us)',
          type: 'string',
          description:
            'Goes to /about#why-em8, the Why EM8 section of the About page. This link is ' +
            'hidden while that section has no body text.',
          validation: (r) => r.required().max(24),
        }),
        defineField({
          name: 'ourTeam',
          title: 'Our Team (under About Us)',
          type: 'string',
          description: 'Goes to /about#team, the team section of the About page.',
          validation: (r) => r.required().max(24),
        }),
        defineField({
          name: 'strategy',
          title: 'Strategy (tab)',
          type: 'string',
          description:
            'The second tab. Goes to /strategy, and also opens a menu of two links.',
          validation: (r) => r.required().max(10),
        }),
        defineField({
          name: 'whyMidwest',
          title: 'Why Midwest (under Strategy)',
          type: 'string',
          description:
            'Goes to /strategy — the same page as the tab above it. It labels that page’s ' +
            'argument, and it is what makes the page reachable by tapping on a phone.',
          validation: (r) => r.required().max(24),
        }),
        defineField({
          name: 'partners',
          title: 'Partners (under Strategy)',
          type: 'string',
          description: 'Goes to /partners.',
          validation: (r) => r.required().max(24),
        }),
        defineField({
          name: 'portfolio',
          title: 'Portfolio (tab)',
          type: 'string',
          description: 'Goes to /portfolio. A plain link with no menu.',
          validation: (r) => r.required().max(10),
        }),
        defineField({
          name: 'insights',
          title: 'Insights (tab)',
          type: 'string',
          description: 'Goes to /insights. A plain link with no menu.',
          validation: (r) => r.required().max(10),
        }),
      ],
    }),
    /**
     * The heading above a sold property's realized deal figures, on /portfolio/[slug].
     *
     * A field rather than a literal on Hunter's instruction of 2026-09-08: every string
     * this PR writes has to be editable in the Studio. It was the only one that would not
     * have been — the nine nav labels and the Strategy page's heading are all CMS content
     * already.
     *
     * On `siteSettings` because it is a section label every property page reads rather
     * than a fact about any one property; `ctaBand` below carries the full account of that
     * rule. Per-property it would be eleven copies of one phrase, drifting.
     *
     * Optional, unlike the nav labels, and the difference is what a blank one does. A
     * missing nav label renders a tab with no words in it, so the layout throws. A missing
     * heading here renders the figures with no heading — which is exactly how they looked
     * on /track-record — so it degrades rather than failing, and there is no reason to buy
     * a tenth build-failure vector for it.
     *
     * The three other headings on that page — "The business plan", "Location", and
     * DealStory's own Acquired/Executed/Exited labels — are still literals. They predate
     * this PR and moving them is a separate change; noted so the inconsistency is on the
     * record rather than a surprise.
     */
    defineField({
      name: 'dealStoryHeading',
      title: 'Realized results heading',
      type: 'string',
      description:
        'The heading above the realized figures on a sold property’s page — the deal ' +
        'narrative and its equity multiple. Leave it empty to show those figures with no ' +
        'heading above them.',
      validation: (r) => r.max(60),
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

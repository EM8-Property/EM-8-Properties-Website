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
    // offeringsHeading removed here: its copy now lives at portfolioPage.offeringsHeading
    // (Task 5), the field the Current Offerings section on /portfolio actually reads.
    // insightsHeading, partnersTeaser and partnersTeaserCta below are NOT removed even
    // though page.tsx stopped reading them too (spec §6) — they have no second address,
    // so this stays a dormant field rather than a drift hazard. See the comment on
    // HOME_PAGE_QUERY in src/sanity/queries.ts for the full reasoning.
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
    /**
     * The label on the email field, and the last literal on the site's only conversion path.
     *
     * `CtaBand` hardcoded it, which made it the one string in this band an editor could not
     * change — beside a submit button, a heading, an intro and a success message they all
     * could. Required rather than optional, unlike `dealStoryHeading`: a blank heading
     * degrades to no heading, but a blank field label is an unlabelled `<input type=email>`,
     * which a screen reader announces as nothing at all.
     */
    defineField({
      name: 'emailLabel',
      title: 'Email field label',
      type: 'string',
      description: 'The label above the email box. Screen readers read this out, so it cannot be blank.',
      validation: (r) => r.required().max(40),
    }),
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
    /**
     * The Why EM8 section, and it is a section rather than a page on purpose.
     *
     * Hunter's word was "fold". §12 records this as the place four proposed routes became
     * one: Why EM8 lives here and Why Midwest is /strategy's body, so neither starts life
     * as a thin page with a heading and nothing under it.
     *
     * Optional at this level, and the only optional block on any page document. The copy is
     * owed by people — §3 lists it — so the structure ships ahead of the words and /about
     * renders nothing at all for this until both the title and the body are there. An empty
     * <h2> would be worse than no section, and §5 asks for exactly that: "A section whose
     * body is absent renders nothing, and its nav entry goes with it."
     *
     * The nav entry going with it is real rather than decorative: on the day this merges
     * the section is empty, so "Why EM8" would otherwise be a menu link to an anchor that
     * is not on the page. `NAV_SECTIONS_QUERY` is what tells the header, and the gate is in
     * SiteHeader.
     *
     * `headingBlock`'s own eyebrow and title are required, so a half-filled block fails
     * Studio validation and cannot be published — a nudge to finish it. That nudge is not
     * the guard: Vision, the CLI and any direct API write ignore it, so /about checks both
     * leaves before rendering.
     */
    defineField({
      name: 'whyEm8',
      title: 'Why EM8 section',
      type: 'object',
      description:
        'The Why EM8 argument, shown between the success factors and the team. Leave the ' +
        'whole block empty and the section — and its link in the About Us menu — do not ' +
        'appear at all.',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({ name: 'heading', type: 'headingBlock' }),
        defineField({ name: 'body', type: 'array', of: [{ type: 'block' }] }),
      ],
    }),
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
 * Two routes whose visible copy is a single heading each, the rest being generated from
 * the property and post collections.
 *
 * They were the pages revision D4 never reached. They held `seo` only, and the note here
 * used to say their headings "could move here too, but that is copy-migration work with
 * its own before-and-after check" — deferred, not declined. This is that work: `heading`
 * now sits alongside `seo`, so every page on the site is editable without a developer.
 *
 * `heading` is required for the same reason it is on every other page. Missing required
 * content fails the build loudly rather than rendering a page with no title, which is the
 * failure mode the old site's constants.ts fallback created. Note that Sanity's
 * `required()` is Studio-side only — the guard that actually holds is the throw in each
 * page component.
 */
export const portfolioPage = defineType({
  name: 'portfolioPage',
  title: 'Portfolio page',
  type: 'document',
  fields: [
    defineField({ name: 'seo', type: 'seoBlock', validation: (r) => r.required() }),
    defineField({ name: 'heading', type: 'headingBlock', validation: (r) => r.required() }),
    /**
     * The Current Offerings heading, moved here from `homePage.offeringsHeading` as that
     * section itself moves from the homepage to this page (spec §6). Same `headingBlock`
     * shape as the field it replaces.
     *
     * Deliberately NOT required, unlike `heading` above and unlike every other page
     * heading in this file. §6 says a section with nothing in it renders nothing — no
     * heading, no empty grid — and the day the one publicly-offered property closes,
     * there is no section left to head. A `required()` here would make the Studio nag
     * an editor for copy that heads a section nobody will see.
     */
    defineField({
      name: 'offeringsHeading',
      title: 'Current offerings heading',
      type: 'headingBlock',
      description:
        'Heads the Current Offerings section on this page. Optional: leave it empty and ' +
        'the section renders nothing, which is what should happen once nothing is ' +
        'publicly offered.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Portfolio page' }) },
})

export const insightsPage = defineType({
  name: 'insightsPage',
  title: 'Insights page',
  type: 'document',
  fields: [
    defineField({ name: 'seo', type: 'seoBlock', validation: (r) => r.required() }),
    defineField({ name: 'heading', type: 'headingBlock', validation: (r) => r.required() }),
  ],
  preview: { prepare: () => ({ title: 'Insights page' }) },
})

/**
 * The one new route in spec §5, and the only one: an earlier draft would have created four.
 *
 * It began as `portfolioPage`'s shape — `seo` and `heading` — plus a `body` for the Why
 * Midwest argument, and shipped on 2026-09-08 with that body empty, which §3 records as
 * correct: the copy was "Owed by people" and the structure shipping first is what means
 * nobody needs a developer when it arrives.
 *
 * It has arrived, and it turned out not to be prose. The argument is three claims about a
 * market and one figure that shows the result of them, which is a pillar grid and a chart
 * rather than four paragraphs — so `body` keeps the connective prose and four optional
 * fields hold the parts that have a shape. Every one of them is optional and every section
 * gates on its own content, so this document degrades all the way back to a heading and a
 * call to action without rendering a single empty band.
 *
 * `heading` is the one required field, and that asymmetry is the right way round: the
 * component throws without a heading, and a titleless page failing `next build` is the
 * loud failure this project prefers to a page that renders with a blank at the top.
 */
export const strategyPage = defineType({
  name: 'strategyPage',
  title: 'Strategy page',
  type: 'document',
  fields: [
    defineField({ name: 'seo', type: 'seoBlock', validation: (r) => r.required() }),
    defineField({ name: 'heading', type: 'headingBlock', validation: (r) => r.required() }),
    defineField({
      name: 'body',
      title: 'Why Midwest',
      type: 'array',
      of: [{ type: 'block' }],
      description:
        'The argument for the Midwest, and for suburban Chicago in particular. Opens the ' +
        'page under the hero. Leave it empty and the page goes straight to the pillars.',
    }),
    /**
     * The pillar cards, and the heading over them.
     *
     * Two optional fields that render as one section, gated on both: a heading with no
     * cards is a promise the page does not keep, and four cards with no heading is a grid
     * a reader has no frame for. `/about`'s Why EM8 block settled this shape already —
     * "A section whose body is absent renders nothing" (spec §5) — and this follows it.
     *
     * `pillarsHeading` uses the same `headingBlock` as every other section on the site,
     * whose own eyebrow and title are required, so a half-filled heading cannot be
     * published from the Studio. That is a nudge rather than the guard: the CLI, Vision
     * and any direct API write ignore it, so the page checks the leaf it actually renders.
     */
    defineField({
      name: 'pillarsHeading',
      title: 'Pillars heading',
      type: 'headingBlock',
      description:
        'Heads the pillar cards below. Leave it empty — or leave the cards empty — and the ' +
        'whole section renders nothing.',
    }),
    defineField({
      name: 'pillars',
      title: 'Pillars',
      type: 'array',
      of: [{ type: 'pillarCard' }],
      description:
        'The reasons the market works, one card each. Four fit the grid exactly; three or ' +
        'six read fine, five leaves a gap.',
    }),
    /**
     * The chart section — a heading, a series, a unit, and the source behind the numbers.
     *
     * `marketSource` is required *conditionally*, which is the only conditional validation
     * on any page document, and it earns that. Spec §9's rule is that no figure ships
     * without a source behind it, and `tests/shared/placeholders.ts` enforces it for the
     * figures that rule was written about — but it cannot enforce it for a number an
     * editor types into the Studio next year. A bar chart is the one place on this site
     * where an editor can publish a fresh, unattributed statistic to investors in four
     * keystrokes, so the schema refuses to let them, and the page refuses to render the
     * section without it. Two guards, because Studio validation is Studio-side only.
     */
    defineField({
      name: 'marketHeading',
      title: 'Chart heading',
      type: 'headingBlock',
      description:
        'Heads the bar chart below. Leave it empty — or leave the bars empty — and the ' +
        'whole section renders nothing.',
    }),
    defineField({
      name: 'marketBars',
      title: 'Chart bars',
      type: 'array',
      of: [{ type: 'metricBar' }],
      description: 'One row per thing being compared. The longest bar sets the scale.',
    }),
    defineField({
      name: 'marketUnit',
      title: 'Chart unit',
      type: 'string',
      description: 'Appended to every figure — "%", "pts", " units". Leave empty for none.',
      initialValue: '%',
      validation: (r) => r.max(8),
    }),
    defineField({
      name: 'marketSource',
      title: 'Chart source',
      type: 'string',
      description:
        'Who published these figures, and for what period. Required as soon as the chart ' +
        'has a single bar in it, and the chart does not render without it — a statistic ' +
        'on an investor-facing page states where it came from.',
      validation: (r) =>
        r.max(200).custom((value, context) => {
          const bars = (context.document?.marketBars as unknown[] | undefined) ?? []
          if (bars.length > 0 && !value?.trim()) {
            return 'The chart has bars but no source. Name the publisher and the period.'
          }
          return true
        }),
    }),
  ],
  preview: { prepare: () => ({ title: 'Strategy page' }) },
})

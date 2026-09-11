import { defineType, defineField } from 'sanity'
// The icon vocabulary lives in src/lib/pillarIcons.ts, which imports nothing — a
// component cannot reach into this file for it without dragging the whole Studio into
// the RSC graph. Same arrangement as property.ts and propertyTaxonomy.ts.
import { PILLAR_ICONS, PILLAR_ICON_LABELS } from '@/lib/pillarIcons'

/**
 * Reusable copy blocks shared by the per-page singletons.
 *
 * These exist so the four page documents are not four near-identical schema files. A
 * heading is a heading whether it sits on /about or /partners, and defining it once means
 * a change to how headings work lands everywhere at once.
 *
 * Every block is a plain object type with named fields rather than a generic key/value
 * list. Typegen can then check each usage, and a renamed field fails the build with a
 * clear message — a keyed lookup would just render a blank section and say nothing.
 */

/** A link with its own label, so a button's words are editable alongside its destination. */
export const ctaLink = defineType({
  name: 'ctaLink',
  title: 'Button',
  type: 'object',
  fields: [
    defineField({ name: 'label', type: 'string', validation: (r) => r.required().max(40) }),
    defineField({
      name: 'href',
      title: 'Destination',
      type: 'string',
      description: 'A path such as /portfolio, or a full https:// URL.',
      validation: (r) => r.required(),
    }),
  ],
  preview: { select: { title: 'label', subtitle: 'href' } },
})

/**
 * An eyebrow, a heading, and an optional intro — the pattern SectionHeading renders.
 * `intro` is optional because several sections deliberately have none.
 */
export const headingBlock = defineType({
  name: 'headingBlock',
  title: 'Section heading',
  type: 'object',
  fields: [
    defineField({ name: 'eyebrow', type: 'string', validation: (r) => r.required().max(40) }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required().max(120) }),
    defineField({ name: 'intro', type: 'text', rows: 3, validation: (r) => r.max(400) }),
  ],
  preview: { select: { title: 'title', subtitle: 'eyebrow' } },
})

/**
 * The page-opening block.
 *
 * `titleAccent` is a separate field rather than markup inside `title` because the accent
 * is a colour change on the tail of the headline. Splitting it keeps the editor out of
 * HTML and keeps the teal on a token rather than a pasted hex.
 */
export const heroBlock = defineType({
  name: 'heroBlock',
  title: 'Hero',
  type: 'object',
  fields: [
    defineField({ name: 'eyebrow', type: 'string', validation: (r) => r.required().max(80) }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required().max(120) }),
    defineField({
      name: 'titleAccent',
      title: 'Title (accent tail)',
      type: 'string',
      description: 'The closing words of the headline, shown in teal. Leave empty for none.',
      validation: (r) => r.max(80),
    }),
    defineField({
      name: 'titleSuffix',
      title: 'Title (after the accent)',
      type: 'string',
      description: 'Usually just punctuation, such as a full stop.',
      validation: (r) => r.max(10),
    }),
    defineField({ name: 'intro', type: 'text', rows: 3, validation: (r) => r.required().max(400) }),
    defineField({ name: 'primaryCta', type: 'ctaLink' }),
    defineField({ name: 'secondaryCta', type: 'ctaLink' }),
  ],
  preview: { select: { title: 'title', subtitle: 'eyebrow' } },
})

/** An eyebrow-titled card: the Partners trio, and anything shaped like it. */
export const labelledCard = defineType({
  name: 'labelledCard',
  title: 'Card',
  type: 'object',
  fields: [
    defineField({ name: 'eyebrow', type: 'string', validation: (r) => r.required().max(40) }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required().max(60) }),
    defineField({ name: 'body', type: 'text', rows: 3, validation: (r) => r.required().max(300) }),
  ],
  preview: { select: { title: 'title', subtitle: 'eyebrow' } },
})

/** A numbered step. Order comes from the array, so no order field. */
export const stepItem = defineType({
  name: 'stepItem',
  title: 'Step',
  type: 'object',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required().max(60) }),
    defineField({ name: 'body', type: 'text', rows: 2, validation: (r) => r.required().max(300) }),
  ],
  preview: { select: { title: 'title', subtitle: 'body' } },
})

/** A label and its value, for the small fact rows. */
export const factItem = defineType({
  name: 'factItem',
  title: 'Fact',
  type: 'object',
  fields: [
    defineField({ name: 'label', type: 'string', validation: (r) => r.required().max(40) }),
    defineField({ name: 'value', type: 'string', validation: (r) => r.required().max(60) }),
  ],
  preview: { select: { title: 'value', subtitle: 'label' } },
})

/**
 * An icon, a label, a claim and its reasoning — the Strategy pillars.
 *
 * A separate type from `labelledCard` rather than that type with an icon bolted on. The
 * Partners trio uses `labelledCard` and has no icons; adding an optional `icon` there
 * would put a dropdown on three cards that will never draw one, and an editor who filled
 * it in would get no icon and no explanation. The two look alike on the page and mean
 * different things in the Studio, which is the case for two types.
 *
 * `icon` is a dropdown over a closed list, never a string field. A typo in a free-text
 * icon name renders a card with a hole where its glyph should be, and nothing in the
 * build, the tests or Lighthouse would notice — `PillarIcon` draws nothing it does not
 * recognise. It is also optional: a card with no icon is still a card, and shipping the
 * words ahead of a decision about the picture is allowed.
 */
export const pillarCard = defineType({
  name: 'pillarCard',
  title: 'Strategy pillar',
  type: 'object',
  fields: [
    defineField({
      name: 'icon',
      type: 'string',
      options: {
        // `?? value` because the labels are an index signature, which the strict
        // config types as possibly absent. A name with no label is still selectable
        // rather than a dropdown entry with no words in it.
        list: PILLAR_ICONS.map((value) => ({ value, title: PILLAR_ICON_LABELS[value] ?? value })),
        layout: 'dropdown',
      },
      description: 'The line icon above the card. Leave it empty for no icon.',
    }),
    defineField({ name: 'eyebrow', type: 'string', validation: (r) => r.required().max(40) }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required().max(60) }),
    defineField({ name: 'body', type: 'text', rows: 4, validation: (r) => r.required().max(400) }),
  ],
  preview: { select: { title: 'title', subtitle: 'eyebrow' } },
})

/**
 * One row of a bar chart: what is being measured, and how much of it there is.
 *
 * `value` is a number rather than a string such as "3.1%". The chart divides it by the
 * largest value in the series to get a bar width, and a string would make every bar the
 * same length while the labels beside them said otherwise — a chart that looks
 * authoritative and is wrong. The unit is one field on the section rather than a field on
 * every row, because a chart whose rows carry different units is not a chart.
 *
 * `min(0)` is a rendering constraint, not a view about what is measurable. `MetricBars`
 * draws from a zero baseline, so a negative rate would draw as a short bar on the same
 * side as every gain and read as a small one. A series with negatives in it needs a
 * diverging chart, which this is not.
 */
export const metricBar = defineType({
  name: 'metricBar',
  title: 'Bar',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      type: 'string',
      description: 'What this row measures — a metro, a year, a submarket.',
      validation: (r) => r.required().max(60),
    }),
    defineField({
      name: 'value',
      type: 'number',
      description:
        'The figure itself, without its unit — 3.1, not "3.1%". Bars are drawn from zero, ' +
        'so this cannot be negative.',
      validation: (r) => r.required().min(0),
    }),
    defineField({
      name: 'highlight',
      title: 'Highlight this row',
      type: 'boolean',
      description:
        'Draws the bar in teal. Usually the row the section is making a point about.',
      initialValue: false,
    }),
  ],
  preview: { select: { title: 'label', subtitle: 'value' } },
})

/**
 * The title and description a page shows in search results and on a share card.
 *
 * These were the last strings still hardcoded in TSX after revision D4 moved the rest of
 * the page copy into Sanity. They stayed behind for a mechanical reason — Next's static
 * `metadata` export cannot read the CMS, so moving them meant converting every page to
 * `generateMetadata` — not because anyone decided the team should need a developer to fix
 * a search-result snippet.
 *
 * `title` is the page's own name only. " | EM8 Properties" is appended by `pageTitle`, so
 * an editor typing the suffix would get it twice.
 */
export const seoBlock = defineType({
  name: 'seoBlock',
  title: 'Search & sharing',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Page title',
      type: 'string',
      description:
        'The page name on its own — "About", not "About | EM8 Properties". The site name is added automatically.',
      // 43, not 60. Google truncates a title around 60 characters, and pageTitle appends
      // " | EM8 Properties" — 17 more — so a title written to a 60-character counter
      // renders at 77 and gets cut off. The counter has to measure what ships.
      validation: (r) => r.required().max(43),
    }),
    defineField({
      name: 'description',
      title: 'Search description',
      type: 'text',
      rows: 3,
      description:
        'One or two sentences. Google shows roughly 155 characters, so the counter caps there.',
      validation: (r) => r.required().max(155),
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'description' } },
})

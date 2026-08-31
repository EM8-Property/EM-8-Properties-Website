import { defineType, defineField } from 'sanity'
import { TEAM_GROUPS, TEAM_GROUP_LABELS } from '../../lib/teamGroups'

export const teamMember = defineType({
  name: 'teamMember',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'role', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'bio',
      type: 'text',
      rows: 6,
      // 200 was sized for a one-line staff bio. A board member's is a career — prior
      // firms, transactions, degrees, usually across several paragraphs — and the old cap
      // made those simply unenterable: Sanity rejects the document, so it surfaces as an
      // editor unable to save rather than as anything a test would catch. Still capped, so
      // the field cannot quietly become a CV dumping ground.
      validation: (r) => r.max(1500),
    }),
    defineField({
      // Hotspot cropping is what stops a square crop from decapitating a portrait —
      // the specific failure the old site's style guide asked humans to remember.
      name: 'photo',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', validation: (r) => r.required() })],
    }),
    /**
     * Governance relationship, not job title. Drives which section of /about a person
     * appears under; defaults to leadership so existing records keep their place.
     */
    defineField({
      name: 'group',
      type: 'string',
      options: { list: TEAM_GROUPS.map((v) => ({ title: TEAM_GROUP_LABELS[v], value: v })) },
      initialValue: 'leadership',
    }),
    defineField({ name: 'linkedin', title: 'LinkedIn URL', type: 'url' }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
  preview: { select: { title: 'name', subtitle: 'role', media: 'photo' } },
})

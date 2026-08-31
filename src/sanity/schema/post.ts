import { defineType, defineField } from 'sanity'

export const POST_CATEGORIES = [
  'municipal-partnership',
  'design',
  'operations',
  'market',
  'announcement',
] as const

/** /insights/[slug] is the LinkedIn-linkable URL — the mechanism behind "reputation brings capital to us." */
export const post = defineType({
  name: 'post',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({ name: 'publishedAt', type: 'datetime', validation: (r) => r.required() }),
    defineField({
      name: 'category',
      type: 'string',
      options: { list: POST_CATEGORIES.map((v) => ({ title: v, value: v })) },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'excerpt',
      type: 'text',
      rows: 3,
      validation: (r) => r.required().max(200),
    }),
    defineField({
      name: 'heroImage',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', validation: (r) => r.required() })],
    }),
    defineField({
      name: 'body',
      type: 'array',
      of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }],
    }),
    defineField({ name: 'relatedProperty', type: 'reference', to: [{ type: 'property' }] }),
  ],
  preview: { select: { title: 'title', subtitle: 'category', media: 'heroImage' } },
})

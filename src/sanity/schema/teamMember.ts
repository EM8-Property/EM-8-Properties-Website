import { defineType, defineField } from 'sanity'

export const teamMember = defineType({
  name: 'teamMember',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'role', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'bio',
      type: 'text',
      rows: 3,
      validation: (r) => r.max(200),
    }),
    defineField({
      // Hotspot cropping is what stops a square crop from decapitating a portrait —
      // the specific failure the old site's style guide asked humans to remember.
      name: 'photo',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', validation: (r) => r.required() })],
    }),
    defineField({ name: 'linkedin', title: 'LinkedIn URL', type: 'url' }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
  preview: { select: { title: 'name', subtitle: 'role', media: 'photo' } },
})

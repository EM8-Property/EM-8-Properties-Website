import { defineType, defineField } from 'sanity'

/** The four success factors from the August 2026 strategy session. */
export const focusCard = defineType({
  name: 'focusCard',
  title: 'Success factor',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'description', type: 'text', rows: 4, validation: (r) => r.required() }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
  preview: { select: { title: 'title', subtitle: 'description' } },
})

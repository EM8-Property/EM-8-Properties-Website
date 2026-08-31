import { defineType, defineField } from 'sanity'

export const heroStat = defineType({
  name: 'heroStat',
  type: 'document',
  fields: [
    defineField({
      name: 'figure',
      type: 'string',
      description: 'Exactly as it should appear, including $ , + and %.',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
  preview: { select: { title: 'figure', subtitle: 'label' } },
})

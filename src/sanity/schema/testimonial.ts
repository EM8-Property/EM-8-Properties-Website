import { defineType, defineField } from 'sanity'

/**
 * Replaces the Buffett quote, which was cut permanently: a borrowed quote from someone
 * with no relationship to the firm reads thin next to a real investor saying something
 * specific. `consentOnRecord` is the gate — TESTIMONIALS_QUERY filters on it, so an
 * investor's name cannot reach the site without written consent on file.
 */
export const testimonial = defineType({
  name: 'testimonial',
  type: 'document',
  fields: [
    defineField({ name: 'quote', type: 'text', rows: 4, validation: (r) => r.required() }),
    defineField({ name: 'attribution', title: 'Name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'descriptor', title: 'Role or descriptor', type: 'string' }),
    defineField({ name: 'investorSince', type: 'number' }),
    defineField({
      name: 'consentOnRecord',
      title: 'Written consent on file',
      type: 'boolean',
      description: 'Do not publish an investor name without it.',
      initialValue: false,
      validation: (r) => r.required(),
    }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
  preview: { select: { title: 'attribution', subtitle: 'descriptor' } },
})

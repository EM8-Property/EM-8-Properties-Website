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
    defineField({ name: 'contactEmail', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'defaultShareImage', type: 'image' }),
    defineField({ name: 'disclaimer', type: 'text', rows: 5, validation: (r) => r.required() }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
})

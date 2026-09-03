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
    /**
     * The one field in this schema that refuses rather than warns.
     *
     * `required()` alone is not this check: on a boolean it rejects null and undefined
     * and accepts `false`, which is the initial value — so by itself it permits exactly
     * the mistake that matters.
     *
     * And that mistake is silent everywhere else. TESTIMONIALS_QUERY filters on
     * `consentOnRecord == true`, so an unconsented testimonial publishes cleanly,
     * validates, reports success, and then never appears on any page with no message
     * anywhere — which is what happened to a real, wanted testimonial on 2026-09-03. The
     * release gate does catch it, but that runs at release, not at the edit.
     *
     * A draft is where a testimonial waits for its consent to arrive. Publishing one is
     * the claim that it is ready to be public, and this is the field that decides whether
     * that claim is true, so the Studio should say no at the moment of the click.
     */
    defineField({
      name: 'consentOnRecord',
      title: 'Written consent on file',
      type: 'boolean',
      description:
        'Required to publish. The site filters on this field, so a testimonial without ' +
        'it stays invisible on every page. Keep it as a draft until the written ' +
        'permission is genuinely on file.',
      initialValue: false,
      validation: (r) =>
        r
          .required()
          .custom((v) =>
            v === true
              ? true
              : 'This testimonial has no written consent on file, so the site will never show it. Tick the box once you hold the permission, or leave this as a draft.',
          ),
    }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
  preview: { select: { title: 'attribution', subtitle: 'descriptor' } },
})

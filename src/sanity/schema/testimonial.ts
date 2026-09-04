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
     *
     * **What this does not close.** Sanity validation is Studio-side only: it gates the
     * Publish button and nothing else — not the API, not GROQ, not `next build`, and not
     * Vision, the CLI, a script or an import. So this closes the path a human editor
     * takes, which is the path the 2026-09-03 fault came down, and nothing more. What
     * actually protects the site is still `TESTIMONIALS_QUERY` filtering the flag, and
     * what catches a document written around the Studio is still the release gate in
     * `tests/integration/content-integrity.test.ts`. See "`required()` is a lie, for this
     * purpose" in docs/deploys-and-migrations.md.
     *
     * **And it reaches editors only once the Studio is redeployed** —
     * `bash scripts/deploy-studio.sh`, from merged code. Until then the hosted Studio is
     * still serving the schema without this rule, and the whole fix is inert for the
     * people it is for.
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
          // `undefined` passes to `required()` rather than being reported twice: two
          // errors on one field for one problem reads as two problems.
          .custom((v) =>
            v === false
              ? 'This testimonial has no written consent on file, so the site will never show it. Tick the box once you hold the permission, or leave this as a draft.'
              : true,
          ),
    }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
  preview: { select: { title: 'attribution', subtitle: 'descriptor' } },
})

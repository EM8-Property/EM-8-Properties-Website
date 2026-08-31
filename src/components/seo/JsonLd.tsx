/**
 * Renders a JSON-LD block.
 *
 * `<` is escaped rather than emitted raw. The payload carries CMS values — an article
 * headline, an excerpt, the contact email — and a literal `</script>` inside any of them
 * would close this tag early and put the remainder of the document's own JSON into the
 * page as markup. Editors are trusted, but this is a one-character defence against a
 * paste from anywhere, and `JSON.stringify` does not escape `<` on its own.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

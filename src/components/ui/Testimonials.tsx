export type Testimonial = {
  _id: string
  quote?: string | null
  attribution?: string | null
  descriptor?: string | null
  investorSince?: number | null
}

/**
 * Removes one matched pair of quotation marks wrapping the whole string.
 *
 * People type quotation marks when they paste a quotation — the component adds its own
 * typographic pair, so the two combined rendered as ""like this"". Only a matched pair
 * around the entire string is removed: a quotation *inside* the sentence belongs to the
 * speaker and is left exactly as written.
 */
export function stripOuterQuotes(quote?: string | null): string {
  const text = (quote ?? '').trim()
  const pairs: [string, string][] = [
    ['"', '"'],
    ['“', '”'],
    ['‘', '’'],
    ["'", "'"],
  ]
  for (const [open, close] of pairs) {
    if (text.length > 1 && text.startsWith(open) && text.endsWith(close)) {
      return text.slice(1, -1).trim()
    }
  }
  return text
}

/**
 * Attributed LP testimonials, which replaced the Buffett quote permanently: a borrowed
 * quote from someone with no relationship to the firm reads thin next to a real investor
 * saying something specific.
 *
 * Consent is enforced upstream — TESTIMONIALS_QUERY filters on `consentOnRecord` — so
 * anything reaching this component is cleared for publication.
 *
 * No card fill. These previously sat as white cards, which on the homepage's #F5F5F3
 * panel is roughly 1.04:1 between the two surfaces with a single hairline between them —
 * they barely read as cards — and on /investors, which has no panel, white on white read
 * as nothing at all. An accent start-rule carries the same job on either ground, and it is
 * the language the four success factors already use. A quote does not need a box.
 *
 * Keyed by `_id` rather than attribution: two investors can share a descriptor, and keying
 * on the visible text would drop one of them.
 */
export function Testimonials({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null

  return (
    <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t) => (
        // border-s, not border-l: this accent rule flips side in Hebrew.
        <figure key={t._id} className="border-s-2 border-teal ps-5">
          <blockquote className="text-sm leading-relaxed text-ink">
            &ldquo;{stripOuterQuotes(t.quote)}&rdquo;
          </blockquote>
          <figcaption className="mt-3">
            <span className="text-xs font-semibold text-ink">{t.attribution}</span>
            {t.descriptor && (
              <span className="block text-[10px] uppercase tracking-[0.15em] text-teal-text">
                {t.descriptor}
              </span>
            )}
            {t.investorSince && (
              <span className="block text-[10px] text-ink-secondary">
                Investor since {t.investorSince}
              </span>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

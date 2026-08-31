export type Testimonial = {
  _id: string
  quote?: string | null
  attribution?: string | null
  descriptor?: string | null
  investorSince?: number | null
}

/**
 * Attributed LP testimonials, which replaced the Buffett quote permanently: a borrowed
 * quote from someone with no relationship to the firm reads thin next to a real investor
 * saying something specific.
 *
 * Consent is enforced upstream — TESTIMONIALS_QUERY filters on `consentOnRecord` — so
 * anything reaching this component is cleared for publication.
 *
 * Keyed by `_id` rather than attribution: two investors can share a descriptor, and
 * keying on the visible text would drop one of them.
 */
export function Testimonials({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t) => (
        <figure key={t._id} className="rounded-card border border-rule bg-ground p-6">
          <blockquote className="text-sm leading-relaxed text-ink">
            &ldquo;{t.quote}&rdquo;
          </blockquote>
          <figcaption className="mt-4 border-t border-rule pt-3">
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

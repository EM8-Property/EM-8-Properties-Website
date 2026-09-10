import { SectionHeading } from '@/components/ui/SectionHeading'
import { PropertyCard, type PropertyCardData } from '@/components/property/PropertyCard'

export type OfferingsHeadingData = {
  eyebrow?: string | null
  title?: string | null
  intro?: string | null
}

/**
 * The current-opportunity module spec §4 names, extracted from the homepage band it moved
 * out of in PR 3 -- offerings now live on /portfolio, above the filter row, as their own
 * section rather than a closing band on the homepage.
 *
 * `offerings` is expected to already be filtered by CURRENT_OFFERINGS_QUERY on
 * `publiclyOffered`, which is the Rule 506(c) gate -- an offering not filed under that
 * exemption may not be generally solicited, so it must never appear on a public page by
 * default. The filter is the enforcement, not a convenience.
 *
 * Renders nothing for either of two independent reasons:
 *  - `offerings` is empty. Spec §6: a section with nothing in it renders nothing -- no
 *    heading, no empty grid, no wrapper. Today exactly one property is publicly offered,
 *    and this must hold none the day that one closes.
 *  - `heading` has no `title`. GROQ projects `heading { eyebrow, title, intro }` into a
 *    truthy object even when every field inside is null, so checking the object itself
 *    would let a half-filled heading through and render an empty heading -- the same trap
 *    documented in `src/app/(site)/portfolio/page.tsx`. Checking the `title` leaf instead
 *    is what a titleless section here refuses to ship.
 *
 * Owns its own measure wrapper (`mx-auto max-w-[1200px] px-6 pt-14`), the same way
 * `PortfolioFilter`'s content sits inside one -- so the caller renders this component
 * unconditionally and never re-derives the emptiness check above at the call site. A
 * wrapper div with nothing inside it would still occupy its `pt-14` padding, so the null
 * returns above cover the wrapper too, not just its contents.
 */
export function CurrentOfferings({
  heading,
  offerings,
}: {
  heading?: OfferingsHeadingData | null
  offerings: PropertyCardData[]
}) {
  if (offerings.length === 0) return null
  if (!heading?.title) return null

  return (
    <div className="mx-auto max-w-[1200px] px-6 pt-14">
      <SectionHeading {...heading} />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {offerings.map((o) => (
          <PropertyCard key={o.slug} property={o} />
        ))}
      </div>
    </div>
  )
}

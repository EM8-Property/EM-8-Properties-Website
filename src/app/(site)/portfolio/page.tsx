import type { Metadata } from 'next'
import { seoMetadata } from '@/lib/pageSeo'
import { fetchSanity } from '@/sanity/client'
import { ALL_PROPERTIES_QUERY, PORTFOLIO_PAGE_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type { ALL_PROPERTIES_QUERY_RESULT, PORTFOLIO_PAGE_QUERY_RESULT, SITE_SETTINGS_QUERY_RESULT } from '@/sanity/types.generated'
import { PortfolioFilter } from '@/components/property/PortfolioFilter'
import type { PropertyCardData } from '@/components/property/PropertyCard'
import { CtaBand } from '@/components/ui/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import type { CarouselSlide } from '@/components/layout/HeroCarousel'

export async function generateMetadata(): Promise<Metadata> {
  const [copy, settings] = await Promise.all([
    fetchSanity<PORTFOLIO_PAGE_QUERY_RESULT>(PORTFOLIO_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])
  return seoMetadata({
    seo: copy?.seo,
    path: '/portfolio',
    documentName: 'portfolioPage',
    shareImage: settings?.defaultShareImage,
  })
}

export default async function PortfolioPage() {
  const [properties, settings, copy] = await Promise.all([
    fetchSanity<ALL_PROPERTIES_QUERY_RESULT>(ALL_PROPERTIES_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
    fetchSanity<PORTFOLIO_PAGE_QUERY_RESULT>(PORTFOLIO_PAGE_QUERY),
  ])

  // The same rule as every other page: missing required content fails the build loudly
  // rather than rendering a page with no title. Sanity's own `required()` is Studio-side
  // only — it greys out Publish and gates nothing else — so this throw is the guard that
  // actually holds.
  if (!copy?.heading) {
    throw new Error(
      'The portfolioPage document is missing or has no heading. Create it in the Studio ' +
        'under Portfolio page.',
    )
  }

  return (
    <div>
      {/*
        The headline deliberately carries no asset count — spec §9 forbids shipping
        invented figures, and a hardcoded "Ten assets" would drift the moment a property is
        added or sold in the Studio. It is the editor's job to keep that true now, which is
        rather the point of the copy living in the CMS.
      */}
      <PageHero
        copy={copy.heading}
        slides={(settings?.heroCarousel ?? []) as CarouselSlide[]}
      />
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <PortfolioFilter properties={properties as PropertyCardData[]} />
      </div>
      {/*
        A sibling of the measure, never inside it. `Band` owns its own ground and measure,
        so nesting it in another `max-w-[1200px] px-6` container would stop its panel and
        rules short of the viewport and double the horizontal padding. The same is true of
        `PageHero` above, for the same reason.
      */}
      <CtaBand bookACallUrl={settings?.bookACallUrl} copy={settings?.ctaBand} />
    </div>
  )
}

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
  const [properties, settings] = await Promise.all([
    fetchSanity<ALL_PROPERTIES_QUERY_RESULT>(ALL_PROPERTIES_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])

  return (
    <div>
      {/*
        The headline deliberately carries no asset count. Spec §9 forbids shipping
        invented figures, and a hardcoded "Ten assets" would drift the moment a property
        is added or sold in the Studio.

        These words are still literals. This page, /insights and /track-record hold only
        `seo` in Sanity — moving their headings into the CMS is tracked separately, because
        bundling a copy migration into a layout change would make both harder to verify.
        The words are reproduced here exactly as they shipped.
      */}
      <PageHero
        copy={{
          eyebrow: 'Portfolio',
          title: 'Assets across the Chicago MSA',
          intro:
            'Value-add renovations, ground-up development, and stabilized operations. We manage all of it ourselves.',
        }}
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

import type { Metadata } from 'next'
import { seoMetadata } from '@/lib/pageSeo'
import { fetchSanity } from '@/sanity/client'
import { ALL_PROPERTIES_QUERY, PORTFOLIO_PAGE_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type { ALL_PROPERTIES_QUERY_RESULT, PORTFOLIO_PAGE_QUERY_RESULT, SITE_SETTINGS_QUERY_RESULT } from '@/sanity/types.generated'
import { PortfolioFilter } from '@/components/property/PortfolioFilter'
import type { PropertyCardData } from '@/components/property/PropertyCard'
import { CtaBand } from '@/components/ui/CtaBand'
import { SectionHeading } from '@/components/ui/SectionHeading'

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
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      {/*
        The headline deliberately carries no asset count. Spec §9 forbids shipping
        invented figures, and a hardcoded "Ten assets" would drift the moment a property
        is added or sold in the Studio.
      */}
      <SectionHeading
        eyebrow="Portfolio"
        title="Assets across the Chicago MSA"
        intro="Value-add renovations, ground-up development, and stabilized operations. We manage all of it ourselves."
        level={1}
      />
      <div className="mt-8">
        <PortfolioFilter properties={properties as PropertyCardData[]} />
      </div>
      <CtaBand bookACallUrl={settings?.bookACallUrl} copy={settings?.ctaBand} />
    </div>
  )
}

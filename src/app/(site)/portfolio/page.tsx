import type { Metadata } from 'next'
import { fetchSanity } from '@/sanity/client'
import { ALL_PROPERTIES_QUERY } from '@/sanity/queries'
import type { ALL_PROPERTIES_QUERY_RESULT } from '@/sanity/types.generated'
import { PortfolioFilter } from '@/components/property/PortfolioFilter'
import type { PropertyCardData } from '@/components/property/PropertyCard'
import { SectionHeading } from '@/components/ui/SectionHeading'

export const metadata: Metadata = {
  title: 'Portfolio | EM8 Properties',
  description:
    'Multifamily and mixed-use assets across the Chicago MSA and southern Wisconsin.',
}

export default async function PortfolioPage() {
  const properties = await fetchSanity<ALL_PROPERTIES_QUERY_RESULT>(ALL_PROPERTIES_QUERY)

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
      />
      <div className="mt-8">
        <PortfolioFilter properties={properties as PropertyCardData[]} />
      </div>
    </div>
  )
}

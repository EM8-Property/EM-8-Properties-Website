import type { Metadata } from 'next'
import { seoMetadata } from '@/lib/pageSeo'
import { fetchSanity } from '@/sanity/client'
import { ALL_POSTS_QUERY, INSIGHTS_PAGE_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type { ALL_POSTS_QUERY_RESULT, INSIGHTS_PAGE_QUERY_RESULT, SITE_SETTINGS_QUERY_RESULT } from '@/sanity/types.generated'
import { InsightsFilter } from '@/components/insights/InsightsFilter'
import type { PostData } from '@/components/insights/PostCard'
import { CtaBand } from '@/components/ui/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import type { CarouselSlide } from '@/components/layout/HeroCarousel'

export async function generateMetadata(): Promise<Metadata> {
  const [copy, settings] = await Promise.all([
    fetchSanity<INSIGHTS_PAGE_QUERY_RESULT>(INSIGHTS_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])
  return seoMetadata({
    seo: copy?.seo,
    path: '/insights',
    documentName: 'insightsPage',
    shareImage: settings?.defaultShareImage,
  })
}

export default async function InsightsPage() {
  const [posts, settings, copy] = await Promise.all([
    fetchSanity<ALL_POSTS_QUERY_RESULT>(ALL_POSTS_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
    fetchSanity<INSIGHTS_PAGE_QUERY_RESULT>(INSIGHTS_PAGE_QUERY),
  ])

  // Missing required content fails the build loudly rather than rendering a titleless
  // page. Sanity's `required()` is Studio-side only, so this throw is the real guard.
  if (!copy?.heading) {
    throw new Error(
      'The insightsPage document is missing or has no heading. Create it in the Studio ' +
        'under Insights page.',
    )
  }

  return (
    <div>
      <PageHero
        copy={copy.heading}
        slides={(settings?.heroCarousel ?? []) as CarouselSlide[]}
      />
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <InsightsFilter posts={posts as PostData[]} />
      </div>
      {/*
        A sibling of the measure, never inside it. `Band` owns its own ground and measure —
        that is its documented contract — so nesting it in another `max-w-[1200px] px-6`
        container would stop its panel and its rules 24px short of the viewport, double the
        horizontal padding, and leave this page's closing block looking nothing like the
        one on the homepage. `PageHero` above is a sibling for the same reason.
      */}
      <CtaBand bookACallUrl={settings?.bookACallUrl} copy={settings?.ctaBand} />
    </div>
  )
}

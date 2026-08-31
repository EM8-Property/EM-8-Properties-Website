import { pageMetadata } from '@/lib/seo'
import { fetchSanity } from '@/sanity/client'
import { ALL_POSTS_QUERY } from '@/sanity/queries'
import type { ALL_POSTS_QUERY_RESULT } from '@/sanity/types.generated'
import { InsightsFilter } from '@/components/insights/InsightsFilter'
import type { PostData } from '@/components/insights/PostCard'
import { SectionHeading } from '@/components/ui/SectionHeading'

export const metadata = pageMetadata({
  title: 'Insights',
  description:
    'Notes on transit-oriented development, municipal partnership, and operating suburban multifamily.',
  path: '/insights',
})

export default async function InsightsPage() {
  const posts = await fetchSanity<ALL_POSTS_QUERY_RESULT>(ALL_POSTS_QUERY)

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      <SectionHeading
        eyebrow="Insights"
        title="What we've learned building next to the tracks"
        intro="Notes on transit-oriented development, municipal partnership, and operating suburban multifamily in the Chicago MSA."
        level={1}
      />
      <div className="mt-8">
        <InsightsFilter posts={posts as PostData[]} />
      </div>
    </div>
  )
}

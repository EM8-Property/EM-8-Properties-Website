import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { fetchSanity } from '@/sanity/client'
import { SOLD_PROPERTIES_QUERY, HERO_STATS_QUERY } from '@/sanity/queries'
import type {
  SOLD_PROPERTIES_QUERY_RESULT,
  HERO_STATS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { urlForImage } from '@/sanity/image'
import { formatUnits } from '@/lib/format'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { StatBand } from '@/components/ui/StatBand'
import { DealStory } from '@/components/property/DealStory'
import { Chip } from '@/components/ui/Chip'

export const metadata: Metadata = {
  title: 'Track Record | EM8 Properties',
  description:
    'Realized results across the Chicago MSA: what we paid, what we did, what we exited at.',
}

/**
 * A view over sold properties. It creates no URLs of its own: every card links back to
 * the canonical /portfolio/[slug]. A realized deal living at two addresses would split
 * its search ranking and double the editing surface.
 */
export default async function TrackRecordPage() {
  const [sold, stats] = await Promise.all([
    fetchSanity<SOLD_PROPERTIES_QUERY_RESULT>(SOLD_PROPERTIES_QUERY),
    fetchSanity<HERO_STATS_QUERY_RESULT>(HERO_STATS_QUERY),
  ])

  return (
    <div>
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <SectionHeading
          eyebrow="Track Record"
          title="Realized results, not projections"
          intro="Every deal we've taken full cycle, with what we paid, what we did, and what we exited at."
        />
      </div>

      {stats.length > 0 && (
        <StatBand
          stats={stats
            .slice(0, 4)
            .map((s) => ({ figure: s.figure ?? '', label: s.label ?? '' }))}
        />
      )}

      <div className="mx-auto max-w-[1200px] space-y-5 px-6 py-12">
        {sold.length === 0 && (
          <p className="py-12 text-center text-sm text-ink-secondary">
            Realized deals will appear here as they close.
          </p>
        )}
        {sold.map((p) => (
          // The two-column grid is applied only when there is an image to fill the first
          // column. Applied unconditionally, a property with no gallery put its entire
          // deal story into the narrow 0.85fr column and left the wide one empty —
          // which is exactly the state every property is in before photography lands.
          <div
            key={p.slug}
            className={`overflow-hidden rounded-card border border-rule ${
              p.image ? 'sm:grid sm:grid-cols-[0.85fr_2fr]' : ''
            }`}
          >
            {p.image && (
              <Image
                src={urlForImage(p.image).width(600).height(400).url()}
                alt={p.title ?? ''}
                width={600}
                height={400}
                className="h-full w-full object-cover"
              />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <Link
                    href={`/portfolio/${p.slug}`}
                    className="font-display text-base font-medium uppercase tracking-wide text-ink hover:text-teal-text"
                  >
                    {p.title}
                  </Link>
                  <p className="mt-1 text-[11px] font-medium text-ink-secondary">
                    {p.city}, {p.state}
                    {formatUnits(p.unitCount, p.retailUnitCount) ? ` · ${formatUnits(p.unitCount, p.retailUnitCount)}` : ''}
                  </p>
                </div>
                <Chip kind="sold" />
              </div>
              {p.dealStory && <DealStory story={p.dealStory} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

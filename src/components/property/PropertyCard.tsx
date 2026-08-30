import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { urlForImage } from '@/sanity/image'
import { formatWalk, formatUnits } from '@/lib/format'

export type PropertyCardData = {
  title: string
  slug: string
  assetClass: string
  status: string
  city: string
  state: string
  unitCount?: number | null
  retailUnitCount?: number | null
  cardBlurb?: string | null
  walkMinutes?: number | null
  metraStation?: string | null
  image?: unknown
}

export function PropertyCard({ property: p }: { property: PropertyCardData }) {
  const walk = formatWalk(p.walkMinutes ?? undefined, p.metraStation ?? undefined)
  const units = formatUnits(p.unitCount, p.retailUnitCount)
  return (
    <Card>
      {/* Always /portfolio/[slug], whatever the status. A sold asset is shown on
          /track-record but never given a second URL there. */}
      <Link href={`/portfolio/${p.slug}`} className="block">
        {p.image ? (
          <Image
            src={urlForImage(p.image).width(800).height(500).url()}
            alt={p.title}
            width={800}
            height={500}
            className="h-32 w-full object-cover"
          />
        ) : (
          <div className="h-32 w-full bg-panel" />
        )}
        <div className="p-4">
          <div className="flex gap-2">
            <Chip kind={p.assetClass} />
            {p.status === 'sold' && <Chip kind="sold" />}
          </div>
          <h3 className="mt-2 font-display text-sm font-medium uppercase tracking-wide text-ink">
            {p.title}
          </h3>
          <p className="mt-1 text-[11px] font-medium text-ink-secondary">
            {p.city}, {p.state}
            {units ? ` · ${units}` : ''}
          </p>
          {walk && (
            <p className="mt-2 inline-block rounded-chip bg-teal/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-teal-text">
              {walk}
            </p>
          )}
        </div>
      </Link>
    </Card>
  )
}

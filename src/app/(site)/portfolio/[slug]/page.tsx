import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { PortableText } from 'next-sanity'
import { fetchSanity } from '@/sanity/client'
import { PROPERTY_BY_SLUG_QUERY, PROPERTY_SLUGS_QUERY } from '@/sanity/queries'
import type {
  PROPERTY_BY_SLUG_QUERY_RESULT,
  PROPERTY_SLUGS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { urlForImage } from '@/sanity/image'
import { SHARE_CARD, SHARE_CARD_PATH } from '@/lib/seo'
import { FactRail } from '@/components/property/FactRail'
import { PropertyMap } from '@/components/property/PropertyMap'
import { Chip } from '@/components/ui/Chip'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { OfferingBlock } from '@/components/property/OfferingBlock'
import { CtaBand } from '@/components/ui/CtaBand'
import { SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type { SITE_SETTINGS_QUERY_RESULT } from '@/sanity/types.generated'

export async function generateStaticParams() {
  const slugs = await fetchSanity<PROPERTY_SLUGS_QUERY_RESULT>(PROPERTY_SLUGS_QUERY)
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = await fetchSanity<PROPERTY_BY_SLUG_QUERY_RESULT>(PROPERTY_BY_SLUG_QUERY, { slug })
  if (!p) return {}
  return {
    title: `${p.title} | EM8 Properties`,
    description: p.cardBlurb ?? undefined,
    // The canonical URL for this asset whatever its status — non-negotiable #4. It was
    // enforced architecturally (one route per property) but never declared to a crawler.
    alternates: { canonical: `/portfolio/${slug}` },
    openGraph: {
      title: `${p.title} | EM8 Properties`,
      description: p.cardBlurb ?? undefined,
      // Falls back to the generated card rather than to nothing. This was `images: []`
      // when a property had no photograph, and an empty array is not a fallback — it is
      // an explicit "no image", so the page advertised no card at all. Measured on the
      // build: /portfolio/antioch-shopping-plaza, the only live offering and the one
      // property with an empty gallery, was serving `twitter:card = summary` with no
      // image, which is the small variant LinkedIn renders as a bare link.
      images: [p.image ? urlForImage(p.image).width(1200).height(630).url() : SHARE_CARD],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${p.title} | EM8 Properties`,
      description: p.cardBlurb ?? undefined,
      images: [
        p.image ? urlForImage(p.image).width(1200).height(630).url() : SHARE_CARD_PATH,
      ],
    },
  }
}

/** The canonical URL for an asset, whatever its status. /track-record links back here. */
export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [p, settings] = await Promise.all([
    fetchSanity<PROPERTY_BY_SLUG_QUERY_RESULT>(PROPERTY_BY_SLUG_QUERY, { slug }),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])
  if (!p) notFound()

  const hero = p.gallery?.[0]

  return (
    <article>
      {hero && (
        <Image
          src={urlForImage(hero).width(1800).height(700).url()}
          alt={hero.alt ?? p.title ?? ''}
          width={1800}
          height={700}
          priority
          className="h-[340px] w-full object-cover"
        />
      )}
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-10 lg:grid-cols-[1.45fr_1fr]">
        <div>
          <div className="flex gap-2">
            {p.assetClass && <Chip kind={p.assetClass} />}
            {p.status && <Chip kind={p.status} />}
          </div>
          <h1 className="mt-3 font-display text-3xl font-medium uppercase tracking-wide text-ink">
            {p.title}
          </h1>
          <p className="mt-1 text-sm font-medium text-ink-secondary">
            {p.city}, {p.state}
          </p>

          {p.overview && (
            <div className="mt-5 text-sm leading-relaxed text-ink-secondary">
              <PortableText value={p.overview} />
            </div>
          )}

          {p.businessPlan && (
            <>
              <h2 className="mt-8 text-lg font-bold tracking-tight text-ink">
                The business plan
              </h2>
              <div className="mt-2 text-sm leading-relaxed text-ink-secondary">
                <PortableText value={p.businessPlan} />
              </div>
            </>
          )}

          <OfferingBlock offering={p.offering} publiclyOffered={p.publiclyOffered} />

          {/*
            Both coordinates are checked explicitly. Sanity types a geopoint's lat and lng
            as optional, so a partially-filled point would otherwise reach Leaflet as
            `undefined` and throw at runtime rather than simply omitting the map.
          */}
          {p.coordinates?.lat != null && p.coordinates?.lng != null && (
            <>
              <h2 className="mt-8 text-lg font-bold tracking-tight text-ink">Location</h2>
              <div className="mt-3">
                <PropertyMap
                  lat={p.coordinates.lat}
                  lng={p.coordinates.lng}
                  title={p.title ?? 'This property'}
                />
              </div>
            </>
          )}
        </div>

        <div>
          <FactRail property={p} />
          {p.relatedPosts && p.relatedPosts.length > 0 && (
            <div className="mt-4 rounded-card border border-rule bg-panel p-4">
              <Eyebrow>Written about this property</Eyebrow>
              <ul className="mt-3 space-y-2">
                {p.relatedPosts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={`/insights/${post.slug}`}
                      className="text-xs font-semibold text-ink hover:text-teal-text"
                    >
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/*
        Property pages previously carried no outbound link at all — the only anchor on one
        was Leaflet’s attribution — despite being the likeliest arrival point from search
        and LinkedIn.
      */}
      <CtaBand bookACallUrl={settings?.bookACallUrl} />
    </article>
  )
}

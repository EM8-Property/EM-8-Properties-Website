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
import { pageMetadata, SHARE_CARD, SITE_NAME, type ShareImage } from '@/lib/seo'
import { DealStory } from '@/components/property/DealStory'
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

  // Falls back to the generated card rather than to nothing. This was `images: []` when a
  // property had no photograph, and an empty array is not a fallback — it is an explicit
  // "no image", so the page advertised no card at all. Measured on the build:
  // /portfolio/antioch-shopping-plaza, the only live offering and the one property with an
  // empty gallery, was serving `twitter:card = summary`, the small variant that renders as
  // a bare link.
  //
  // The descriptor carries width/height/alt, which the bare URL string did not, so a
  // property with real photography now declares its dimensions like every other page.
  const image: ShareImage = p.image
    ? {
        url: urlForImage(p.image).width(SHARE_CARD.width).height(SHARE_CARD.height).url(),
        width: SHARE_CARD.width,
        height: SHARE_CARD.height,
        alt: p.title ?? SITE_NAME,
      }
    : SHARE_CARD

  // Composed from the shared helper rather than restating a subset of it. Hand-rolling
  // this block is how the two routes that exist to be shared ended up without `og:url`
  // and `og:site_name` — `og:url` is the field the social graph uses as the *identity* of
  // a shared object, so without it a share carrying ?utm_source=… is keyed separately
  // from the clean URL and the reactions split across two objects. That is the same
  // problem the canonical solves for Google.
  return pageMetadata({
    title: p.title ?? '',
    description: p.cardBlurb ?? '',
    path: `/portfolio/${slug}`,
    image,
  })
}

/**
 * The canonical URL for an asset, whatever its status — and, since /track-record was
 * deleted, the only place a realized deal's figures appear. Non-negotiable #4.
 */
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

          {/*
            The realized arc, which lived on /track-record until that route was deleted.
            That page was the only consumer of `dealStory` — this query already selected
            the field and this page never rendered it — so moving it here is what made
            deleting the route a route deletion rather than a content deletion. Spec §8.

            Gated on the deal being closed, and that gate is compliance rather than
            styling: these labels say "Realized", so showing them for a property that has
            not exited would describe an open position as a completed result, on the same
            page where OfferingBlock labels every figure as targeted. `dealStory` is
            checked too, or a sold property whose narrative is unwritten renders an empty
            three-column grid.

            Above OfferingBlock rather than below it because the two are mutually
            exclusive in practice — `publiclyOffered` and `status == 'sold'` do not
            co-occur — and this order reads chronologically if they ever did.
          */}
          {p.status === 'sold' && p.dealStory && (
            <>
              {/*
                The heading is CMS copy and the figures are not conditional on it. The
                field is optional, so an editor can clear it in one keystroke — and that
                is how these figures looked on /track-record, which carried no heading
                above them. Clearing the words must not take the multiple with them.
              */}
              {settings?.dealStoryHeading && (
                <h2 className="mt-8 text-lg font-bold tracking-tight text-ink">
                  {settings.dealStoryHeading}
                </h2>
              )}
              <DealStory story={p.dealStory} />
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
      <CtaBand bookACallUrl={settings?.bookACallUrl} copy={settings?.ctaBand} />
    </article>
  )
}

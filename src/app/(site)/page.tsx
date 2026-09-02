import { fetchSanity } from '@/sanity/client'
import {
  HERO_STATS_QUERY,
  FOCUS_CARDS_QUERY,
  ALL_POSTS_QUERY,
  ALL_PROPERTIES_QUERY,
  TESTIMONIALS_QUERY,
  CURRENT_OFFERINGS_QUERY,
  SITE_SETTINGS_QUERY,
  HOME_PAGE_QUERY,
} from '@/sanity/queries'
import type {
  HERO_STATS_QUERY_RESULT,
  FOCUS_CARDS_QUERY_RESULT,
  ALL_POSTS_QUERY_RESULT,
  ALL_PROPERTIES_QUERY_RESULT,
  TESTIMONIALS_QUERY_RESULT,
  CURRENT_OFFERINGS_QUERY_RESULT,
  SITE_SETTINGS_QUERY_RESULT,
  HOME_PAGE_QUERY_RESULT,
} from '@/sanity/types.generated'
import { PageHero } from '@/components/layout/PageHero'
import type { CarouselSlide } from '@/components/layout/HeroCarousel'
import { StatBand } from '@/components/ui/StatBand'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { PropertyCard, type PropertyCardData } from '@/components/property/PropertyCard'
import { PostCard, type PostData } from '@/components/insights/PostCard'
import { Testimonials } from '@/components/ui/Testimonials'
import { CtaBand } from '@/components/ui/CtaBand'
import { Band, alternatingTones } from '@/components/ui/Band'
import { InvestorPopup } from '@/components/home/InvestorPopup'
import type { Metadata } from 'next'
import { seoMetadata } from '@/lib/pageSeo'

/**
 * The homepage carried no metadata of its own, inheriting only the root layout's title
 * and description — which means no Open Graph block and no canonical on the one URL
 * everything else links to.
 *
 * If an editor sets the homepage title to the site name, `pageTitle` returns it once
 * rather than "EM8 Properties | EM8 Properties".
 */
export async function generateMetadata(): Promise<Metadata> {
  const [copy, settings] = await Promise.all([
    fetchSanity<HOME_PAGE_QUERY_RESULT>(HOME_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])
  return seoMetadata({
    seo: copy?.seo,
    path: '/',
    documentName: 'homePage',
    shareImage: settings?.defaultShareImage,
  })
}

/** Narrative scroll: hero → stats → success factors → insights → portfolio → partners. */
export default async function HomePage() {
  const [stats, factors, posts, properties, testimonials, offerings, settings, copy] =
    await Promise.all([
    fetchSanity<HERO_STATS_QUERY_RESULT>(HERO_STATS_QUERY),
    fetchSanity<FOCUS_CARDS_QUERY_RESULT>(FOCUS_CARDS_QUERY),
    fetchSanity<ALL_POSTS_QUERY_RESULT>(ALL_POSTS_QUERY),
    fetchSanity<ALL_PROPERTIES_QUERY_RESULT>(ALL_PROPERTIES_QUERY),
    fetchSanity<TESTIMONIALS_QUERY_RESULT>(TESTIMONIALS_QUERY),
    fetchSanity<CURRENT_OFFERINGS_QUERY_RESULT>(CURRENT_OFFERINGS_QUERY),
      fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
      fetchSanity<HOME_PAGE_QUERY_RESULT>(HOME_PAGE_QUERY),
    ])

  // Same rule as siteSettings: missing required content fails the build loudly rather than
  // rendering a page with no headline. Silent fallback copy is the failure mode the old
  // site's constants.ts created, and the reason this project forbids it.
  if (!copy?.hero) {
    throw new Error(
      'The homePage document is missing or has no hero. Create it in the Studio under ' +
        'Home page.',
    )
  }

  // Only the sections with something to show. Order is the narrative order spec §3 sets:
  // factors → insights → portfolio → testimonials → open offerings → partners.
  const bands = [
    factors.length > 0 && {
      key: 'factors',
      content: (
        <>
          <SectionHeading {...copy.factorsHeading!} />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {factors.map((f) => (
              // border-s, not border-l: this accent rule flips side in Hebrew.
              <div key={f._id} className="border-s-2 border-teal ps-4">
                <h3 className="text-sm font-semibold tracking-tight text-ink">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </>
      ),
    },
    posts.length > 0 && {
      key: 'insights',
      content: (
        <>
          <SectionHeading {...copy.insightsHeading!} />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 3).map((p) => (
              <PostCard key={p.slug} post={p as PostData} />
            ))}
          </div>
        </>
      ),
    },
    properties.length > 0 && {
      key: 'portfolio',
      content: (
        <>
          {/* No asset count in the headline — it would drift the moment a property is
              added or sold in the Studio. */}
          <SectionHeading {...copy.portfolioHeading!} />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.slice(0, 3).map((p) => (
              <PropertyCard key={p.slug} property={p as PropertyCardData} />
            ))}
          </div>
          <div className="mt-6">
            <Button href={copy.portfolioCta!.href!} variant="secondary">
              {copy.portfolioCta!.label}
            </Button>
          </div>
        </>
      ),
    },
    testimonials.length > 0 && {
      key: 'testimonials',
      content: (
        <>
          <SectionHeading {...copy.testimonialsHeading!} />
          <div className="mt-6">
            <Testimonials items={testimonials.slice(0, 3)} />
          </div>
        </>
      ),
    },
    offerings.length > 0 && {
      key: 'offerings',
      content: (
        <>
          {/*
            The current-opportunity module spec §4 names. CURRENT_OFFERINGS_QUERY filters
            on publiclyOffered, which is the Rule 506(c) gate — an offering not filed under
            that exemption may not be generally solicited, so it must never appear here by
            default.
          */}
          <SectionHeading {...copy.offeringsHeading!} />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offerings.map((o) => (
              <PropertyCard key={o.slug} property={o as PropertyCardData} />
            ))}
          </div>
        </>
      ),
    },
    {
      // Spec §3 closes the narrative with partners and then the call to action. Brokers,
      // municipalities and land sellers are an audience spec §3 calls out as served by
      // nothing on the old site.
      key: 'partners',
      content: (
        <>
          <SectionHeading {...copy.partnersTeaser!} />
          <div className="mt-6">
            <Button href={copy.partnersTeaserCta!.href!} variant="secondary">
              {copy.partnersTeaserCta!.label}
            </Button>
          </div>
        </>
      ),
    },
  ].filter(Boolean) as { key: string; content: React.ReactNode }[]

  // The closing call to action is part of the same sequence, so it cannot land on the
  // same ground as whatever section precedes it.
  const tones = alternatingTones(bands.length + 1)

  return (
    <>
      {/*
        The photograph fills the first screen — edge to edge and the full height of the
        viewport — with the headline on it and the header over the top of it. Every
        section page opens this way now; this one is no longer the exception it was while
        its hero was capped at the content column.

        The height came back last, and the earlier version of this comment said it never
        would. What that was guarding against is a different layout: the band this grew
        out of filled the viewport with the heading rendered *underneath* it, so the first
        screen was a photograph and nothing else. The heading has sat ON the photograph
        since the full-bleed change, so the first screen carries EM8's proposition at any
        height, and the stat band below it is now reached by scrolling rather than by
        having a tall enough monitor.
      */}
      <PageHero
        copy={copy.hero}
        slides={(settings?.heroCarousel ?? []) as CarouselSlide[]}
      />

      {stats.length > 0 && (
        <StatBand
          stats={stats
            .slice(0, 5)
            .map((s) => ({ figure: s.figure ?? '', label: s.label ?? '' }))}
        />
      )}

      {/*
        Bands, not hand-painted sections.

        Every section here is conditional, so hardcoding a ground on each one only holds
        for whichever combination happened to exist when it was written. Publishing the
        first two testimonials put "What our partners say" directly above "Currently
        accepting commitments" — both panelled, 782px of unbroken grey with a hairline
        between them. Deriving the tones from what actually renders means that cannot
        happen again for a combination nobody tried.
      */}
      {bands.map((band, i) => (
        <Band key={band.key} tone={tones[i]!}>
          {band.content}
        </Band>
      ))}

      <CtaBand
        bookACallUrl={settings?.bookACallUrl}
        copy={settings?.ctaBand}
        tone={tones[bands.length]!}
      />

      {/*
        Homepage only, and once per visitor. It waits before appearing, asks for a name and
        an email and nothing else, and a dismissal is remembered — an overlay that returns
        every visit trains people to close it unread, which costs more than it captures.
      */}
      <InvestorPopup copy={copy.popup} />
    </>
  )
}

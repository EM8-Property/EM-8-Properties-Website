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
import { HomeHero } from '@/components/home/HomeHero'
import { StatBand } from '@/components/ui/StatBand'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { PropertyCard, type PropertyCardData } from '@/components/property/PropertyCard'
import { PostCard, type PostData } from '@/components/insights/PostCard'
import { Testimonials } from '@/components/ui/Testimonials'
import { CtaBand } from '@/components/ui/CtaBand'
import { InvestorPopup } from '@/components/home/InvestorPopup'

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

  return (
    <>
      <HomeHero hero={copy.hero} />

      {stats.length > 0 && (
        <StatBand
          stats={stats
            .slice(0, 5)
            .map((s) => ({ figure: s.figure ?? '', label: s.label ?? '' }))}
        />
      )}

      {factors.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-6 py-14">
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
        </section>
      )}

      {posts.length > 0 && (
        <section className="border-y border-rule bg-panel">
          <div className="mx-auto max-w-[1200px] px-6 py-14">
            <SectionHeading {...copy.insightsHeading!} />
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.slice(0, 3).map((p) => (
                <PostCard key={p.slug} post={p as PostData} />
              ))}
            </div>
          </div>
        </section>
      )}

      {properties.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-6 py-14">
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
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="border-t border-rule bg-panel">
          <div className="mx-auto max-w-[1200px] px-6 py-14">
            <SectionHeading {...copy.testimonialsHeading!} />
            <div className="mt-6">
              <Testimonials items={testimonials.slice(0, 3)} />
            </div>
          </div>
        </section>
      )}
      {offerings.length > 0 && (
        <section className="border-t border-rule bg-panel">
          <div className="mx-auto max-w-[1200px] px-6 py-14">
            {/*
              The current-opportunity module spec §4 names. CURRENT_OFFERINGS_QUERY
              filters on publiclyOffered, which is the Rule 506(c) gate — an offering not
              filed under that exemption may not be generally solicited, so it must never
              appear here by default.
            */}
            <SectionHeading {...copy.offeringsHeading!} />
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {offerings.map((o) => (
                <PropertyCard key={o.slug} property={o as PropertyCardData} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/*
        Spec §3 ends the homepage narrative with partners and then a call to action.
        Neither was built: the page previously stopped after the portfolio grid and ran
        straight into the footer disclaimer, so a reader who got to the bottom had nothing
        to do next. Brokers, municipalities and land sellers — an audience spec §3 calls
        out as served by nothing on the old site — had no route in from the homepage.
      */}
      <section className="mx-auto max-w-[1200px] px-6 py-14">
        <SectionHeading {...copy.partnersTeaser!} />
        <div className="mt-6">
          <Button href={copy.partnersTeaserCta!.href!} variant="secondary">
            {copy.partnersTeaserCta!.label}
          </Button>
        </div>
      </section>

      <CtaBand bookACallUrl={settings?.bookACallUrl} copy={copy.ctaBand} />

      {/*
        Homepage only, and once per visitor. It waits before appearing, asks for a name and
        an email and nothing else, and a dismissal is remembered — an overlay that returns
        every visit trains people to close it unread, which costs more than it captures.
      */}
      <InvestorPopup copy={copy.popup} />
    </>
  )
}

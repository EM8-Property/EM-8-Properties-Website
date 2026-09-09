import type { Metadata } from 'next'
import { PortableText } from 'next-sanity'
import { seoMetadata } from '@/lib/pageSeo'
import { fetchSanity } from '@/sanity/client'
import { STRATEGY_PAGE_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type {
  STRATEGY_PAGE_QUERY_RESULT,
  SITE_SETTINGS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { CtaBand } from '@/components/ui/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import type { CarouselSlide } from '@/components/layout/HeroCarousel'

export async function generateMetadata(): Promise<Metadata> {
  const [copy, settings] = await Promise.all([
    fetchSanity<STRATEGY_PAGE_QUERY_RESULT>(STRATEGY_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])
  return seoMetadata({
    seo: copy?.seo,
    path: '/strategy',
    documentName: 'strategyPage',
    shareImage: settings?.defaultShareImage,
  })
}

/**
 * Why the Midwest — spec §5's one new route, against the four an earlier draft would have
 * created.
 *
 * Hunter's instruction of 2026-09-08 put Why Midwest and Partners under a Strategy tab.
 * Why Midwest is not a page of its own under it: it is *this* page's body, which is what
 * "fold" meant and what §12 records as the improvement — a section of a page that has
 * content rather than a second thin page.
 *
 * The body ships empty and that is the normal state for now. §3 lists the copy under "Owed
 * by people", so the structure is here and the words arrive in the Studio without a
 * developer. Until then the page is its title and its call to action, which is a real page
 * — a hero with an eyebrow, a headline and an intro — rather than a shell.
 */
export default async function StrategyPage() {
  const [copy, settings] = await Promise.all([
    fetchSanity<STRATEGY_PAGE_QUERY_RESULT>(STRATEGY_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])

  // Missing required content fails the build loudly rather than rendering a titleless
  // page. Sanity's `required()` is Studio-side only, so this throw is the real guard, and
  // it checks `title` rather than `heading` — GROQ projects an all-null heading into a
  // truthy object, which a shallow check would wave through as an empty <h1>.
  if (!copy?.heading?.title) {
    throw new Error(
      'The strategyPage document has no heading title. Add one in the Studio under ' +
        'Strategy page.',
    )
  }

  return (
    <div>
      <PageHero
        copy={copy.heading}
        slides={(settings?.heroCarousel ?? []) as CarouselSlide[]}
      />

      {/*
        Guarded, and the guard is the point rather than defensive habit: this field is
        empty today. `PortableText` handed null throws, and an unguarded wrapper renders an
        empty bordered section, so the page has to be correct with nothing here — which is
        how it ships.
      */}
      {copy.body && (
        <section className="mx-auto max-w-[1200px] px-6 py-12">
          <div className="max-w-[68ch] text-sm leading-relaxed text-ink-secondary">
            <PortableText value={copy.body} />
          </div>
        </section>
      )}

      <CtaBand bookACallUrl={settings?.bookACallUrl} copy={settings?.ctaBand} />
    </div>
  )
}

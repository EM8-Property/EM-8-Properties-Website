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
import { Band, alternatingTones } from '@/components/ui/Band'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { StrategyPillars } from '@/components/strategy/StrategyPillars'
import { MetricBars } from '@/components/strategy/MetricBars'

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
 * That body shipped empty on 2026-09-08 and no longer is. The argument turned out to have
 * a shape rather than to be prose: three claims about the market and one figure showing
 * the result, so the page is prose, a pillar grid, and a bar chart. All three sections are
 * driven from the `strategyPage` document — nothing here is a literal — which is the whole
 * point of plan revision D4 and the reason this copy can be reworded in the Studio without
 * a developer.
 *
 * **Every section below is conditional, and they are assembled into a list rather than
 * written out in sequence.** Hardcoding a ground on each one only works for the
 * combination that existed when it was written: publishing the chart while the pillars
 * were still empty would put the prose and the chart back to back on the same ground, and
 * emptying the prose would open the page on a panelled band directly under the
 * photograph. `alternatingTones` assigns grounds to however many sections actually
 * rendered, which is the same defect it was written for on the homepage.
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

  const pillars = copy.pillars ?? []
  const bars = copy.marketBars ?? []

  /*
   * Each section gates on the content it actually renders, leaf by leaf, never on the
   * parent object: GROQ projects an all-null `headingBlock` into a truthy object, so
   * `copy.pillarsHeading &&` would render an empty <h2> above a grid with nothing in it.
   * The same trap the heading guard above exists for, one level down.
   *
   * The chart additionally gates on `marketSource`. Spec §9's rule is that no figure
   * ships without a source behind it, and a bar chart is the one place on this site where
   * an editor can publish a fresh statistic to investors in four keystrokes. The schema
   * requires the field as soon as a bar exists — but that validation is Studio-side only
   * and the CLI, Vision and any direct API write ignore it, so unattributed figures do not
   * render at all rather than rendering bare.
   */
  const sections = [
    copy.body && (
      // `space-y-4`, because Tailwind's preflight zeroes the margin on every <p> and
      // nothing puts it back. PortableText renders one <p> per block, so without this a
      // three-paragraph body runs together into a single wall — visible the moment a body
      // has more than one paragraph in it, which until now none on this site did.
      <div
        key="body"
        className="max-w-[68ch] space-y-4 text-sm leading-relaxed text-ink-secondary"
      >
        <PortableText value={copy.body} />
      </div>
    ),
    copy.pillarsHeading?.title && pillars.length > 0 && (
      <div key="pillars">
        <SectionHeading {...copy.pillarsHeading} />
        <div className="mt-8">
          <StrategyPillars pillars={pillars} />
        </div>
      </div>
    ),
    copy.marketHeading?.title && bars.length > 0 && copy.marketSource && (
      <div key="market" className="grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        <SectionHeading {...copy.marketHeading} />
        <MetricBars bars={bars} unit={copy.marketUnit} source={copy.marketSource} />
      </div>
    ),
  ].filter(Boolean)

  const tones = alternatingTones(sections.length)

  return (
    <div>
      {/*
        The hero is a sibling of the measure, never inside it. A full-bleed band nested in
        a `max-w-[1200px] px-6` container stops short of the viewport on both sides and
        doubles the horizontal padding — the same mistake that once collapsed CtaBand.
      */}
      <PageHero
        copy={copy.heading}
        slides={(settings?.heroCarousel ?? []) as CarouselSlide[]}
      />

      {sections.map((section, i) => (
        // `alternatingTones` is handed `sections.length` and returns exactly that
        // many, so the index is always in range; the strict config cannot see it.
        <Band key={i} tone={tones[i]!}>
          {section}
        </Band>
      ))}

      <CtaBand bookACallUrl={settings?.bookACallUrl} copy={settings?.ctaBand} />
    </div>
  )
}

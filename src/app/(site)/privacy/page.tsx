import type { Metadata } from 'next'
import { PortableText, type PortableTextComponents } from 'next-sanity'
import { seoMetadata } from '@/lib/pageSeo'
import { fetchSanity } from '@/sanity/client'
import { PRIVACY_PAGE_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type {
  PRIVACY_PAGE_QUERY_RESULT,
  SITE_SETTINGS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { PageHero } from '@/components/layout/PageHero'
import type { CarouselSlide } from '@/components/layout/HeroCarousel'
import { Band } from '@/components/ui/Band'
import { CtaBand } from '@/components/ui/CtaBand'

export async function generateMetadata(): Promise<Metadata> {
  const [copy, settings] = await Promise.all([
    fetchSanity<PRIVACY_PAGE_QUERY_RESULT>(PRIVACY_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])
  return seoMetadata({
    seo: copy?.seo,
    path: '/privacy',
    documentName: 'privacyPage',
    shareImage: settings?.defaultShareImage,
  })
}

/*
 * Tailwind's preflight strips heading sizes, list bullets and paragraph margins, and
 * nothing on this site puts them back globally, so a legal page with sections and lists
 * renders as one undifferentiated wall without these.
 */
const COMPONENTS: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="pt-6 text-lg font-bold leading-snug text-ink">{children}</h2>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc space-y-1 ps-5">{children}</ul>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  },
}

/** "2025-01-04" -> "January 4, 2025", without a timezone shifting it a day. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * The privacy statement. Every word comes from the `privacyPage` document so it can be
 * corrected by whoever reviews it, without a deploy. Missing content fails the build
 * rather than publishing a legal page with a hole in it.
 */
export default async function PrivacyPage() {
  const [copy, settings] = await Promise.all([
    fetchSanity<PRIVACY_PAGE_QUERY_RESULT>(PRIVACY_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])

  if (!copy?.heading?.title || !copy.effectiveDate || !copy.body?.length) {
    throw new Error(
      'The privacyPage document is missing its heading, effective date or statement. ' +
        'Fill them in the Studio under Privacy page.',
    )
  }

  return (
    <div>
      {/* A sibling of the measure, never inside it — see /partners. */}
      <PageHero
        copy={copy.heading}
        slides={(settings?.heroCarousel ?? []) as CarouselSlide[]}
      />

      <Band tone="ground">
        <p className="text-xs font-semibold text-ink-secondary">
          Effective {formatDate(copy.effectiveDate)}
        </p>
        <div className="mt-6 max-w-[68ch] space-y-4 text-sm leading-relaxed text-ink-secondary">
          <PortableText value={copy.body} components={COMPONENTS} />
        </div>
      </Band>

      {/* Every page offers a way to start a conversation; see ctaCoverage.test.ts. */}
      <CtaBand bookACallUrl={settings?.bookACallUrl} copy={settings?.ctaBand} tone="panel" />
    </div>
  )
}

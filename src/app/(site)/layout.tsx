import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { CarouselSlot } from '@/components/layout/CarouselSlot'
import type { CarouselSlide } from '@/components/layout/HeroCarousel'
import { fetchSanity } from '@/sanity/client'
import { SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type { SITE_SETTINGS_QUERY_RESULT } from '@/sanity/types.generated'

/**
 * Chrome and the required-content guard for every visitor-facing page.
 *
 * `(site)` is a route group, so it adds nothing to any URL — /portfolio is still
 * /portfolio. Its only job is to scope this layout to content routes, leaving /studio
 * and the API routes on the bare root layout.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY)

  // Deliberate. Missing required content fails the build loudly rather than rendering a
  // shell with an empty footer and a dead Investor Login button. Silent fallback content
  // is the exact failure mode the old site's constants.ts created, and it is why nobody
  // noticed the site had drifted from its own CMS.
  //
  // This throws only for content routes. /studio sits outside this group precisely so
  // that the tool needed to create the missing document stays reachable.
  if (!settings?.agoraPortalUrl || !settings?.disclaimer || !settings?.contactEmail) {
    throw new Error(
      'siteSettings is missing or incomplete. Publish a siteSettings document with ' +
        'agoraPortalUrl, contactEmail and disclaimer set — at /studio, or at ' +
        'https://em-8-properties.sanity.studio',
    )
  }

  return (
    <>
      <SiteHeader agoraUrl={settings.agoraPortalUrl} />
      {/*
        The photo band sits above the page content on the main content pages.

        Rendered here rather than in each page so the six that show it cannot drift apart,
        and gated by pathname rather than duplicated: /investors and the property pages are
        excluded, the former because it is a conversion page and the latter because they
        already open on their own hero photograph.
      */}
      <CarouselSlot slides={(settings.heroCarousel ?? []) as CarouselSlide[]} />
      <main className="flex-1">{children}</main>
      <SiteFooter disclaimer={settings.disclaimer} contactEmail={settings.contactEmail} />
    </>
  )
}

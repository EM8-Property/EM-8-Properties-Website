import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { CarouselSlot } from '@/components/layout/CarouselSlot'
import type { CarouselSlide } from '@/components/layout/HeroCarousel'
import { fetchSanity } from '@/sanity/client'
import { SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type { SITE_SETTINGS_QUERY_RESULT } from '@/sanity/types.generated'
import { JsonLd } from '@/components/seo/JsonLd'
import { organizationJsonLd } from '@/lib/structuredData'
import { siteUrl } from '@/lib/siteUrl'

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
  // `ctaBand` is checked here for a reason worth stating: Sanity's `required()` is
  // Studio-side only. It does not gate the API, the query, or the build — so a `ctaBand`
  // cleared through Vision, the CLI, or a stale draft being published would leave every
  // page rendering `SectionHeading` with no props: an empty <h2> above a bare email box.
  // That is exactly the headless band this was moved to siteSettings to fix, silently
  // reinstated on every page instead of eleven.
  if (
    !settings?.agoraPortalUrl ||
    !settings?.disclaimer ||
    !settings?.contactEmail ||
    !settings?.ctaBand?.heading?.title ||
    !settings?.ctaBand?.submitLabel
  ) {
    throw new Error(
      'siteSettings is missing or incomplete. Publish a siteSettings document with ' +
        'agoraPortalUrl, contactEmail, disclaimer and a complete ctaBand set — at ' +
        '/studio, or at https://em-8-properties.sanity.studio',
    )
  }

  return (
    <>
      {/*
        Who the firm is, once per page, for every content route. It lives here rather than
        on the homepage because it describes the site rather than a page, and this layout
        already holds the one document the values come from.
      */}
      <JsonLd
        data={organizationJsonLd({
          siteUrl: siteUrl(),
          contactEmail: settings.contactEmail,
        })}
      />
      {/*
        The header and the photo band share a positioning context so the header can sit
        over the photography, letting the image run to the very top of the page. On pages
        with no band the header is in normal flow and the wrapper does nothing.
      */}
      <div className="relative">
        <SiteHeader agoraUrl={settings.agoraPortalUrl} />
        <CarouselSlot slides={(settings.heroCarousel ?? []) as CarouselSlide[]} />
      </div>
      <main className="flex-1">{children}</main>
      <SiteFooter disclaimer={settings.disclaimer} contactEmail={settings.contactEmail} />
    </>
  )
}

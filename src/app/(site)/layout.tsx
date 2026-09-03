import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
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
  //
  // `headerCta` is checked the same way and for a sharper version of the same reason: an
  // empty label renders the header's only call to action as a dark rounded box with no
  // words in it, on every page, and nothing in the build, the tests, lint or Lighthouse
  // sees a button with no text. Both leaves are checked, because a `headerCta` object
  // whose two fields are null still projects to a truthy object — checking the parent
  // would wave that straight through.
  if (
    !settings?.agoraPortalUrl ||
    !settings?.disclaimer ||
    !settings?.contactEmail ||
    !settings?.headerCta?.label ||
    !settings?.headerCta?.href ||
    !settings?.ctaBand?.heading?.title ||
    !settings?.ctaBand?.submitLabel
  ) {
    throw new Error(
      'siteSettings is missing or incomplete. Publish a siteSettings document with ' +
        'agoraPortalUrl, contactEmail, disclaimer, a headerCta with both a label and a ' +
        'destination, and a complete ctaBand set — at /studio, or at ' +
        'https://em-8-properties.sanity.studio',
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
        The header positions itself against this wrapper so it can sit over the
        photograph, letting the image run to the very top of the page.

        The photograph itself is no longer rendered here. It used to be — a shared strip
        the layout painted above every page's own heading — but each page now lays its own
        title ON that photograph, and a layout cannot know a page's title. So each page
        renders `PageHero` itself, and this wrapper holds only the header.

        When the header overlays, it is out of flow, so this div collapses to nothing and
        the hero below starts at the very top of the document — which is exactly what
        full-bleed needs. On the two detail routes, where the header stays in normal flow,
        the div takes the header's height and the page follows beneath it as before.
      */}
      <div className="relative">
        <SiteHeader
          agoraUrl={settings.agoraPortalUrl}
          cta={{ label: settings.headerCta.label, href: settings.headerCta.href }}
        />
      </div>
      <main className="flex-1">{children}</main>
      <SiteFooter disclaimer={settings.disclaimer} contactEmail={settings.contactEmail} />
    </>
  )
}

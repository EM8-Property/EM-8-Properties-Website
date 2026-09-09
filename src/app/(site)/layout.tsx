import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { fetchSanity } from '@/sanity/client'
import { SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type { SITE_SETTINGS_QUERY_RESULT } from '@/sanity/types.generated'
import type { NavLabels } from '@/lib/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { organizationJsonLd } from '@/lib/structuredData'
import { siteUrl } from '@/lib/siteUrl'
import { missingLeaves } from '@/lib/requiredContent'

/**
 * Chrome and the required-content guard for every visitor-facing page.
 *
 * `(site)` is a route group, so it adds nothing to any URL — /portfolio is still
 * /portfolio. Its only job is to scope this layout to content routes, leaving /studio
 * and the API routes on the bare root layout.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY)

  /*
   * Missing required content fails the build loudly rather than rendering a broken shell.
   * That is the failure mode the old constants.ts fallback created, and it is why this
   * throws instead of defaulting.
   *
   * The list lives in src/lib/requiredContent.ts because `content-integrity` needs the
   * same one — it used to be written out twice and the two had already diverged by three
   * leaves. Sanity's `required()` gates the Publish button and nothing else: not the API,
   * not a GROQ query, not `next build`.
   *
   * This throws only for content routes. /studio sits outside this route group precisely
   * so that the tool needed to create the missing document stays reachable.
   */
  const missing = missingLeaves(settings)
  if (missing.length > 0) {
    throw new Error(
      'siteSettings is missing or incomplete. Publish a siteSettings document with:\n' +
        missing.map((leaf) => `  - ${leaf.describe}`).join('\n') +
        '\nEdit it at /studio, or at https://em-8-properties.sanity.studio',
    )
  }

  // Non-null past this point: `missingLeaves` returns every leaf for a null document or a
  // null/empty field, so the throw above covers it. TypeScript cannot see that through the
  // array, hence `site` and the `!` on each required leaf accessed below.
  const site = settings!

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
          contactEmail: site.contactEmail!,
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
          agoraUrl={site.agoraPortalUrl!}
          cta={{ label: site.headerCta!.label!, href: site.headerCta!.href! }}
          // Non-null for the same reason the two above are: `missingLeaves` returns every
          // navLabels leaf for a null document or a null or empty field, so the throw
          // above covers all nine. TypeScript cannot see that through the array.
          labels={site.navLabels as NavLabels}
        />
      </div>
      <main className="flex-1">{children}</main>
      <SiteFooter disclaimer={site.disclaimer!} contactEmail={site.contactEmail!} />
    </>
  )
}

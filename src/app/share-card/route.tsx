import { ImageResponse } from 'next/og'
import { ShareCardFrame, SHARE_CARD_SIZE } from '@/components/seo/shareCardFrame'

/**
 * Prerendered into a file at build time rather than running satori and resvg on every
 * cold request. The card has no per-request input, this is a static-first site, and it
 * means the wasm binaries are not on the serving path at all.
 */
export const dynamic = 'force-static'

/**
 * The default share card, at a fixed URL every page can point at.
 *
 * This started as `(site)/opengraph-image.tsx`, using Next's file convention. Measuring
 * the built HTML showed that does not do what it looks like it does: the card appeared on
 * `/` and on no other route. The convention applies to the segment holding the file, and
 * `(site)` is a route group whose own page is the homepage — the six sibling routes
 * inherited nothing, so they were still shipping with no `og:image` after the change
 * meant to give them one. Nothing in the build, the tests, lint or a typecheck said so.
 *
 * A route handler has a URL that is known in advance, so `pageMetadata` can name it
 * directly and every page gets the same card from one implementation. The per-article card
 * at `(site)/insights/[slug]/opengraph-image.tsx` still overrides this, and so does a
 * property page's own photograph.
 *
 * `siteSettings.defaultShareImage` remains the intended home for a chosen image; it is
 * unset and read by nothing today, and wiring it needs these pages to become async, which
 * is the CMS-metadata change. Generating the card means the gap cannot reopen silently in
 * the meantime.
 *
 * Note there is no `size`/`contentType`/`alt` export here. Those are config exports of the
 * image *file* conventions; a route handler ignores them, and under the webpack type
 * plugin an excess export fails the route-handler type check outright.
 */
export function GET() {
  return new ImageResponse(
    <ShareCardFrame headline="Transit-oriented development in suburban Chicago" />,
    SHARE_CARD_SIZE,
  )
}

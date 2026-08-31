import type { Metadata } from 'next'

/**
 * Head metadata shared by every static content route.
 *
 * Seven of nine routes shipped with no Open Graph block and no canonical URL: `/`,
 * `/about`, `/insights`, `/investors`, `/partners`, `/portfolio` and `/track-record` each
 * exported a bare `title` and `description`. Next synthesises neither `og:title` nor a
 * canonical from those, so sharing any of them produced a link with no card — on a site
 * whose `/insights` feed exists specifically to be linked from LinkedIn, and whose fourth
 * non-negotiable is one canonical URL per property.
 *
 * The two dynamic routes had already been fixed for `og:title` individually. This exists
 * so the fix is one helper rather than seven hand-written blocks that drift apart, and so
 * `seo.test.ts` can assert every page under `(site)` uses it.
 */
export const SITE_NAME = 'EM8 Properties'

/**
 * The default share card, served by `src/app/share-card/route.tsx`.
 *
 * A fixed URL rather than Next's `opengraph-image` file convention, because measuring the
 * built HTML showed that convention applied to the homepage alone and left the six
 * sibling routes with no card at all. See that file for the detail.
 */
export const SHARE_CARD_PATH = '/share-card'

export const SHARE_CARD = {
  url: SHARE_CARD_PATH,
  width: 1200,
  height: 630,
  alt: SITE_NAME,
} as const

/**
 * `Portfolio | EM8 Properties` — the format every page already used.
 *
 * The homepage passes `SITE_NAME` itself, where a suffix would read
 * "EM8 Properties | EM8 Properties", so that case returns the name alone.
 */
export function pageTitle(title: string): string {
  return title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`
}

export function pageMetadata({
  title,
  description,
  path,
}: {
  /** Page title without the site suffix — `pageTitle` adds it. */
  title: string
  description: string
  /** Root-relative path, resolved against `metadataBase` from the root layout. */
  path: string
}): Metadata {
  const full = pageTitle(title)

  return {
    title: full,
    description,
    // Declared per page, deliberately not in a layout. Metadata fields are inherited by
    // children that do not override them, so a single canonical on `(site)/layout.tsx`
    // would tell crawlers that every page on the site is a duplicate of one of them.
    alternates: { canonical: path },
    openGraph: {
      title: full,
      description,
      url: path,
      siteName: SITE_NAME,
      type: 'website',
      images: [SHARE_CARD],
    },
    // The image is repeated here deliberately. Without an image Next emits
    // `twitter:card = summary`, the small variant — which is what `/portfolio/antioch-
    // shopping-plaza` was serving, the one live offering, as a bare link.
    twitter: {
      card: 'summary_large_image',
      title: full,
      description,
      images: [SHARE_CARD_PATH],
    },
  }
}

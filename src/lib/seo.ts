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

/**
 * The size every generated card is drawn at — the one LinkedIn, Facebook and X all render
 * large. Declared here, and imported by the card itself, so `og:image:width` cannot come
 * to disagree with the pixels. `lib` stays a leaf: the card imports this, not the reverse.
 */
export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const

export const SHARE_CARD = {
  url: SHARE_CARD_PATH,
  width: SHARE_CARD_SIZE.width,
  height: SHARE_CARD_SIZE.height,
  alt: SITE_NAME,
} as const

/**
 * `Portfolio | EM8 Properties` — the format every page already used.
 *
 * The homepage passes `SITE_NAME` itself, where a suffix would read
 * "EM8 Properties | EM8 Properties", so that case returns the name alone.
 *
 * An empty title does too. The dynamic routes pass `p.title ?? ''` from the CMS, and a
 * document saved without one would otherwise ship a title beginning with a bare pipe.
 */
export function pageTitle(title: string): string {
  // Trimmed and case-insensitive, because this value now comes from the CMS rather than
  // from code: an editor typing "EM8 properties" or a trailing space would otherwise get
  // "EM8 properties | EM8 Properties".
  const clean = title.trim()
  if (!clean || clean.toLowerCase() === SITE_NAME.toLowerCase()) return SITE_NAME
  return `${clean} | ${SITE_NAME}`
}

/** A card image with the dimensions and alt text declared, not a bare URL. */
export type ShareImage = {
  url: string
  width: number
  height: number
  alt: string
}

export function pageMetadata({
  title,
  description,
  path,
  image = SHARE_CARD,
}: {
  /** Page title without the site suffix — `pageTitle` adds it. */
  title: string
  description: string
  /** Root-relative path, resolved against `metadataBase` from the root layout. */
  path: string
  /**
   * The card for this page. Defaults to the generated one.
   *
   * Pass `null` when a file-convention `opengraph-image` should supply it instead —
   * naming an image here would override that file with the generic card, which is the
   * opposite of what a per-article card is for.
   */
  image?: ShareImage | null
}): Metadata {
  const full = pageTitle(title)
  // Omitted entirely rather than set to [], which is not a fallback but an explicit
  // "no image" — the bug this change fixed on the one property with no photograph.
  const images = image ? { images: [image] } : {}

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
      ...images,
    },
    // The image is repeated here deliberately. Without an image Next emits
    // `twitter:card = summary`, the small variant — which is what `/portfolio/antioch-
    // shopping-plaza` was serving, the one live offering, as a bare link.
    //
    // The full descriptor rather than the bare path, so `twitter:image:alt` is emitted
    // too. A card image with no alt text is unlabelled to a screen reader.
    twitter: {
      card: 'summary_large_image',
      title: full,
      description,
      ...images,
    },
  }
}

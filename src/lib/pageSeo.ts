import type { Metadata } from 'next'
import { pageMetadata, SHARE_CARD, SITE_NAME, type ShareImage } from './seo'
import { urlForImage } from '@/sanity/image'

/**
 * Builds a page's head metadata from its CMS `seo` block.
 *
 * The title and description were the last strings still hardcoded in TSX after revision
 * D4 moved page copy into Sanity. They stayed behind for a mechanical reason: Next's
 * static `metadata` export cannot read the CMS, so moving them meant converting every
 * page to `generateMetadata`. Nobody decided the team should need a developer and a
 * deploy to fix a search-result snippet.
 */

type SeoBlock = { title?: string | null; description?: string | null } | null | undefined

export function seoMetadata({
  seo,
  path,
  documentName,
  shareImage,
}: {
  seo: SeoBlock
  /** Root-relative path, for the canonical. */
  path: string
  /** Named in the error, so a missing document says which one to create. */
  documentName: string
  /** `siteSettings.defaultShareImage`, when one has been uploaded. */
  shareImage?: unknown
}): Metadata {
  // Loud, not silent. This is the same rule as siteSettings and the page copy documents:
  // missing required content fails the build with a message naming the fix, rather than
  // rendering a page whose title is "undefined | EM8 Properties". Silent fallback content
  // is the failure mode the old site's constants.ts created.
  if (!seo?.title || !seo?.description) {
    throw new Error(
      `The ${documentName} document is missing its Search & sharing fields. ` +
        `Set a page title and description on it in the Studio, at /studio or ` +
        `https://em-8-properties.sanity.studio`,
    )
  }

  return pageMetadata({
    title: seo.title,
    description: seo.description,
    path,
    image: resolveShareImage(shareImage),
  })
}

/**
 * `siteSettings.defaultShareImage` when an editor has set one, otherwise the generated card.
 *
 * The field has existed in the schema since the beginning and was fetched by
 * `SITE_SETTINGS_QUERY` — and then read by nothing at all, so uploading an image there had
 * no effect on any page. This is the wiring it was missing.
 */
export function resolveShareImage(source: unknown): ShareImage {
  // Guarded on the asset ref, not just on falsiness. `urlForImage` throws on a source it
  // cannot parse — "Unable to resolve image URL from source" — and this value is read by
  // every page, so one malformed write here would crash all seven at once with none of
  // the explanation `seoMetadata` gives. Falling back to the generated card is the
  // behaviour that was in place before this field was wired to anything.
  const ref = (source as { asset?: { _ref?: string } } | null)?.asset?._ref
  if (!source || !ref) return SHARE_CARD
  return {
    url: urlForImage(source).width(SHARE_CARD.width).height(SHARE_CARD.height).url(),
    width: SHARE_CARD.width,
    height: SHARE_CARD.height,
    alt: SITE_NAME,
  }
}

// Named export: the default export is deprecated and warns four times per build.
import { createImageUrlBuilder } from '@sanity/image-url'

/**
 * Built from plain config rather than from `sanityClient`.
 *
 * This module is reached from client components (PropertyCard and PostCard are rendered
 * inside the 'use client' filters), so importing the read client here would compile it
 * into the browser bundle. That is harmless while the client is tokenless — but it turns
 * "give the read client a token" into "ship a Sanity token to every visitor", which is
 * exactly the trap waiting for whoever makes the dataset private. Severing the edge now
 * keeps `sanity/client.ts` server-only.
 *
 * Only the two NEXT_PUBLIC_ identifiers are used, and both are non-secret by design.
 */
const builder = createImageUrlBuilder({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
})

/**
 * Always call with an explicit width. The old site's central performance failure was
 * shipping 10-20MB camera originals; routing every image through this builder is what
 * replaces them with a resized, auto-formatted asset from Sanity's CDN.
 */
export function urlForImage(source: unknown) {
  return builder.image(source as never).auto('format').fit('max')
}

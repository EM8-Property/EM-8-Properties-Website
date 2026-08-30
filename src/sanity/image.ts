import imageUrlBuilder from '@sanity/image-url'
import { sanityClient } from './client'

const builder = imageUrlBuilder(sanityClient)

/**
 * Always call with an explicit width. The old site's central performance failure was
 * shipping 10-20MB camera originals; routing every image through this builder is what
 * replaces them with a resized, auto-formatted asset from Sanity's CDN.
 */
export function urlForImage(source: unknown) {
  return builder.image(source as never).auto('format').fit('max')
}

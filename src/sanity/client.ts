import { createClient } from 'next-sanity'

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2026-01-01',
  useCdn: true,
})

/**
 * Every read goes through here so all content shares one cache tag.
 *
 * The `sanity` tag is what /api/revalidate purges when a document is published, which is
 * how an edit reaches the live site in about a minute instead of waiting for a full
 * rebuild. Fetching directly off `sanityClient` elsewhere would skip the tag and leave
 * that page stale until the next deploy.
 */
export async function fetchSanity<T>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return sanityClient.fetch<T>(query, params, { next: { tags: ['sanity'] } })
}

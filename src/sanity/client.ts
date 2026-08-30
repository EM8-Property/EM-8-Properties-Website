import 'server-only'
import { createClient } from 'next-sanity'

/**
 * Read client. Server-only — every read in this app happens at build time or in a server
 * component, so nothing needs a Sanity client in the browser. `src/sanity/image.ts`
 * deliberately builds image URLs from plain config rather than importing this module,
 * which is what keeps that true.
 *
 * `SANITY_API_READ_TOKEN` is optional and used when present. It exists so the dataset can
 * be switched from public to private without a code change: `lead` documents hold
 * investor names, emails, phone numbers, check sizes, and the 506(c) accreditation flag,
 * and in a public dataset all of that is queryable by anyone holding the project ID —
 * which ships in the client bundle by design.
 *
 * `useCdn: false` because Sanity's CDN serves cached responses for up to ~60s after a
 * mutation. With tag-based revalidation, Next's Data Cache is the cache layer; leaving
 * the CDN in front means a publish webhook purges the tag, the re-fetch hits a stale CDN
 * response, and that stale value is re-cached under the same tag — so the editor sees no
 * change and republishes, and it appears to work only by luck of timing.
 */
export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2026-01-01',
  useCdn: false,
  ...(process.env.SANITY_API_READ_TOKEN
    ? { token: process.env.SANITY_API_READ_TOKEN, perspective: 'published' as const }
    : {}),
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

import type { MetadataRoute } from 'next'
import { fetchSanity } from '@/sanity/client'
import { PROPERTY_SLUGS_QUERY, ALL_POSTS_QUERY } from '@/sanity/queries'
import type {
  PROPERTY_SLUGS_QUERY_RESULT,
  ALL_POSTS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { siteUrl } from '@/lib/siteUrl'

/**
 * Every property appears once, at /portfolio/[slug]. /track-record used to be a second
 * view over sold properties and was deleted in Task 10 for exactly that reason — listing
 * those pages twice would have split their search ranking. A sold asset now appears only
 * in the /portfolio grid, with a Sold chip.
 *
 * /studio is excluded — it is an authenticated tool, not content.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()

  const [propertySlugs, posts] = await Promise.all([
    fetchSanity<PROPERTY_SLUGS_QUERY_RESULT>(PROPERTY_SLUGS_QUERY),
    fetchSanity<ALL_POSTS_QUERY_RESULT>(ALL_POSTS_QUERY),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    // `${base}` and not `${base}/`. Next resolves the homepage's canonical to the bare
    // origin, and a sitemap entry that does not string-match the canonical it points at
    // is a standard SEO-audit finding — harmless in practice, since Google normalises an
    // empty path, but there is no reason to publish the two in different forms.
    { url: base, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/portfolio`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/strategy`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/insights`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/investors`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/partners`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/about`, changeFrequency: 'yearly', priority: 0.6 },
  ]

  return [
    ...staticRoutes,
    ...propertySlugs.map((slug) => ({
      url: `${base}/portfolio/${slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...posts.map((p) => ({
      url: `${base}/insights/${p.slug}`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : undefined,
      changeFrequency: 'yearly' as const,
      priority: 0.7,
    })),
  ]
}

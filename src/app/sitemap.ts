import type { MetadataRoute } from 'next'
import { fetchSanity } from '@/sanity/client'
import { PROPERTY_SLUGS_QUERY, ALL_POSTS_QUERY } from '@/sanity/queries'
import type {
  PROPERTY_SLUGS_QUERY_RESULT,
  ALL_POSTS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { siteUrl } from '@/lib/siteUrl'

/**
 * Every property appears once, at /portfolio/[slug]. /track-record is a view over sold
 * properties and mints no URLs of its own, so listing those pages again here would
 * reintroduce exactly the duplicate-URL split the content model was designed to avoid.
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
    { url: `${base}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/portfolio`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/track-record`, changeFrequency: 'monthly', priority: 0.9 },
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

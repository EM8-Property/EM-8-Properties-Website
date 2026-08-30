import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/siteUrl'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The Studio is an authenticated editing tool and the lead endpoint is a write
      // API; neither is content, and neither should appear in a search result.
      disallow: ['/studio', '/api/'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}

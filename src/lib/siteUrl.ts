/**
 * Absolute origin for the site, used by the sitemap, robots, and canonical URLs.
 *
 * Railway exposes its own hostname, which is what preview/staging deploys should
 * advertise; production sets NEXT_PUBLIC_SITE_URL explicitly at cutover so the sitemap
 * points at em-8.com rather than the Railway subdomain.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN
  if (railway) return `https://${railway}`

  return 'https://em-8.com'
}

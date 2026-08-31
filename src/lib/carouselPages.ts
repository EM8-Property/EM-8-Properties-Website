/**
 * The pages that carry the top-of-page photo band.
 *
 * Shared by CarouselSlot, which renders the band, and SiteHeader, which overlays it. If
 * those two disagreed the header would either float over nothing or sit opaquely on top
 * of a photograph, so the rule lives in one place and both import it.
 *
 * Exact matches, not prefixes: `startsWith('/portfolio')` would put the band on every
 * `/portfolio/[slug]` page, which is the one place it was explicitly not wanted — those
 * already open on their own hero photograph.
 */
export const CAROUSEL_PATHS = [
  '/',
  '/portfolio',
  '/track-record',
  '/insights',
  '/partners',
  '/about',
] as const

export function showsCarousel(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  // Next does not emit trailing slashes, but a proxy or a hand-typed URL can.
  const normalised = pathname !== '/' ? pathname.replace(/\/$/, '') : pathname
  return (CAROUSEL_PATHS as readonly string[]).includes(normalised)
}

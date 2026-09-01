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
/**
 * The homepage is deliberately absent.
 *
 * It used to be here, and the band it produced ran the full width of the viewport at the
 * full height of it — so the first screen was photograph and nothing else, with the page's
 * own headline below the fold. The homepage now renders its own hero inside the 1200px
 * content column, with the headline on the photograph rather than beneath it.
 *
 * Removing it from this list is what stops the layout adding a second band above that one,
 * and it is also what returns the header to normal flow there: an overlaid header only
 * makes sense while a photograph reaches the top edge of the page, and on the homepage one
 * no longer does. Both behaviours read this list, which is why the rule lives in one place.
 */
export const CAROUSEL_PATHS = [
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

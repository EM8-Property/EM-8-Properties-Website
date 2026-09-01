/**
 * The pages that open on a full-bleed photograph with their own title laid over it.
 *
 * Shared by the pages themselves and by SiteHeader, which overlays that photograph. If
 * those two disagreed the header would either float over white body copy or sit opaquely
 * on top of a picture, so the rule lives in one place and both import it.
 *
 * This replaces CAROUSEL_PATHS, which answered a narrower question: which pages carried a
 * thin decorative photo strip *above* their title. Every page in that list now carries its
 * title *on* the photograph instead, the homepage has rejoined them, and /investors — which
 * had no photograph at all — has been added, so all seven section pages open the same way.
 *
 * Exact matches, not prefixes. `startsWith('/portfolio')` would put a shared carousel on
 * every /portfolio/[slug] page, which is the one place it is explicitly not wanted: those
 * open on their own property photograph, and a rotating band of *other* buildings above it
 * would be a second, unrelated image. /insights/[slug] is excluded for the same reason —
 * an article has its own hero image field and its own headline.
 */
export const HERO_PATHS = [
  '/',
  '/portfolio',
  '/track-record',
  '/insights',
  '/partners',
  '/about',
  '/investors',
] as const

export function showsHero(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  // Next does not emit trailing slashes, but a proxy or a hand-typed URL can.
  const normalised = pathname !== '/' ? pathname.replace(/\/$/, '') : pathname
  return (HERO_PATHS as readonly string[]).includes(normalised)
}

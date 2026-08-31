'use client'

import { usePathname } from 'next/navigation'
import { HeroCarousel, type CarouselSlide } from './HeroCarousel'

/**
 * The pages that carry the photo band, as an exact-match list.
 *
 * Exact rather than prefix on purpose: `startsWith('/portfolio')` would put the band on
 * every `/portfolio/[slug]` page, which is the one place it was explicitly not wanted —
 * those pages already open on their own hero photograph, and two large images stacked is
 * a worse page. /investors is excluded too; it is a conversion page and the form should be
 * the first thing on it.
 */
export const CAROUSEL_PATHS = [
  '/',
  '/portfolio',
  '/track-record',
  '/insights',
  '/partners',
  '/about',
] as const

export function CarouselSlot({ slides }: { slides: CarouselSlide[] }) {
  const pathname = usePathname()
  // Next does not emit trailing slashes, but a proxy or a hand-typed URL can.
  const normalised = pathname !== '/' ? pathname.replace(/\/$/, '') : pathname
  if (!(CAROUSEL_PATHS as readonly string[]).includes(normalised)) return null
  return <HeroCarousel slides={slides} />
}

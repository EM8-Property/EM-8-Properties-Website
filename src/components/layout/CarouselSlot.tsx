'use client'

import { usePathname } from 'next/navigation'
import { showsCarousel } from '@/lib/carouselPages'
import { HeroCarousel, type CarouselSlide } from './HeroCarousel'

export { CAROUSEL_PATHS } from '@/lib/carouselPages'

export function CarouselSlot({ slides }: { slides: CarouselSlide[] }) {
  const pathname = usePathname()
  if (!showsCarousel(pathname)) return null
  // Always a banner now. The homepage used to be the exception, filling the viewport
  // edge to edge; it renders its own contained hero instead and is no longer in
  // CAROUSEL_PATHS, so nothing here special-cases it.
  return <HeroCarousel slides={slides} />
}

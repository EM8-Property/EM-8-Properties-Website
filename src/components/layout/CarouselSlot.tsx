'use client'

import { usePathname } from 'next/navigation'
import { showsCarousel } from '@/lib/carouselPages'
import { HeroCarousel, type CarouselSlide } from './HeroCarousel'

export { CAROUSEL_PATHS } from '@/lib/carouselPages'

export function CarouselSlot({ slides }: { slides: CarouselSlide[] }) {
  if (!showsCarousel(usePathname())) return null
  return <HeroCarousel slides={slides} />
}

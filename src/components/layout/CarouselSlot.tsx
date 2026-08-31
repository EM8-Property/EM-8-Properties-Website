'use client'

import { usePathname } from 'next/navigation'
import { showsCarousel } from '@/lib/carouselPages'
import { HeroCarousel, type CarouselSlide } from './HeroCarousel'

export { CAROUSEL_PATHS } from '@/lib/carouselPages'

export function CarouselSlot({ slides }: { slides: CarouselSlide[] }) {
  const pathname = usePathname()
  if (!showsCarousel(pathname)) return null
  // Full-bleed on the landing page only. Everywhere else the band sits above content the
  // visitor came for, so it stays a banner.
  return <HeroCarousel slides={slides} fullScreen={pathname === '/'} />
}

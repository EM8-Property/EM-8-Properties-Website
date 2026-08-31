'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { urlForImage } from '@/sanity/image'

export type CarouselSlide = {
  image: unknown
  slug: string | null
  propertyTitle: string | null
}

const INTERVAL_MS = 6000

/**
 * The photo band above the hero on the main content pages.
 *
 * Content comes from the `siteSettings` singleton, not from each property, so the same
 * photos appear everywhere the band is shown and there is exactly one list to edit.
 *
 * Three things this deliberately does, all of which are the difference between a carousel
 * and an accessibility complaint:
 *
 *   - It honours `prefers-reduced-motion`. An auto-advancing band is a vestibular trigger
 *     and, for anyone reading slowly, content that moves out from under them.
 *   - It pauses while hovered or focused, so a keyboard user can actually reach the link
 *     inside a slide before it changes.
 *   - Every slide is a real link with real alt text, so the band is navigation rather than
 *     decoration, and screen-reader users get the same destinations everyone else does.
 *
 * A slide whose property reference is dangling is dropped rather than rendered: a large
 * clickable photograph that goes nowhere is worse than one fewer slide.
 */
export function HeroCarousel({ slides }: { slides: CarouselSlide[] }) {
  const usable = useMemo(() => slides.filter((s) => s.slug), [slides])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (usable.length < 2 || paused) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setIndex((i) => (i + 1) % usable.length), INTERVAL_MS)
    return () => clearInterval(id)
  }, [usable.length, paused])

  if (usable.length === 0) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured properties"
      className="relative h-[220px] w-full overflow-hidden bg-panel sm:h-[300px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {usable.map((slide, i) => (
        <Link
          key={`${slide.slug}-${i}`}
          href={`/portfolio/${slide.slug}`}
          // Inert rather than unmounted: keeping every slide mounted lets the browser
          // decode the next image before it is shown, and `inert` keeps the hidden ones
          // out of the tab order and off the accessibility tree while they are invisible.
          inert={i !== index}
          aria-hidden={i !== index}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={urlForImage(slide.image).width(2000).height(600).url()}
            alt={(slide.image as { alt?: string })?.alt ?? slide.propertyTitle ?? ''}
            width={2000}
            height={600}
            priority={i === 0}
            className="h-full w-full object-cover"
          />
          {/*
            A scrim, not a decoration. The property name sits on photography of unknown
            brightness, and this is what keeps it legible on a pale lobby shot.
          */}
          <span className="absolute inset-0 bg-gradient-to-t from-[rgba(26,26,26,0.72)] to-transparent" />
          <span className="absolute bottom-4 start-6 font-display text-sm font-medium uppercase tracking-wide text-white sm:text-base">
            {slide.propertyTitle}
          </span>
        </Link>
      ))}

      {usable.length > 1 && (
        <div className="absolute bottom-4 end-6 flex gap-2">
          {usable.map((slide, i) => (
            <button
              key={`dot-${slide.slug}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index}
              aria-label={`Show slide ${i + 1} of ${usable.length}${
                slide.propertyTitle ? `: ${slide.propertyTitle}` : ''
              }`}
              className={`size-2.5 rounded-full border border-white transition-colors ${
                i === index ? 'bg-white' : 'bg-transparent'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

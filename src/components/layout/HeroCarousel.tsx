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
export function HeroCarousel({
  slides,
  fullScreen = false,
}: {
  slides: CarouselSlide[]
  /**
   * Fills the viewport instead of running as a banner. Used on the homepage only: the
   * properties are the strongest asset EM8 has and the landing page should open on them.
   * A full screen of photograph above /portfolio would push the actual portfolio below the
   * fold on a page someone arrived at in order to read a list.
   */
  fullScreen?: boolean
}) {
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
      className={`relative w-full overflow-hidden bg-panel ${
        fullScreen ? 'h-[100svh]' : 'h-[220px] sm:h-[300px]'
      }`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {usable.map((slide, i) => {
        /*
         * Only the current slide and its two neighbours carry an <Image>.
         *
         * Every slide sits in the same absolutely-positioned box, so the browser treats
         * them all as visible and fetches every one — eight photographs on first paint,
         * which measured 1.3MB against an 800KB image budget and failed CI. Lazy loading
         * does not help for the same reason. Spec §1 names the old site's oversized
         * photography as a founding problem, so raising the budget was not an option.
         *
         * A window keeps the crossfade already decoded while paying for a few images
         * instead of eight. It is narrower at full-bleed: those crops are far larger, and
         * three of them put the page 25KB over the image budget. Forward is the direction
         * that actually matters — the band auto-advances that way — so the previous slide
         * is dropped there and only reloads if someone clicks back to it.
         */
        const forward = (i - index + usable.length) % usable.length
        const backward = (index - i + usable.length) % usable.length
        const loaded = forward <= 1 || (!fullScreen && backward <= 1)

        return (
          <Link
            key={`${slide.slug}-${i}`}
            href={`/portfolio/${slide.slug}`}
            // `inert` keeps the hidden slides out of the tab order and off the
            // accessibility tree while they are invisible, without unmounting them.
            inert={i !== index}
            aria-hidden={i !== index}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {loaded && (
              <Image
                src={
                  fullScreen
                    ? urlForImage(slide.image).width(2000).height(1200).url()
                    : urlForImage(slide.image).width(1600).height(500).url()
                }
                alt={(slide.image as { alt?: string })?.alt ?? slide.propertyTitle ?? ''}
                width={fullScreen ? 2000 : 1600}
                height={fullScreen ? 1200 : 500}
                /*
                  Without a sizes hint Next emits a srcset up to 3840w and the browser,
                  knowing nothing about the layout, fetches a variant far larger than the
                  band is ever painted at — measured at 662KB for a single hero. The band
                  is always full-width, so say so.
                */
                sizes="100vw"
                /*
                  Below Next's default of 75. At 2048px wide a photograph carries
                  compression far better than a chart or a screenshot would, and the hero
                  is the heaviest single asset on the site — spec §1 names the old site's
                  10-20MB camera originals as one of the three reasons for this rebuild,
                  so the crop is worth tuning rather than only budgeting for.
                */
                quality={68}
                priority={i === 0}
                className="h-full w-full object-cover"
              />
            )}
            {/*
              A scrim, not a decoration. The property name sits on photography of unknown
              brightness, and this is what keeps it legible on a pale lobby shot.
            */}
            <span className="absolute inset-0 bg-gradient-to-t from-[rgba(26,26,26,0.72)] to-transparent" />
            <span className="absolute bottom-4 start-6 font-display text-sm font-medium uppercase tracking-wide text-white sm:text-base">
              {slide.propertyTitle}
            </span>
          </Link>
        )
      })}

      {fullScreen && (
        /*
          A full screen of photograph has to say there is a page beneath it, or a visitor
          can reasonably conclude that is the whole site. aria-hidden because it is a hint
          for the eye — the content below is already in the document for everyone else.
        */
        <div
          data-scroll-cue
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="animate-bounce text-white/90">
            <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}

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

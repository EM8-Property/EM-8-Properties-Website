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
  variant = 'banner',
  overlay,
}: {
  slides: CarouselSlide[]
  /**
   * `banner` is the thin strip above the content on the five pages that carry one.
   *
   * `hero` is the homepage's opening block. It was `fullScreen` — the full width of the
   * viewport at the full height of it — which meant the first screen a visitor saw was
   * photograph, a property caption and a scroll arrow, with EM8's actual proposition
   * below the fold. It is now sized to sit inside the 1200px content column, with the
   * page's own headline on the photograph instead of beneath it.
   */
  variant?: 'banner' | 'hero'
  /**
   * Rendered above the slides, for the hero variant's headline.
   *
   * A sibling of the slides rather than a child, and this matters: every slide is a
   * `<Link>` to its property, so copy containing its own buttons cannot be nested inside
   * one — interactive elements inside an anchor are invalid and unreachable by keyboard.
   */
  overlay?: React.ReactNode
}) {
  const isHero = variant === 'hero'
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
        isHero
          ? // min-h, not h, and the overlay sits in flow rather than absolutely.
            //
            // With a fixed height the section clips whatever does not fit, and because the
            // copy is bottom-aligned it clips from the TOP — the eyebrow first, then the
            // headline. The copy comes from the CMS and is unbounded, so a longer intro or
            // a third sentence would silently truncate the page's own proposition with no
            // build error and no failing test. The box grows instead.
            'flex flex-col justify-end min-h-[420px] rounded-card sm:min-h-[500px] lg:min-h-[560px]'
          : 'h-[220px] sm:h-[300px]'
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
        const loaded = forward <= 1 || backward <= 1

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
                  isHero
                    ? urlForImage(slide.image).width(1600).height(900).url()
                    : urlForImage(slide.image).width(1600).height(500).url()
                }
                alt={(slide.image as { alt?: string })?.alt ?? slide.propertyTitle ?? ''}
                width={1600}
                height={isHero ? 900 : 500}
                /*
                  Without a sizes hint Next emits a srcset up to 3840w and the browser,
                  knowing nothing about the layout, fetches a variant far larger than it is
                  ever painted at — measured at 662KB for a single hero crop.

                  The banner is full-width so it says 100vw. The hero is capped at the
                  content column, which paints at 1152px (1200 minus the 24px gutters), so
                  it says that instead — which is most of why this change made the homepage
                  lighter rather than heavier.
                */
                sizes={isHero ? '(min-width: 1200px) 1152px, 100vw' : '100vw'}
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
            <span
              className={
                isHero
                  ? // Taller and darker than the banner's, because the headline sits on
                    // this rather than beneath the photograph.
                    //
                    // Unlike the header's scrim, this does NOT hold contrast on its own
                    // against any image: on a narrow viewport the copy is tall enough to
                    // reach the top of the box, where the gradient is weakest, and over a
                    // bright sky the eyebrow measured well below 4.5:1. Hunter's call is
                    // that the hero photograph is chosen dark, which is what carries it —
                    // so this is a content constraint, not only a CSS one. Anyone swapping
                    // in a pale lobby shot has to check the headline against it, or put a
                    // solid scrim behind the copy.
                    'absolute inset-0 bg-gradient-to-t from-[rgba(26,26,26,0.90)] via-[rgba(26,26,26,0.55)] to-[rgba(26,26,26,0.25)]'
                  : 'absolute inset-0 bg-gradient-to-t from-[rgba(26,26,26,0.72)] to-transparent'
              }
            />
            {!isHero && (
              <span className="absolute bottom-4 start-6 font-display text-sm font-medium uppercase tracking-wide text-white sm:text-base">
                {slide.propertyTitle}
              </span>
            )}
          </Link>
        )
      })}

      {overlay && (
        /*
          pointer-events-none so the photograph underneath stays clickable; the copy
          re-enables them on its own buttons. Without this the headline would swallow
          clicks meant for the slide it sits on.
        */
        // #8 — pb clears the slide dots, which sit at `bottom-4 end-6`. With eight
        // slides that row is ~136px wide, and at a narrow viewport a wrapped second row of
        // buttons ran underneath it.
        <div className="pointer-events-none relative w-full p-6 pb-12 sm:p-10 sm:pb-14">
          {overlay}
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

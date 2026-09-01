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
 * The full-bleed photograph every section page opens on, with that page's own title laid
 * over it by `PageHero`.
 *
 * Content comes from the `siteSettings` singleton, not from each property, so the same
 * photos appear everywhere the band is shown and there is exactly one list to edit.
 *
 * It used to have two variants: a thin `banner` strip carrying only a property caption,
 * and a `hero` block capped at the 1200px content column. Both are gone. Every page now
 * opens the same way, so there is one shape and one set of numbers to reason about.
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
  overlay,
}: {
  slides: CarouselSlide[]
  /**
   * The page's own title block, rendered above the slides.
   *
   * A sibling of the slides rather than a child, and this matters: every slide is a
   * `<Link>` to its property, so copy containing its own buttons cannot be nested inside
   * one — interactive elements inside an anchor are invalid and unreachable by keyboard.
   */
  overlay?: React.ReactNode
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
      /*
       * min-h, not h, and the overlay sits in flow rather than absolutely.
       *
       * With a fixed height the section clips whatever does not fit, and because the copy
       * is bottom-aligned it clips from the TOP — the eyebrow first, then the headline.
       * The copy comes from the CMS and is unbounded, so a longer intro or a third
       * sentence would silently truncate a page's own proposition with no build error and
       * no failing test. The box grows instead.
       *
       * Deliberately not viewport height. The band this replaces was `100vh`, which is
       * what put the headline below the fold — the width was only ever half of that
       * problem, and it is the half being restored here.
       */
      className="relative flex w-full flex-col justify-end overflow-hidden bg-panel min-h-[420px] sm:min-h-[500px] lg:min-h-[560px]"
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
         * photography as a founding problem, so raising the budget is the last resort and
         * not the first.
         *
         * A window keeps the crossfade already decoded while paying for two images
         * instead of eight.
         *
         * Two, not three, and that is a full-bleed decision. When the band was capped at
         * the 1200px content column its crops were small enough to afford the neighbour in
         * both directions; edge to edge they are not. Measured on this build, a window of
         * three came to 1206KB against a 1400KB image budget — passing, but spending
         * headroom docs/resource-budget.md reserves for the real lobby photography still
         * to be shot. The same trade was made the last time this band ran full width.
         *
         * Forward only, because forward is the sole direction it auto-advances. The
         * previous slide reloads if someone clicks a dot to go back to it.
         */
        const forward = (i - index + usable.length) % usable.length
        const loaded = forward <= 1

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
                src={urlForImage(slide.image).width(1600).height(900).url()}
                alt={(slide.image as { alt?: string })?.alt ?? slide.propertyTitle ?? ''}
                width={1600}
                height={900}
                /*
                  The band really is the width of the viewport now, so this really is
                  100vw — and that is the most expensive line in this file.
                  docs/resource-budget.md records a single crop at 567KB when the browser
                  was left to guess. The honest hint is the cheap one here; the levers that
                  defend the image budget are the preload window above and the 1600px crop
                  below, not a `sizes` value that misdescribes the layout.
                */
                sizes="100vw"
                /*
                  Below Next's default of 75, and declared in `images.qualities` in
                  next.config.ts — Next 16 silently ignores any quality not on that list
                  and falls back to 75, with no warning and byte-identical output. A
                  photograph carries compression far better than a chart would, and this is
                  the heaviest single asset on the site.
                */
                quality={68}
                priority={i === 0}
                className="h-full w-full object-cover"
              />
            )}
            {/*
              A scrim, not a decoration. The page title sits on photography of unknown
              brightness, and this is what keeps it legible.

              What carries the contrast is the photograph being dark, not the gradient:
              measured over this, the eyebrow reads about 9.2:1 on a dark image and about
              2.4:1 on a pale one. That is a content constraint as much as a CSS one, and
              the Studio field description for `heroCarousel` says so. Anyone swapping in a
              pale lobby shot has to check the title against it.
            */}
            <span className="absolute inset-0 bg-gradient-to-t from-[rgba(26,26,26,0.90)] via-[rgba(26,26,26,0.55)] to-[rgba(26,26,26,0.25)]" />
          </Link>
        )
      })}

      {overlay && (
        /*
          pointer-events-none so the photograph underneath stays clickable; the copy
          re-enables them on its own buttons. Without this the title would swallow clicks
          meant for the slide it sits on.

          No `mx-auto max-w-[1200px]` here, deliberately. The words are held a similar
          distance in from the edge of the image as they were when that image was a 1152px
          block — they are not snapped back to the content column, which would undo the
          full-bleed change for everything except the photograph itself.

          pb clears the slide dots, which sit at `bottom-4 end-6`. With eight slides that
          row is ~136px wide, and at a narrow viewport a wrapped second row of buttons ran
          underneath it.

          pt clears the header, which now sits *over* this band on every page. Measured at
          375px: the eyebrow's first line began at y=62 while the header ran to y=68, so
          the top line of copy rendered underneath it. The copy is bottom-aligned, so it
          climbs as it grows — and it comes from the CMS, so a longer intro would push it
          further up with no build error and nothing to catch it. The header is ~68px.
        */
        <div
          data-hero-overlay
          className="pointer-events-none relative w-full p-6 pb-12 pt-24 sm:p-10 sm:pb-14 sm:pt-28"
        >
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

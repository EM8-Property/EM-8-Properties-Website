'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { urlForPhoto } from '@/sanity/image'

/**
 * One gallery entry as the property query returns it. `alt` is required by the schema, so
 * it is not optional here — but it is still defaulted at the render site, because a
 * document created before that validation landed can carry an empty one and a build must
 * not fail on a missing word.
 */
export type GalleryPhoto = {
  alt?: string | null
  asset?: { _ref?: string } | null
}

/*
 * Matches `InvestorPopup`, deliberately spelled the same way rather than shared. The two
 * dialogs have no other code in common and a `focusable.ts` holding one string is a module
 * nobody opens; if a third appears, extract it then.
 */
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** The thumbnail crop. 4:3 because these are buildings, not banners. */
const THUMB = { w: 800, h: 600 }

/**
 * The full-size crop requested for the overlay.
 *
 * Not the source: a 20MP original is 8MB and this is opened on a tap. 2000px covers a
 * 1440px viewport at DPR 1 and is within a third of a linear pixel of a 1024px one at DPR
 * 2, which is where photographs are actually looked at. `fit=max` means a source smaller
 * than this returns at its own size rather than being blown up, so the cheap photographs
 * stay exactly as sharp as they were and simply render smaller inside the frame.
 */
const FULL = 2000

/**
 * Every photograph on a property, beyond the one already used as the page's hero.
 *
 * The Studio has allowed a `gallery` array since the schema was written and the property
 * query has always projected it, but the page only ever read `gallery[0]`. So editors
 * could upload ten photographs of a building and see one — which is what Hunter reported
 * on 2026-09-16. The fix is a renderer, not a schema change, and nothing had to be
 * migrated.
 *
 * `gallery[0]` is the hero and is NOT repeated here. The page passes `photos` already
 * sliced, so this component does not know about that rule and cannot disagree with the
 * page about which image is the hero.
 *
 * The thumbnails are real buttons rather than a grid of clickable divs, so they are
 * reachable by keyboard and announced as controls. Each one names the photograph it
 * opens, because "Photo 3" is useless read aloud on its own.
 */
export function PropertyGallery({
  photos,
  propertyTitle,
}: {
  photos: GalleryPhoto[]
  propertyTitle?: string | null
}) {
  const [openAt, setOpenAt] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  /*
   * Which thumbnail opened the overlay, so focus can be put back on it at close.
   *
   * Without this, dismissing the overlay drops focus to the top of the document and a
   * keyboard user has to tab back through the entire page to reach the photograph after
   * the one they were just looking at. It is stored rather than derived from `openAt`
   * because the arrow keys move `openAt` while the overlay is open, and it is the button
   * they *entered* from that they expect to come back to.
   */
  const openerRef = useRef<HTMLButtonElement | null>(null)

  const close = useCallback(() => {
    setOpenAt(null)
    openerRef.current?.focus()
  }, [])

  const step = useCallback(
    (delta: number) => setOpenAt((i) => (i === null ? i : (i + delta + photos.length) % photos.length)),
    [photos.length],
  )

  /*
   * Escape closes; the arrows walk the set.
   *
   * The arrows are the reason this is a document listener rather than a handler on the
   * image: nothing inside the overlay is focused except the buttons, and binding the
   * arrows to those would fight the browser's own use of them on a focused control.
   */
  useEffect(() => {
    if (openAt === null) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openAt, close, step])

  /*
   * Lock the page behind the overlay. Restoring the previous value rather than clearing it
   * means this cannot stomp on an overflow set by anything else — the same reasoning, and
   * the same bug, as `InvestorPopup`.
   */
  useEffect(() => {
    if (openAt === null) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [openAt])

  /*
   * Keep Tab inside the dialog. `aria-modal="true"` tells assistive tech the rest of the
   * page is inert and does nothing whatever to the tab order, so without this the
   * modality the attribute advertises is a lie.
   */
  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !dialogRef.current) return
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (items.length === 0) return
    const first = items[0]!
    const last = items[items.length - 1]!
    const active = document.activeElement

    if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (photos.length === 0) return null

  const current = openAt === null ? null : photos[openAt]
  const label = (p: GalleryPhoto, i: number) =>
    p.alt?.trim() || `${propertyTitle ?? 'Property'}, photograph ${i + 2}`

  return (
    <>
      <h2 className="mt-8 text-lg font-bold tracking-tight text-ink">Photographs</h2>
      {/*
        Two up on a phone, three on a tablet and above. The column this sits in is about
        680px at its widest, so a third row of thumbnails would put each one under 210px —
        smaller than the cards elsewhere on the site and too small to be worth tapping.
      */}
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, i) => (
          <li key={photo.asset?._ref ?? i}>
            <button
              type="button"
              onClick={(e) => {
                openerRef.current = e.currentTarget
                setOpenAt(i)
              }}
              /*
                `group` and a wrapper so the zoom happens inside a clipped box. Scaling the
                <Image> without `overflow-hidden` on the parent grows it past the grid cell
                and over its neighbour.
              */
              className="group block w-full overflow-hidden rounded-card border border-rule"
            >
              <span className="sr-only">Enlarge: {label(photo, i)}</span>
              <Image
                src={urlForPhoto(photo, THUMB.w, THUMB.h).width(THUMB.w).height(THUMB.h).url()}
                alt=""
                width={THUMB.w}
                height={THUMB.h}
                // The grid is 2 or 3 across inside a ~680px column, so a thumbnail is
                // never wider than about 330px. It is a fixed-ish box on desktop and half
                // the viewport on a phone, which is what these two clauses say.
                sizes="(max-width: 640px) 50vw, 240px"
                className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

      {current && openAt !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/*
            The scrim is a button so a pointer user can dismiss by clicking away, which is
            the expected reflex. It is aria-hidden because the same escape route is already
            available to assistive tech through the labelled close button and Escape.
          */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 bg-scrim/90"
          />

          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${propertyTitle ?? 'Property'} photographs`}
            onKeyDown={trapTab}
            className="relative flex max-h-full w-full max-w-5xl flex-col items-center gap-3"
          >
            <Image
              // `key` forces a fresh element per photograph. Without it React reuses the
              // <img> and the previous picture stays on screen until the next one decodes,
              // so the arrow keys look like they have done nothing on a slow connection.
              key={openAt}
              src={urlForPhoto(current, FULL).width(FULL).url()}
              alt={label(current, openAt)}
              width={FULL}
              height={Math.round((FULL * 3) / 4)}
              sizes="100vw"
              /*
                `eager`, and this is load-bearing rather than a performance tweak.

                next/image defaults to `loading="lazy"`, which waits for the element to
                approach the viewport. That is a deadlock here: an unloaded image with
                `width: auto` inside a column flex container has no intrinsic size to
                resolve against, so its box computes to **0x0** — and a zero-area element
                never satisfies the lazy loader's intersection check, so it never loads, so
                it never gains a size. The overlay opened onto a 44px-tall dialog holding
                nothing but its own controls.

                It survived review because it only happens on a COLD load: with the file
                already in cache the intrinsic size is available on the first layout pass
                and the box resolves before the deadlock can form. Localhost testing had
                warmed every one of these images, so it looked right there and failed on
                the deployed site. **A warm cache is not a test of image loading.**

                `eager` fetches unconditionally, with no intersection check, so the cycle
                cannot start. It is also just correct for this element: the reader has
                tapped a thumbnail and is waiting for exactly this photograph. `priority`
                would work too and additionally emit a preload hint, which is wrong for an
                image that does not exist at page load.
              */
              loading="eager"
              /*
                Fit inside the box on BOTH axes, rather than capping the height alone.

                `max-h` with `w-auto` constrains one axis and leaves the other free, so a
                2000px-wide photograph clamped to 720px tall is still painted 960px wide —
                fine on a desktop, an overflow on a 375px phone. `max-w-full` closes that,
                and the pair with `h-auto`/`w-auto` is the ordinary "contain within" shape:
                the photograph fits whichever axis binds first and keeps its aspect ratio.

                Deliberately no fixed height. These photographs are not all one shape, and a
                definite height would upscale the small ones — several of these sources are
                barely 1080px wide — in an overlay whose whole purpose is showing the
                picture as it is.
              */
              className="h-auto max-h-[80svh] w-auto max-w-full rounded-card object-contain"
            />

            <div className="flex items-center gap-4">
              {photos.length > 1 && (
                <button
                  type="button"
                  onClick={() => step(-1)}
                  className="rounded-control px-3 py-1.5 text-sm font-semibold text-white/80 hover:text-white"
                >
                  <span aria-hidden="true">←</span>
                  <span className="sr-only">Previous photograph</span>
                </button>
              )}
              <p className="text-xs font-medium text-white/70" aria-live="polite">
                {openAt + 1} of {photos.length}
              </p>
              {photos.length > 1 && (
                <button
                  type="button"
                  onClick={() => step(1)}
                  className="rounded-control px-3 py-1.5 text-sm font-semibold text-white/80 hover:text-white"
                >
                  <span aria-hidden="true">→</span>
                  <span className="sr-only">Next photograph</span>
                </button>
              )}
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="rounded-control px-3 py-1.5 text-sm font-semibold text-white/80 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

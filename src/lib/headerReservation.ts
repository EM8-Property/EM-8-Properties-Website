/**
 * The top padding the hero reserves for the header that sits over it.
 *
 * In one place because two files must agree on it and did not: `HeroCarousel`'s overlay and
 * `PageHero`'s no-photograph fallback each spelled `pt-24 sm:pt-28` in their own class
 * string, with a paragraph in each explaining why. The number is a function of the
 * header's height, the header just changed height, and a shared constant is the difference
 * between that being one edit and being two — one of which would have been found by a
 * reader rather than by a test.
 *
 * Why it is a plain string of class names: Tailwind v4 scans source files for class tokens,
 * and it finds them in a string literal in a `.ts` file exactly as it finds them in JSX. A
 * computed class name would not be found and would silently produce no padding at all.
 *
 * The measurements, taken at 2026-09-08 on the two-row phone header this exists for:
 *
 *   header 68px (one row, before §5) · pt-24 = 96px · /about eyebrow at y=96 · 28px clear
 *   header 100px (two rows, after)   · pt-24 = 96px · eyebrow UNDER the header by 4px
 *   header 100px (two rows, after)   · pt-32 = 128px · 28px clear, as before
 *
 * 28px was the whole budget at 320, 360 and 375px, and it is identical at all three because
 * below 375px the band's overlay has grown to fill the band — bottom-alignment leaves no
 * slack, so the reservation minus the header IS the margin. The E2E assertion at 320px on
 * /about is what proves this number is still right; it is the tightest case on the site and
 * the first thing that fails if the header grows again.
 *
 * The breakpoint is `md`, not `sm`, and that matters. The header is two rows all the way up
 * to `md` (768px), which is where its own layout collapses to one. Relaxing the reservation
 * at `sm` (640px) would shrink it from 128px to 112px while the header was still at its
 * tallest — tightening the clearance at exactly the widths that need it most. So the
 * reservation changes where the header changes, and `md:pt-28` leaves the desktop case
 * identical to what it has always been against a 68px single-row header.
 *
 * Measure 640-767px as well as the phone widths. That band is where the header is two rows
 * and a reservation keyed to `sm` would already have relaxed, so it is the range that shows
 * this decision being right or wrong.
 */
export const HEADER_RESERVATION = 'pt-32 md:pt-28'

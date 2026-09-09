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
 * **The measurements. These are measured, on `npm run build && npm start`, against
 * `[data-hero-overlay] p` on /about — the tightest shape on the site.** The first version
 * of this table carried the plan's *predictions* instead (a 100px header and 28px of
 * clearance at every phone width) and every one of those three numbers was wrong. A wrong
 * number in the module created to be the single place these numbers live is worse than the
 * two-file duplication it replaced, so: 2026-09-09, `pt-32 md:pt-28`.
 *
 *   width    header    reservation    /about clearance
 *   320px    113.0px   pt-32 = 128px  +15.0px   ← the tightest case on the site
 *   360px    113.0px   pt-32 = 128px  +15.0px
 *   375px     88.5px   pt-32 = 128px  +39.5px
 *   390px     88.5px   pt-32 = 128px  +39.5px
 *   640px     88.5px   pt-32 = 128px  +74.1px   ← the band that justifies `md` over `sm`
 *   767px     88.5px   pt-32 = 128px  +74.1px
 *   768px     62.0px   md:pt-28 = 112px  +100.6px
 *   1280px    62.0px   md:pt-28 = 112px   +50.0px
 *
 * The header is 113px rather than 88.5px below 375px because the nav's four labels wrap to
 * two lines there. 15px is the whole budget at 320px and 360px, and the reason it is not
 * larger is that below 375px the band's overlay has grown to fill the band —
 * bottom-alignment leaves no slack, so the reservation minus the header IS the margin. The
 * E2E assertion at 320px on /about is what proves this number is still right, and it is the
 * first thing that fails if the header grows again.
 *
 * For the same reason, the header's height must not depend on an interaction. It briefly
 * did: revealing Investor Login below `md` wrapped row one and took the header to 155px at
 * 320px, which is 27px of eyebrow *underneath* the bar against the 128px this reserves.
 * That link is out of flow below `md` now — see `SiteHeader.tsx`.
 *
 * The breakpoint is `md`, not `sm`, and the 640-767px row above is what settles it. The
 * header is still 88.5px — two bands — at 767px. Relaxing the reservation at `sm` (640px)
 * would have shrunk it from 128px to 112px across that whole band while the header was at
 * its two-row height, cutting +74.1px to +58.1px for no reason. So the reservation changes
 * where the header changes, and `md:pt-28` leaves the desktop case what it has always been.
 */
export const HEADER_RESERVATION = 'pt-32 md:pt-28'

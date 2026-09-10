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
 * That is also why the narrow breakpoint below is written out as a literal `min-[390px]:`
 * token rather than assembled from a number.
 *
 * **This reservation is sized against the FALLBACK-FONT header, not the webfont one, and
 * that is the whole point of the numbers below.** A fixed `pt-` reserves space for a header
 * whose height VARIES, and the largest single thing that varies it is not the viewport — it
 * is whether Oswald and Inter have arrived yet. Before the webfonts land the browser paints
 * the wordmark and the CTA in a wider fallback face, row one stops fitting at 320px, the
 * header goes from 113.0px to 153.0px, and the eyebrow that had +15.0px of clearance has
 * −25.0px of it: the first line of hero copy renders *underneath* a translucent bar. On a
 * real phone on a slow connection that is what the page looks like until the fonts arrive.
 * CI found it by accident — its runners have no webfonts cached and were painting the
 * fallback — while `npm run test:e2e` stayed green on a warm laptop. The previous version
 * of this table was measured with the fonts loaded and reported +15.0px at 320px as if that
 * were the budget. It was never the budget; it was the best case.
 *
 * **The measurements.** Measured on `npm run build && npm start`, against
 * `[data-hero-overlay] p` on /about — the tightest shape on the site — at
 * `HEADER_RESERVATION = 'pt-48 min-[390px]:pt-36 md:pt-28'`, re-measured 2026-09-09 after
 * `About Us` gained its own `▾` disclosure button (it now points at `/about` instead of
 * being a destinationless button, so it needed the same separate toggle `Strategy` already
 * had — see `navigation.ts` and `NavDropdown.tsx`). "blocked" is Playwright aborting every
 * request for a `.woff`, `.woff2`, `.ttf` or `.otf` file, which is the fallback-font case
 * above; "loaded" is the warm case. Both columns matter, and each band is chosen by the
 * worse of the two.
 *
 *   width    reservation                header            /about clearance
 *                                       loaded  blocked   loaded    blocked
 *   320px    pt-48 = 192px              113.0   153.0      +79.0     +39.0  ← row one wraps
 *   360px    pt-48 = 192px              113.0   113.0      +79.0     +79.0
 *   375px    pt-48 = 192px              113.0   113.0      +79.0     +79.0
 *   390px    min-[390px]:pt-36 = 144px    88.5   113.0      +55.5     +31.0  ← the tightest
 *   640px    min-[390px]:pt-36 = 144px    88.5    88.5      +74.1     +55.5
 *   767px    min-[390px]:pt-36 = 144px    88.5    88.5      +74.1     +55.5
 *   768px    md:pt-28 = 112px             62.0    62.0     +100.6     +61.0
 *   1280px   md:pt-28 = 112px             62.0    62.0      +50.0     +50.0
 *
 * The extra chevron button costs one nav line at two of the eight rows: 375px loaded (which
 * used to fit the nav on one line, header 88.5px, +103.5px clearance) and 390px blocked
 * (which used to as well, header 88.5px, +55.5px clearance) now both wrap the nav to two
 * lines, same as their neighbouring rows already did. The other six rows are unchanged,
 * because their nav was already one line short of the extra chevron's width or already
 * wrapped for an unrelated reason. `HEADER_RESERVATION` itself did not move — the band each
 * of those two rows falls in already reserved for a two-line nav (see the next section) —
 * and the new tightest is 390px blocked at +31.0px, down from 320px blocked's +39.0px
 * before this change but still clearly positive.
 *
 * Swept every 5px from 320px to 820px on /about, /insights and /investors, both ways, after
 * this change: nothing falls below +31.0px blocked or +50.0px loaded. The floor to beat was
 * 28px — what the hero had before the two-row phone header — so the whole range still
 * clears it, with less margin at 390px than before but none of it gone.
 *
 * **Why each band reserves for a header one line TALLER than the one it shows.** This is
 * the part that keeps the table above from going stale on somebody else's machine. The
 * header's height is a line count, and the two rows that can gain a line have almost no
 * width to spare. Measured on /about with the fonts blocked, content needed against content
 * available:
 *
 *   width    row one (wordmark + actions)   nav (four labels)      header
 *   320px    288.9 / 272.0   −5.8%  wrapped  335.7 / 272.0  −19.0%  153.0px
 *   360px    288.9 / 312.0   +8.0%           335.7 / 312.0   −7.1%  113.0px
 *   375px    288.9 / 327.0  +13.2%           335.7 / 327.0   −2.6%  113.0px
 *   390px    288.9 / 342.0  +18.4%           335.7 / 342.0   +1.9%   88.5px
 *   420px    288.9 / 372.0  +28.8%           335.7 / 372.0  +10.8%   88.5px
 *   640px    288.9 / 592.0 +104.9%           335.7 / 592.0  +76.4%   88.5px
 *
 * The fallback face costs 7.2% on row one (269.4 → 288.9px) and 3.8% on the nav (323.5 →
 * 335.7px). Compare those to the slack: row one has 8.0% at 360px and the nav has 1.9% at
 * 390px. Both are the same order as the difference between two fallback faces, so a CI
 * runner whose default sans is a couple of percent wider than this machine's Arial gains
 * the line that this machine does not. Reserving only for the height measured here would
 * ship a reservation that is correct on this laptop and off by a line somewhere else, which
 * is exactly the failure being fixed. So:
 *
 *   - Below 390px, reserve for 153.0px — row one wrapped AND the nav on two lines. It is
 *     the measured height at 320px, and it is one row-one line away at 360px and 375px.
 *     `pt-48` = 192px, +39.0px in the worst case measured and +79.0px at 360-375px.
 *   - 390px to 767px, reserve for 113.0px — the nav on two lines, which is 1.9% of width
 *     away at 390px. `pt-36` = 144px, so +31.0px if that line appears and +55.5px as
 *     measured. Row one has 18.4% of slack here, so a three-row header at this width would
 *     take a face nearly a fifth wider than Inter, and is not budgeted for.
 *   - `md` and up, 62.0px in both faces, one row with 100%+ of slack on every element.
 *     `md:pt-28` = 112px, unchanged from before this fix, +50.0px.
 *
 * **This section predates the `About Us` chevron** (see the top of this docblock) and its
 * table is left as originally measured rather than re-derived, because the nav's needed
 * width is sensitive to how the flex row is measured mid-wrap and re-deriving it cleanly
 * needs more care than this fix warrants. What matters is that its prediction came true
 * exactly where it said it would: this section already argued the 390-767px band had to
 * reserve for a two-line nav because 390px was "1.9% of width away" from wrapping, and the
 * extra chevron's width is what closed that 1.9% gap — 390px now wraps at both fallback and
 * webfont widths in the "blocked" column of the first table above, which `pt-36` already
 * had headroom for. Nothing here needed to change as a result.
 *
 * The breakpoint is `md` at the top and a literal `min-[390px]:` below it, and neither is
 * interchangeable with `sm`. 320px and 375px are BOTH below `sm` (640px) and need different
 * reservations, so `sm` cannot make the cut that matters; and the 640-767px row above is
 * why the relaxation at the top is at `md` rather than `sm` — the header is still 88.5px at
 * 767px, so relaxing at 640px would cut that band's clearance for nothing.
 *
 * **What it costs.** Almost nothing where it is measured, because the hero copy is
 * bottom-aligned inside a `min-h-[420px]` box: extra top padding only grows the box once
 * padding plus copy exceeds that floor. At 390x844 DPR-3 with the fonts loaded — the review
 * viewport — page length goes `/` 8.23 → 8.23 screens, /about 7.49 → 7.51 (+16px, the
 * `pt-32` → `pt-36` step), /portfolio 5.38 → 5.38. The homepage and /portfolio have more
 * slack above their copy than the step spends, so they do not move at all. Below 390px the
 * band grows by up to 64px on the pages whose copy has already pushed it past the floor
 * (/about, /insights, /investors, /portfolio); /partners and /strategy do not move even at
 * 320px, because their copy is short enough that the box stays at the 420px floor.
 *
 * **What this cannot cover, and the reader should know it.** This is a fixed number sized
 * against a measured worst case, and two inputs to that worst case are CMS-authored: the
 * header CTA's label (`siteSettings.headerCta`) and the four nav labels
 * (`siteSettings.navLabels`). A materially longer CTA label wraps row one at 360px too, and
 * materially longer nav labels take the nav to three lines; either walks the header past
 * what these numbers reserve, and it does it in the fallback face first. Stopping row one
 * from wrapping in `SiteHeader` was the other available lever and was measured and
 * rejected: at 320px row one needs 288.9px against 272px, so closing that 16.9px gap means
 * shrinking the wordmark or the header's inset — a change to an approved design — and it
 * would still not make the header's height stable, because CMS copy can wrap row one at
 * 320px whatever the styling does. The reservation would have to survive a wrapped row one
 * regardless, which is what it now does. The durable fix is a reservation that measures the
 * header instead of guessing at it; that is a bigger change than a CI failure should carry.
 *
 * For the same reason, the header's height must not depend on an interaction. It has twice:
 * revealing Investor Login below `md` wrapped row one and took the header to 155px at
 * 320px, and opening a nav panel, which was an in-flow block below `md`, took it to 186px
 * at every phone width — 58px of eyebrow under the bar on /about and 24px on /insights.
 * Both disclosures are out of flow below `md` now, in the fallback face as well as the
 * webfont one (re-measured at 320px, 375px and 390px with the fonts blocked: 0px of height
 * delta on all three disclosures), and both are pinned by an E2E height-delta assertion —
 * see `SiteHeader.tsx` and `NavDropdown.tsx`.
 *
 * The E2E tests that hold this number are `the hero clears the header at ...`, which runs
 * with the fonts available, and `the hero clears the header with the webfonts blocked at
 * ...`, which is the only one that can see the case this docblock is about. Both are
 * needed: on a warm machine the first cannot fail on a fallback-font regression, because
 * the webfonts are simply there.
 *
 * **Clearance does not depend on the headline's size, and PR 4 was planned on that.**
 * Derived from forty measurements — four routes × the five phone viewports × fonts loaded
 * and blocked — clearance is not free-standing:
 *
 *     clearance = (reservation − header) + slack,   with slack ≥ 0
 *
 * so it is FLOORED at `reservation − header` and cannot be driven negative by putting more
 * content in the overlay. `/about` sits exactly on that floor at every phone width, because
 * its copy already exceeds the `min-h-[420px]` box and the box is therefore content-driven:
 * every "+79.0" and "+31.0" in the table above is `192 − 113` and `144 − 113`, not a
 * coincidence. The homepage confirms it from the other side — it had slack, so a taller
 * headline ate the slack first and only then grew the box downward.
 *
 * The consequence, and the reason it is recorded here: **a bigger headline costs scroll,
 * not clearance.** The 2026-09-09 handover warned the opposite — that bottom-aligned CMS
 * copy would climb into the header as the type grew — and that fear is what made §7 look
 * like a risk to this file. It is not; it is a risk to §6's page-length target instead.
 * PR 4 re-measured after PR 3 and found 51px of homepage slack at 390x844 and zero at the
 * other four widths, which is what held the phone headline to 36px.
 *
 * This holds only while the hero stays `min-h` and the overlay stays in flow. Give the hero
 * a fixed height, or take the overlay out of flow, and the relationship above stops being
 * true while every existing test stays green — so it is now asserted directly by
 * `clearance is floored at reservation minus header, with the webfonts blocked`.
 */
export const HEADER_RESERVATION = 'pt-48 min-[390px]:pt-36 md:pt-28'

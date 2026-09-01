# Why the resource budget is set where it is

`lighthouse-budget.json` is a CI gate, not a formality. It has already caught two real
regressions in this repo, so the numbers are worth explaining rather than leaving as
folklore for whoever changes them next.

## The numbers, and where they came from

| Resource | Budget | Worst case, 2026-09-01 (full-bleed) | Worst case, 2026-08-31 (hero capped) |
|---|---|---|---|
| image | 1400 KB | 1206 KB | 817 KB |
| script | 350 KB | 150 KB | 149 KB |
| total | 2200 KB | 1438 KB | 1048 KB |

**Worst case is not what a visitor pays.** It forces every lazy image to load and lets the
carousel advance through all eight slides, so it converges on "every photograph on the
page" no matter how small the preload window is. First paint on the homepage — the number
that matches what Lighthouse and a real visitor see — measured **723 KB of images and
954 KB total**: two hero crops and three card thumbnails. Lighthouse itself reported 363 KB
of images and no budget overage.

Quote both, and know which one you are quoting. The upper bound is the guard against a
camera original being uploaded; first paint is the number that describes the experience.

"Measured worst case" is the homepage with every lazy image forced to load and the page
scrolled to the bottom — the upper bound on what Lighthouse can observe. In practice CI
sees roughly three quarters of that.

**Measure from a fresh load.** `performance.getEntriesByType('resource')` accumulates
across soft navigations, so measuring after clicking around totals a previous page state
too — it reported 2046 KB for the page in the row above, which actually loads 817 KB.

The image and total budgets were raised from 800 KB and 1600 KB on 2026-08-31, when the
homepage briefly opened on a full-bleed photographic hero. Those original numbers were
sized for a text-led page whose largest asset was a property card thumbnail.

Later the same day the hero was capped at the 1200px content column and the numbers came
*down*: 1141 KB of images became 817 KB. On 2026-09-01 the band went **back** to full
width, on all seven section pages rather than only the homepage, because that was the
design Hunter asked for.

So `sizes` is the lever, and it now reads `100vw` again — honestly, because the band really
is the width of the viewport. That is the expensive answer: at a 1512px viewport the
browser fetches a variant sized for it, which docs measured at 567 KB for one crop. The
saving that used to come from `(min-width: 1200px) 1152px` is gone, and it cannot be
recovered without lying about the layout, which buys bytes by shipping a blurry image.

**What pays for it instead is the preload window, which went back to two.** Only the
current slide and the one it is about to cross-fade to carry an `<img>`. Forward is the
only direction the band auto-advances, so the previous slide is dropped and reloads if
someone clicks a dot backwards. At a window of three the page measured 1206 KB against the
1400 KB budget — passing, but spending headroom reserved for photography that has not been
shot yet.

The budgets were left where they are. They were sized for a full-bleed hero in the first
place, the page passes inside them, and raising a gate that is not failing spends the guard
rather than the headroom.

Roughly 55% headroom is deliberate. Real lobby photography is still to be uploaded and
will likely be heavier than the exterior shots standing in for it today, so the budget has
to absorb that without failing every build. It is still tight enough to catch the failures
that actually happen: an unoptimised original uploaded straight from a camera, or the
carousel's preload window regressing and fetching all eight slides at once.

## Do not raise these to make a build pass

Spec §1 names the old site's 10–20MB camera originals as one of the three reasons this
rebuild exists. When the budget fails, the first question is what got heavier and whether
it needed to.

Both times it has failed so far, the cause was real and the fix was in the code:

1. **All eight carousel slides loading at once.** Every slide sits in the same
   absolutely-positioned box, so the browser treats them all as visible. Fixed by
   rendering an `<Image>` only for a window around the current slide.
2. **The full-bleed hero at 25 KB over.** Fixed at the time by narrowing that window
   further at full-bleed size, where each crop was much larger.

   That narrowing was reversed on 2026-08-31, when capping the hero at the content column
   made its crops the same order as the banner's. It was **reinstated on 2026-09-01** when
   the band went full width again on all seven section pages. The rule underneath has held
   both times: window of three when the band is inside the measure, two when it is
   edge to edge.

   So if you are reading this because the budget failed, check in this order: `sizes` (it
   should say `100vw` and the band should genuinely be full width), then the window, then
   whether someone uploaded a camera original.

## Two traps worth knowing

**`quality` is silently ignored unless allowlisted.** Next 16 ships
`images.qualities: [75]`. A `quality={68}` prop holding any other value falls back to 75
with no warning, no build error, and byte-identical output — three rebuilds in a row
produced exactly the same bytes before this was spotted. Any quality the code asks for
must also appear in `images.qualities` in `next.config.ts`.

**Clear `.next/cache`, not just `.next/cache/fetch-cache`.** Optimised images are cached
separately under `.next/cache/images`. Deleting only the fetch cache leaves stale
variants in place, so a measurement after changing image options reports the old numbers.

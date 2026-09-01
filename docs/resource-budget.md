# Why the resource budget is set where it is

`lighthouse-budget.json` is a CI gate, not a formality. It has already caught two real
regressions in this repo, so the numbers are worth explaining rather than leaving as
folklore for whoever changes them next.

## The numbers, and where they came from

| Resource | Budget | Measured worst case (2026-08-31, after the hero was capped) |
|---|---|---|
| image | 1400 KB | 817 KB |
| script | 350 KB | 149 KB |
| total | 2200 KB | 1048 KB |

"Measured worst case" is the homepage with every lazy image forced to load and the page
scrolled to the bottom — the upper bound on what Lighthouse can observe. In practice CI
sees roughly three quarters of that.

**Measure from a fresh load.** `performance.getEntriesByType('resource')` accumulates
across soft navigations, so measuring after clicking around totals a previous page state
too — it reported 2046 KB for the page in the row above, which actually loads 817 KB.

The image and total budgets were raised from 800 KB and 1600 KB on 2026-08-31, when the
homepage briefly opened on a full-bleed photographic hero. Those original numbers were
sized for a text-led page whose largest asset was a property card thumbnail.

Later the same day the hero was capped at the 1200px content column, and the numbers came
*down*: 1141 KB of images became 817 KB. The cause is worth remembering, because it is the
lever, not the crop size — a full-bleed band says `sizes="100vw"`, so at a 1512px viewport
the browser fetched a variant sized for the viewport (567 KB for one crop) to paint a box
that was never that wide. Telling it `(min-width: 1200px) 1152px` is what saved the weight.

The budgets were left where they are rather than lowered to match. Real lobby photography
is still to be uploaded, it will be heavier than the exterior shots standing in today, and
it now has to cover three preloaded slots rather than two — so the headroom is doing a job.

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

   **That narrowing has since been reversed, deliberately.** Once the hero was capped at
   the content column its crops became the same order as the banner's, so the window went
   back to three — the current slide and both neighbours — and the page still measures well
   under budget. If you are reading this because the budget failed, the window is not the
   thing that regressed; check `sizes` first.

## Two traps worth knowing

**`quality` is silently ignored unless allowlisted.** Next 16 ships
`images.qualities: [75]`. A `quality={68}` prop holding any other value falls back to 75
with no warning, no build error, and byte-identical output — three rebuilds in a row
produced exactly the same bytes before this was spotted. Any quality the code asks for
must also appear in `images.qualities` in `next.config.ts`.

**Clear `.next/cache`, not just `.next/cache/fetch-cache`.** Optimised images are cached
separately under `.next/cache/images`. Deleting only the fetch cache leaves stale
variants in place, so a measurement after changing image options reports the old numbers.

# Why the resource budget is set where it is

`lighthouse-budget.json` is a CI gate, not a formality. It has already caught two real
regressions in this repo, so the numbers are worth explaining rather than leaving as
folklore for whoever changes them next.

## The numbers, and where they came from

| Resource | Budget | Measured worst case (2026-08-31) |
|---|---|---|
| image | 1400 KB | 900 KB |
| script | 350 KB | unchanged |
| total | 2200 KB | 1130 KB |

"Measured worst case" is the homepage with every lazy image forced to load and the page
scrolled to the bottom — the upper bound on what Lighthouse can observe. In practice CI
sees roughly three quarters of that.

The image and total budgets were raised from 800 KB and 1600 KB on 2026-08-31, when the
homepage started opening on a full-bleed photographic hero. Those original numbers were
sized for a text-led page whose largest asset was a property card thumbnail, and a
full-screen hero cannot fit inside them at any sane quality.

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
2. **The full-bleed hero at 25 KB over.** Fixed by narrowing that window further at
   full-bleed size, where each crop is much larger.

## Two traps worth knowing

**`quality` is silently ignored unless allowlisted.** Next 16 ships
`images.qualities: [75]`. A `quality={68}` prop holding any other value falls back to 75
with no warning, no build error, and byte-identical output — three rebuilds in a row
produced exactly the same bytes before this was spotted. Any quality the code asks for
must also appear in `images.qualities` in `next.config.ts`.

**Clear `.next/cache`, not just `.next/cache/fetch-cache`.** Optimised images are cached
separately under `.next/cache/images`. Deleting only the fetch cache leaves stale
variants in place, so a measurement after changing image options reports the old numbers.

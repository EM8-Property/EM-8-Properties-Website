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
954 KB total**: two hero crops and three card thumbnails. Lighthouse against the deployed
site reports 362 KB of images, 703 KB total, and no budget overage — both **lower** than the
725 KB / 405 KB the contained hero was serving before it.

Byte budgets are the stable measurement here. Lighthouse's *performance score* against the
deployed URL is not: seven runs of the same commit returned 87, 87, 87, 97, 98, 87, 87 on
an identical payload. Take five samples before believing a delta, and never compare a
`localhost` run to a deployed one.

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

So `sizes` is the lever, and on 2026-09-01 it read `100vw` — honestly, because the band
really was the width of the viewport. That is the expensive answer: at a 1512px viewport
the browser fetches a variant sized for it, which docs measured at 567 KB for one crop.
The saving that used to come from `(min-width: 1200px) 1152px` is gone, and it cannot be
recovered without lying about the layout, which buys bytes by shipping a blurry image.

### 2026-09-02 — the band fills the screen, and `100vw` stopped being the honest answer

The hero now runs the full height of the viewport as well as its width (`min-h-svh`), and
that changed what `sizes` should say — on phones only.

`sizes` is the width the browser should assume the image occupies. With `object-cover` on
a box **taller than the crop is shaped**, that is not the width of the box: the photograph
is scaled until it covers the box's height and the overflow is cropped off the sides, so
the painted width is the viewport height times the crop's aspect — about 1.8x. At 375x812
that is 1444 CSS px against a 375px box, nearly four times as wide.

Measured at 375x812 with `100vw` still in place: the browser chose the 1200w variant and
painted it across those 1444 CSS px. A 3.6x upscale, over the whole first screen of a
phone, invisible to the build, tsc, lint, the unit tests, and to Lighthouse — whose
"properly size images" audit only looks for images that are too *large*. Desktop was
unaffected, and this is why: there the box is wider than the crop is shaped, so width
drives the cover and `100vw` is exactly right.

It now reads `(max-width: 640px) 400vw, (max-width: 1024px) 200vw, 100vw`.

Those multipliers are approximations and cannot be anything else: `sizes` takes media
queries on **width**, and the quantity being described depends on **height**. 400vw is
calibrated on a 375x812 phone, where 812 × 1.778 / 375 = 3.85. A shorter 375x667 phone
really wants 316vw; a 768x1024 tablet wants 237vw against the 200vw declared. Neither
costs anything while the 1600px cap binds — every over-ask resolves to the same asset, and
every under-ask here still clears the cap at any plausible DPR. **If that cap is ever
raised, these numbers stop being free and want re-deriving.**

**What it costs, measured on the same localhost runner before and after** (Lighthouse's
mobile form factor, 412x823 at DPR 1.75):

| | `main` at f22fc2b | full-screen hero |
|---|---|---|
| image | 363 KB | 725 KB |
| total | 716 KB | 1079 KB |
| budget | 1400 / 2200 KB | 1400 / 2200 KB — no overage |

So a phone now pays what a desktop already paid — 723 KB of images was the documented
first-paint figure for the contained-height band, and the 1600px crop cap is why the two
converge rather than diverge. Every variant at or above 1600w resolves to the same asset,
so once the hint clears that cap it cannot ask for more.

**That cap is the lever if this budget ever fails**, and the alternative is worth writing
down before someone reaches for `sizes` again: requesting a **taller crop** — 4:3 rather
than 16:9 — would make a portrait phone paint about 1080 CSS px instead of 1444, which is
both sharper for the bytes and fewer of them. It is not done here because it re-frames
every photograph on every page, cropping the top and bottom on desktop instead of the
sides on mobile, and that is a design decision rather than a performance one.

Perf score and LCP, five localhost samples: `main` returned 95/95 with LCP 3.0s twice;
the full-screen band returned 98, 96, 95, 92 with LCP 2.3s, 2.8s, 3.0s, 3.3s. That spread
is the noise this document warns about, not a delta. CLS stayed 0.

### 2026-09-02, later — the full screen is the homepage only, and `sizes` splits with it

Hunter looked at all seven pages at full screen and kept it on one. The homepage stays
`screen`; the other six went back to the 420/500/560px `band`, because on those pages a
full-screen photograph put the page's actual content — the purpose, the portfolio grid,
the realized deals — entirely below the fold behind a picture and a title.

The two shapes now carry different hints, and this is the one place the variant reaches
past CSS. `HeroCarousel`'s `SHAPE` map holds both.

| | box | `sizes` |
|---|---|---|
| `screen` (homepage) | `min-h-svh` | `(max-width: 640px) 400vw, (max-width: 1024px) 200vw, 100vw` |
| `band` (six pages) | `min-h-[420px] sm:min-h-[500px] lg:min-h-[560px]` | `100vw` |

**Why `band` keeps the cheaper hint, when the section above argues the accurate one.**
The painted width is the box height times about 1.8, so in the band a 375px phone paints
roughly 747 CSS px against a 375px box — `100vw` understates it just as it did at full
screen. The difference is what the browser then fetches: at 375x812 with `100vw` it picks
the 1200w variant, and 1200 is *wider* than the 747 px it paints. There is no upscale and
nothing to see. At full screen the same variant was painted across 1444 CSS px, which is
an upscale at any DPR and visibly soft. So the accurate hint would cost 49KB a crop on six
pages to correct an artefact that is not there.

That is the general rule worth taking from this: the question is never whether `100vw` is
*accurate*, it is whether the variant it makes the browser pick is narrower than the width
the image is painted at.

**Measured after the split, first paint, images only.** The CI gate audits `/`, which is
unchanged at 725KB.

| page | 1512x900 @1 | 375x812 @3 | variant picked on the phone |
|---|---|---|---|
| `/` (`screen`) | 723 KB | 723 KB | w=3840 → the 1600px cap |
| `/about` | 603 KB | 379 KB | w=1200 |
| `/investors`, `/insights`, `/partners` | 492 KB | 298 KB | w=1200 |
| `/track-record` | 579 KB | 384 KB | w=1200 |
| `/portfolio` | 1250 KB | 1055 KB | w=1200 |

`/portfolio` is the page to watch, and its weight is the ten property-card thumbnails
rather than the hero — it is inside the 1400KB budget but not by much, and it got *lighter*
with the revert. Lighthouse in CI only loads `/`, so nothing gates that page today.

**What pays for it instead is the preload window on the first paint.** Only the current
slide and the one it is about to cross-fade to carry an `<img>` when the page loads; the
slide being faded *out* stays mounted once there is one, so the steady state is three. That
is the same window this component has always had — what changed is that nothing behind the
first slide is fetched before anything has moved.

**Be careful which number you argue from here.** The worst case above cannot tell you
whether this helped: it forces every image to load, so it lands on 1206 KB at a window of
two *or* three. The discriminating number is first paint — 723 KB of images with two crops
against roughly 1080 KB with three. Both fit the 1400 KB budget; the point is the headroom
left for photography that has not been shot yet, not a gate that was failing.

A narrower window than this is not available. Dropping the outgoing slide to save one crop
unmounts its image on the render that starts its 700 ms fade, so the photograph hard-cuts
to the bare scrim and the next one fades up out of that — every six seconds, on all seven
pages. It was written that way once and caught in review.

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
   made its crops the same order as the banner's. On 2026-09-01, with the band full width
   again on all seven section pages, it came back in a narrower form: **first paint** loads
   two crops, and the third slot is spent only on the slide that is actually fading out.
   Narrowing it any further breaks the crossfade — see above.

   So if you are reading this because the budget failed, check in this order: the 1600px
   crop cap (that is what bounds every hint above it), then `sizes` — it should describe
   the width the image is *painted* at, which since 2026-09-02 is several times the
   viewport width on a phone, not `100vw` — then the window, then whether someone
   uploaded a camera original.

## Two traps worth knowing

**`quality` is silently ignored unless allowlisted.** Next 16 ships
`images.qualities: [75]`. A `quality={68}` prop holding any other value falls back to 75
with no warning, no build error, and byte-identical output — three rebuilds in a row
produced exactly the same bytes before this was spotted. Any quality the code asks for
must also appear in `images.qualities` in `next.config.ts`.

**Clear `.next/cache`, not just `.next/cache/fetch-cache`.** Optimised images are cached
separately under `.next/cache/images`. Deleting only the fetch cache leaves stale
variants in place, so a measurement after changing image options reports the old numbers.

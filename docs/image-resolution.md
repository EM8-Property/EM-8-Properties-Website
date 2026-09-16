# Image resolution: which photographs are grainy, and why sharpening cannot fix most of them

Audited 2026-09-16, across the whole live dataset, after Hunter asked for the site to be
reviewed for grainy photos and sharpened.

The headline: **the site splits almost exactly in half, and the two halves want opposite
treatment.** Twelve images are served smaller than they are painted and are grainy because
they are being *stretched*. Twelve are downscaled from large originals and are soft because
of *resampling*. Sharpening corrects the second group and actively damages the first.

`urlForPhoto` in `src/sanity/image.ts` applies that split automatically. Everything below is
the measurement behind it, and the list of photographs no code change can fix.

---

## How the numbers were taken

Sanity encodes source dimensions in the asset `_ref` (`image-<sha>-<W>x<H>-<ext>`), so the
source size of every image is readable without a join. Two facts then decide everything:

1. **`fit=max` never upscales.** Ask for a 1800px crop of a 620px original and Sanity
   returns 620px. The browser then stretches it to fill the box.
2. **`object-cover` on a box taller than the crop is shaped paints the image wider than the
   box.** The painted width is the box height times the crop's aspect ratio.

So the magnification is `painted CSS px ÷ delivered bitmap px`, and the delivered bitmap is
`min(requested width, widest crop of the source at that aspect)`.

Measured on a 1440px desktop, where the property hero and the homepage carousel both paint
1425 CSS px.

---

## Upscaled — sharpening makes these worse

There is no detail to recover. An unsharp mask amplifies the sensor noise and JPEG blocking
that are already why they look grainy. **The only fix is a better original.**

Ranked worst first. `x@2dpr` is what a retina laptop or a phone actually shows.

| where | source | served | x@1dpr | x@2dpr |
|---|---|---|---|---|
| `/portfolio/antioch-industrial` | 620x426 | 620 | **2.30** | **4.60** |
| `/portfolio/knox-in-oak-forest` | 768x576 | 768 | 1.86 | 3.71 |
| `/portfolio/oak-apartments-in-kenosha` | 768x576 | 768 | 1.86 | 3.71 |
| `/portfolio/station-hills-and-belle-court-apartments` | 933x612 | 933 | 1.53 | 3.05 |
| `/portfolio/boulevard-at-central-station` | 985x734 | 985 | 1.45 | 2.89 |
| `/portfolio/worth-apartments` | 1054x627 | 1054 | 1.35 | 2.70 |
| `/portfolio/crestline-villa-apartments` | 1132x844 | 1132 | 1.26 | 2.52 |
| homepage carousel, slide 6 | 1134x696 | 1134 | 1.26 | 2.51 |
| homepage carousel, slide 2 | 1141x738 | 1141 | 1.25 | 2.50 |
| `/portfolio/pinetree-apartments` | 1174x672 | 1174 | 1.21 | 2.43 |
| `/portfolio/oak-forest-k` | 1222x811 | 1222 | 1.17 | 2.33 |
| homepage carousel, slide 5 | 1222x811 | 1222 | 1.17 | 2.33 |

**Antioch Industrial is the one to fix first and it is not close.** A 620x426 original — a
0.26MP file, smaller than a phone screenshot — stretched across the full width of a desktop
hero. Two of the twelve are homepage carousel slides, so they are seen by every visitor
rather than by someone who clicked into a property.

To clear the bar at DPR 2, a property hero wants an original of about **2800px wide**. The
1600px carousel cap means a slide wants about 1600px and gains nothing above it.

## Downscaled — sharpening helps, and is now applied

Served at or above the size they are painted. `urlForPhoto` adds `sharp=15` to these.

| where | source | served | x@1dpr |
|---|---|---|---|
| `/portfolio/waverly-creek-townhomes` | 1448x1086 | 1448 | 0.98 |
| homepage carousel, slide 3 | 1448x1086 | 1448 | 0.98 |
| `/portfolio/382-penn-apartments` | 1600x1199 | 1600 | 0.89 |
| homepage carousel, slides 1, 4, 7 | 1920–5568 wide | 1600 | 0.89 |
| `/portfolio/157-and-cicero` | 4160x3117 | 1800 | 0.79 |
| `/portfolio/antioch-shopping-plaza` | 5280x3956 | 1800 | 0.79 |
| `/portfolio/burbank-manor-apartments` | 5472x3648 | 1800 | 0.79 |
| `/portfolio/embassy-apartments` | 2048x1365 | 1800 | 0.79 |
| `/portfolio/park-townhomes-highland-park` | 5568x3712 | 1800 | 0.79 |
| `/portfolio/reverb-woodland-trails` | 5280x3956 | 1800 | 0.79 |

Note that the two Waverly rows sit at 0.98 — effectively native, not a downscale — so they
fall on the un-sharpened side of the rule. That is correct: there is nothing to correct.

## Not photographs, and not in either table

Team portraits are 309x309 for three of the eight (`Ilan Lior`, `Nir Dror`, and 366x366 for
`Etamar Deshe`) against a 600px request. They are small and they are round and cropped
tight, so the stretch is less obvious than on a building — but they are the smallest assets
on the site and they are the founder's and the board's faces.

---

## The sharpening amount

`SHARPEN = 15`, on Sanity's 0–100 scale, and it is deliberately mild. Resampling a 5472px
photograph down to 1800 throws away two thirds of its linear detail and leaves edges soft;
a light unsharp mask is the standard correction, for the same reason every photo tool
sharpens after a resize. Past about 25 the halos start showing on rooflines and window
frames, which is most of what these photographs are.

## What to do about it

1. **Re-shoot or re-upload the twelve above**, worst first. Nothing in the code helps them.
   `urlForPhoto` self-corrects: a better original crosses the threshold on the next build
   with no code change.
2. A property hero wants **2800px wide or better**. A carousel slide wants 1600px; above
   that the crop cap discards the extra.
3. **Do not raise the 1600px carousel cap to compensate.** PR 4 measured that and declined
   it: at 2048 it put `/portfolio` on desktop at 1564 KB of images against a 1400 KB budget,
   while the first slide stayed 1600x900 anyway because its Sanity source is only 1600x917.
   The prerequisite for raising the cap is higher-resolution source photography, not a
   bigger number. See `docs/resource-budget.md`.

# EM8 website — handover, 2026-09-16 (the phone hero crop)

Supersedes nothing. `docs/handover-2026-09-15-logo-and-track-record.md` is still the
current general-state document and its "Still open" list is unchanged by this session —
read that one first. This covers one change.

## What Hunter asked for

> the carousel images on the phone they are too zoomed in can you zoom them out

## What was actually wrong

`object-cover` on a box taller than the crop is shaped scales the photograph until it
covers the **height** and throws the sides away. The painted width is the box height times
the crop's aspect, and the crop is 1600x900, so that factor is 1.78. Measured on the live
site at 375x812 before the change:

| page | box | photo painted at | zoom | visible |
|---|---|---|---|---|
| homepage (`screen`) | 375x**957** | 1703 CSS px | **4.54x** | 22% of the photograph |
| the six `band` pages | 375x453 | 813 CSS px | 2.17x | 46% of the photograph |

The homepage was the complaint and it is worth seeing once: an interior amenity shot
magnified until it read as two bar stools and a ceiling tile.

**The 957px is the part that rules out the obvious fix.** It is not `min-h-svh`, which is
812 at that size. It is the overlay — eyebrow, four-line headline, five-line paragraph, two
buttons and four stats — growing the box past its floor. Lowering `min-h-svh` on a phone
does nothing at all to the homepage. The height belongs to the copy, and the copy belongs
to the CMS.

So the photograph stops covering the box instead.

## What shipped

Five lines of CSS in `HeroCarousel.tsx`, all of them phone-only:

1. `PHONE_PHOTO_CAP` — the photograph is capped at 400px below `sm`, lifted at `sm` and up.
   400px paints 711 CSS px, which is 1.90x at 375 wide and 2.23x at 320. `band` at 2.17x
   was the calibration target rather than a guess: it is a crop already on the live site
   that reads as a room.
2. `PHONE_SCRIM` — the gradient is anchored to the **photograph** rather than the box on a
   phone, 400px tall, `from-scrim from-0% via-scrim/70 via-65% to-scrim/10 to-100%`.
3. The section background is `bg-scrim`, not `bg-panel`.
4. `screen`'s `sizes` phone clause, 400vw → 225vw.
5. Two new tests in `heroCarousel.test.tsx`.

The box, the copy, `HEADER_RESERVATION` and every `band` height are untouched, which is why
no E2E test needed changing.

## The thing this session nearly shipped wrong

**Zooming out moves the copy onto a brighter part of the photograph, and the scrim was not
anchored where it could follow.**

The gradient was anchored to the 957px box, so `to-scrim/25` landed at the top and the
eyebrow at y=192 sat under **38%** scrim. That was survivable at 4.5x magnification because
whatever tiny patch the crop happened to catch was usually dark. Zoom out and the copy sits
on the picture's real content, which on half these slides is a white kitchen or a pale brick
elevation. Measured over all seven homepage slides at 375px, white eyebrow text:

| | contrast |
|---|---|
| photo luminance behind the eyebrow | 0.19 – 0.53, slide to slide |
| box-anchored scrim at 38%, **new crop** | 2.76 – 4.98 — fails AA on the pale slides |
| photo-anchored scrim, new crop | 5.20 – 8.28 — passes on all seven |

The measurement that reframes this: **the box-anchored scrim was already failing.** On the
*old* crop the same eyebrow measured 2.42 on 382 Penn and 3.34 on ReVerb against AA's 4.5.
The magnified crop was not protecting the text; it was making the failure depend on which
slide happened to be showing. The previous handover's note — "about 9.2:1 on a dark image
and about 2.4:1 on a pale one" — recorded exactly this and filed it as a content
constraint. On a phone it is now a CSS one.

### Why the middle stop is at 65% and not 50%

This is the non-obvious number and it is the one to protect.

`HEADER_RESERVATION` is `pt-48` below 390px and `pt-36` at 390px and up, so the eyebrow
starts at **y=192 on a small phone and y=144 on a large one** — and y=144 is 64% of the way
up a 400px photograph, in the clear end of the gradient. A middle stop at Tailwind's
default 50% left it under 58% scrim and **3.79:1**, failing on exactly the phones most
people hold. Pinning the stop at 65% puts 70% scrim on that line.

Verified at 390x844, all seven slides: worst eyebrow **4.87**, worst headline **7.42**,
against 4.5 and 3.0.

### Why the cap is a fixed 400px and not a multiple of the viewport width

`max-h-[106vw]` is the tempting version — it holds the zoom at a constant 1.9x on every
phone instead of letting it drift between 1.66x and 2.23x. It is wrong, and it took
measuring to see why: a `vw` cap lets the photograph grow taller than the copy, which walks
the eyebrow *up* into the clear end of the gradient. At 639px wide it measured **2.85:1**.

With a fixed photo height the eyebrow lands at one of exactly two places, y=192 or y=144,
whatever the viewport does. A constant that makes the text's position predictable beat a
constant that makes the zoom predictable, because the gradient is calibrated against the
text.

## Rules and traps this change paid for

1. **`400px` is written twice and has to stay one number.** The image cap and the scrim
   height are what put the gradient's opaque end exactly on the photograph's bottom edge,
   so the capped photo dissolves into `bg-scrim` with no seam. Tailwind scans source for
   literal class names, so neither can be interpolated from a shared constant.
   `heroCarousel.test.tsx` pins them against each other instead — that test exists because
   nothing else would catch them drifting apart.
2. **`from-scrim` at full opacity, not `from-scrim/90`.** At 90% a bright slide leaves a
   visible step where the photograph ends. At 100% the edge is exactly the section
   background and no mask on the image is needed. A `mask-image` fade was built first and
   then deleted once the gradient was doing the job — fewer moving parts, one calibration.
3. **`bg-panel` is #F5F5F3 and the hero copy is white.** The moment the photograph stops
   reaching the bottom of the box, the section's own background is visible behind body
   copy, and `panel` would have put white text on near-white. This was caught by reading
   the palette before rendering, which was luck as much as method.
4. **The explicit stop positions are load-bearing and look like noise.** `from-0%`,
   `via-65%`, `to-100%` and the `sm:` set that restores 0/50/100 are the kind of thing a
   later tidy-up deletes as redundant. Deleting them has no visible diff and a failing
   contrast audit. Pinned in a test with the reason in the message.
5. **`sizes` is byte-neutral here, and that was checked rather than assumed.** The clause
   came down from 400vw to 225vw, derived from 320px wide because the multiplier is largest
   on the narrowest screen (711 / 320 = 2.23). Fetching the same crop at `w=3840` and
   `w=1920` returns **byte-identical** responses — the Sanity source is below the 1600 cap,
   so every variant at or above it resolves to the same asset. So this is a saving at DPR 1
   only, and no change at DPR 2 or 3. Do not read the 2026-09-15 handover's 725 KB against
   `measure-phone`'s 408 KB today and conclude the change saved 300 KB; those two numbers
   were taken under different mounted-slide conditions and were not compared like for like.
6. **`band` deliberately keeps `sizes: 100vw` with no phone clause.** The cap applies to
   both shapes, so both now paint 711 CSS px on a phone — but `band` painted 747 before it,
   already hinted at 100vw, so nothing about `band` moved and the 2026-09-15 reasoning that
   declined to correct it stands unchanged.
7. **The `sm` boundary was checked on both sides rather than inferred.** 639px wide → photo
   400px, `max-height: 400px`; 641px → photo 885px, `max-height: none`. Worth doing because
   an earlier reading taken while the pane was mid-resize reported `innerWidth: 0` and made
   desktop look broken. A measurement from a viewport that is still settling is not a
   measurement.

## Verified green

Run on `mobile-hero-crop` at the commit this file lands in:

`npm test` **626** · `npx tsc --noEmit` · `npm run lint` · `npm run test:content` **14** ·
`npm run build` **35 pages** · `npx playwright test` **40**.

Was 624 unit at `04f6d9d`; this change adds 2. Page count unchanged.

`node scripts/measure-phone.mjs --local --images` reports the hero painted at **711 CSS px**
on a phone, against 1703 before, and hero box heights and header clearance unchanged at
every viewport it walks — 957/646/453 at 375x812, slack +79; 846/536/420 at 390x844, slack
+55.5. That the geometry did not move is the evidence that no E2E assertion needed to.

Contrast was measured in-page against the **computed** gradient — the stops parsed back out
of `getComputedStyle().backgroundImage` rather than from the class string — so the model
cannot drift from the CSS that ships.

## Not done

- **Not deployed.** Railway auto-deploy is off and there is no Railway token in this
  worktree, so merging ships nothing. The deploy has to be triggered by someone who can
  reach the Railway API, and then verified by commit hash per
  `docs/deploys-and-migrations.md`.
- **No E2E test covers the crop.** The suite pins hero *height* and header clearance, both
  of which this change deliberately leaves alone, so it passes unchanged — which is correct
  but means nothing in CI would catch the cap being removed. The unit tests cover the class
  strings; the painted width is only checked by running `measure-phone.mjs` by hand.
- **Contrast is not audited in CI on any viewport.** Seven slides were measured by hand at
  375 and 390. A slide swapped in the Studio tomorrow is not checked by anything, and the
  phone is now protected by the gradient while the desktop is still protected only by the
  photograph being dark.
- **Landscape phones are still uncovered**, as the previous handover already noted.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Priorities for the next session

-

### Corrections to anything above

-

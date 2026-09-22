# EM8 website — handover, 2026-09-22 (the phone hero's fade)

One task. Hunter: the fade on the hero image on an iPhone is too much, show more of the
image, and do not change the desktop hero. Phone-only change to `PHONE_SCRIM` in
`HeroCarousel.tsx`.

| phone scrim stop | before | after |
|---|---|---|
| bottom of photo (0%) | 100% | 100% (unchanged, meets `bg-scrim` with no seam) |
| middle | **70% at 65%** | **50% at 50%** |
| top of photo (100%) | 10% | **0%** |

The `sm:` classes are untouched. The computed desktop gradient at 1440 was read off the
local build and the live site and is byte-identical.

## Why the heavier stop could go

The 70%-at-65% stop was calibrated (2026-09-16) to carry the **eyebrow** to 4.5:1 while it
sat bare on the photograph. On 2026-09-18 the eyebrow got its own `bg-black/40` lozenge,
so the gradient no longer has to do that job. Nobody had revisited the gradient since.

## What bounds it now

The headline's **teal** line, not the white text. Measured over all seven homepage
slides at 320, 375, 390 and 430 wide, against the brightest 10% of pixels behind each
text line (stricter than the mean). The eyebrow is measured through its lozenge:

| | eyebrow (4.5) | h1 white (3.0) | h1 teal (3.0) | intro (4.5) |
|---|---|---|---|---|
| before, 70% @ 65% | 10.49 | 9.42 | 5.32 | 10.79 |
| **after, 50% @ 50%** | **5.69** | **4.31** | **3.20** | **8.44** |
| rejected, 55% @ 40% | — | 3.83 | **2.85** | — |

All worst cases are at 390x844, where `pt-36` puts the copy highest on the photo. This is
the lightest of the options tried that passes everywhere. **If Hunter wants still more
picture, the gradient is not the next lever.** The next levers are a taller photo cap (more
picture, but more zoom, which was the 09-16 complaint) or moving the teal accent off the
photograph.

These figures do not reconcile with the 09-16 numbers (e.g. its 7.42 worst headline). That
session used a different sampling method. Compare within one table, not across the two.

The measuring script (canvas-draws each live slide at the painted geometry, blends the
gradient per pixel) was a one-off and is not committed. Nothing in CI audits contrast,
same as before.

## Verified

- 666 unit tests, `tsc`, `eslint`, `next build` clean.
- `heroCarousel.test.tsx` now pins 50/50/0 and says why the stop must not drift lighter.
- Deploy and live check: see the PR.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Priorities for the next session

-

### Corrections to anything above

-

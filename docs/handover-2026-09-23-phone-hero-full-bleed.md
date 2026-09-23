# EM8 website — handover, 2026-09-23 (the phone homepage hero, like the computer)

Supersedes the "where it landed" of `docs/handover-2026-09-22-phone-hero-fade.md`, which
is still the record of the rounds that led here.

Hunter picked option A from the 2026-09-22 mockups: **the phone homepage hero looks like
the desktop one.** The photograph covers the whole hero box, stats included, under the
desktop's gradient ends (90% / 25%) with a **darker middle on a phone: 75%**, where the desktop
has 55%. He asked for "a higher middle gradient" and chose 75% over 65% from mockups. No text
shadow.

| phone, `/` | 2026-09-22 (live until this) | now |
|---|---|---|
| photo | capped at 460px, 2.1x at 390 | **uncapped**, covers the box (~897px at 390): ~4.1x |
| scrim | 40% veil, fade over bottom 25%, Studio-tunable | **90% / 75% / 25%** on a phone, the desktop's 90 / 55 / 25 from `sm` (`SCRIM_SCREEN`) |
| `sizes` phone clause | 256vw | **600vw** (~1070px box at 320 paints ~1900 CSS px) |
| Studio "Phone hero fade" | present, never filled in | **removed** |

**Unchanged, verified against live computed styles:** `/` at 1440 and 768, `/investors`
at 1440 and 390, `/about` at 390. The six band pages keep their 400px phone cap and
`PHONE_SCRIM_BAND`. The phone homepage's computed gradient is 90 / 75 / 25; from `sm` it is the desktop's exactly.

## Decisions worth carrying

- **The zoom is chosen, not an accident.** Hunter compared 1.8x, 2.1x, 2.3x, 2.7x and 4.1x
  across two days and picked 4.1x for the desktop look. The 2026-09-16 cap (the "too
  zoomed in" fix) now applies to the band pages only. Do not "fix" the homepage back.
- **The Studio setting was removed, not left dead.** `homePage.phoneHeroFade` was queried
  on the live dataset first and was `null`, so nothing is lost. With the phone matching the
  desktop, there is no phone-only value left to tune. The schema change is a removal of an
  unused optional field, and the Studio needs redeploying after merge
  (`bash scripts/deploy-studio.sh`) so it stops showing the field.
- **`sizes` 600vw is byte-bounded by the source.** The Sanity crop is capped at 1600px wide,
  so every variant at or above it is the same asset. It changes what a DPR-1 phone asks
  for, nothing above that.
- **Contrast is at least the desktop's.** The phone uses the same ends and a darker middle,
  where the paragraph and buttons sit. It was not re-measured for this change.

## Tests

667 unit, `tsc`, `eslint`, `next build` (35 pages) clean.

- `heroCarousel.test.tsx`: the band's phone cap still equals its scrim height (400). The
  homepage has no cap and a full-box scrim, a 75% phone middle, and `sm:via-scrim/55`;
  with that one swap its stops equal the band's `sm:` stops, so the desktop cannot drift.
  `sizes` phone clause is 595–700vw.
- `pageHero.test.tsx`: no text shadow on either shape.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Priorities for the next session

-

### Corrections to anything above

-

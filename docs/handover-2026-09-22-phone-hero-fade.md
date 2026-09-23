# EM8 website — handover, 2026-09-22 (the phone hero's fade)

One task, many rounds. Hunter: the fade on the homepage hero on an iPhone is too much,
show more of the image, and do not change the desktop hero. PR #59.

## Where it landed

**Homepage, phone only:** an even **40% veil** over the photo, **no text shadow**, a fade
to solid scrim in the **bottom 25%** of the photo, and the photo **460px** tall (a slight
zoom-in: 2.1x at 390 wide, from 1.8x; the band pages stay 400px). Both numbers are **editable in
the Studio** under *Home page → Phone hero fade* (`homePage.phoneHeroFade.veil`,
`.fadeStart`).

| | before (live) | after |
|---|---|---|
| phone scrim, `/` | 100% / 70% @ 65% / 10% | 100% @ 0 → **40%** @ **25%** → 40% |
| phone photo, `/` | 400px, 1.8x at 390 | **460px**, 2.1x at 390 (2.56x at 320) |
| `sizes` phone clause | 225vw | **256vw** (818 CSS px over 320) |
| Studio control | none | veil 0–80 (default 40), fadeStart 0–60 (default 25) |
| text shadow | none | none |

**Unchanged, verified against live computed styles:** `/` at 1440 and 768, `/investors` at
1440 and 390, `/about` at 390. The six band pages keep `PHONE_SCRIM_BAND` exactly.

## How the Studio values reach the page

`HOME_PAGE_QUERY` projects `phoneHeroFade { veil, fadeStart }` → `page.tsx` → `PageHero`
→ `HeroCarousel` (`phoneFade` prop, read only when `variant === 'screen'`) →
`phoneHeroFadeStyle()` in `src/lib/phoneHeroFade.ts`, which clamps and writes
`--hero-veil` / `--hero-fade` inline on the scrim span → the `bg-hero-phone-veil`
`@utility` in `globals.css` reads them. From `sm` up, `sm:bg-gradient-to-t` plus the old
`sm:` stops replace it.

- **A class per value would not work.** Tailwind only emits classes written literally in
  source, and these are whatever an editor types. Hence CSS variables.
- **Clamped in code as well as validated in the Studio**, because `validation` binds the
  Studio only (see `docs/deploys-and-migrations.md`). An empty field renders the defaults.
- The field is an **addition**, which is safe to deploy in any order. The Studio must be
  redeployed **after merge** for editors to see it: `bash scripts/deploy-studio.sh`.
- Values take effect on **publish**, through the existing revalidation webhook. No code
  deploy is needed to tune them.

## Knowingly accepted: contrast on pale slides

Hunter went through 50%, 30%, 10%, lower fades, slower (eased) fades, a text-shadow halo,
a taller photo (2.7x rejected as too zoomed; 2.1x chosen over 2.3x) and the desktop veil. He chose this and explicitly dropped the shadow. Measured over all seven slides at
320–430 wide, against the brightest 10% of pixels behind each line, at 40% veil with a 5% fade and the 400px photo (the 25% fade and 460px photo put the
headline over the same veil, so the headline figures carry over; not re-measured):

| | needs | measures |
|---|---|---|
| eyebrow, in its existing 40% pill | 4.5 | 5.88 – 6.15 ✓ |
| h1 white | 3.0 | 2.60 – 2.82 |
| h1 teal ("choose to live in.") | 3.0 | **1.34 – 1.37** |

**The lever is the Studio's veil.** The lightest treatment measured to pass without help
was a 50%-at-50% gradient (teal 3.20). The eyebrow pill is unchanged from live (an interim
60% phone pill was reverted once the veil made it unnecessary).

The measuring script is a one-off and is not committed. It canvas-draws each live slide
at the painted geometry and blends the gradient per pixel. Nothing in CI audits contrast.

## Tests

668 unit, `tsc`, `eslint`, `next build` (35 pages) clean.

- `heroCarousel.test.tsx`: each shape's photo cap equals its scrim height (460 / 400). The band keeps 70/65/10. The homepage uses
  `bg-hero-phone-veil` and no phone stops. Both share their `sm:` classes. The Studio
  values reach `--hero-veil` / `--hero-fade`, defaulting to 40/25 and clamped to 0–80 /
  0–60. The band ignores them.
- `pageHero.test.tsx`: `PageHero` forwards `phoneFade` on `screen`, not on `band`, and no
  text shadow exists on either.

## Shipped, then superseded

Merged as `6f7cc68` (PR #59), deployed as Railway `d120eba4` and verified on the live page
(460px photo, 40% / 25%, no shadow), Studio redeployed with the new field. **Superseded the
next day** by `docs/handover-2026-09-23-phone-hero-full-bleed.md`: the phone homepage now
matches the desktop and the Studio field was removed.

## Still open

Carried forward, untouched: Antioch photos, `uteg-street-apartments` gallery, no CI
contrast/crop coverage, `/about` → Why EM8, cutover, and the worktree's `.env.local`
missing `RAILWAY_API_TOKEN`.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Priorities for the next session

-

### Corrections to anything above

-

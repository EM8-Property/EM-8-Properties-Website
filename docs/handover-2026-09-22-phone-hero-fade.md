# EM8 website — handover, 2026-09-22 (the phone hero's fade)

One task. Hunter: the fade on the hero image on an iPhone is too much, show more of the
image, and do not change the desktop hero. He was shown 50%, 30% and 10% mockups on a
phone and chose **10%**. PR #59.

## What shipped: homepage, phone only

| | before | after |
|---|---|---|
| phone scrim, `screen` | 100% / **70% @ 65%** / 10% | 100% / **10% @ 50%** / 0% |
| headline + intro | no shadow | `text-shadow-halo` (phone only) |
| eyebrow pill | `bg-black/40` | **`bg-black/60`** on phone, 40% from `sm` |

- `PHONE_SCRIM_SCREEN` and `PHONE_SCRIM_BAND` in `HeroCarousel.tsx` are chosen through
  `SHAPE[variant].scrim`. Their `sm:` halves are one string, and a test pins that.
- `--text-shadow-halo` in `globals.css` is built from `--color-scrim`, not a raw colour,
  because the lint rule bans colour literals in components. The class is
  `text-shadow-halo` (Tailwind 4.3's `text-shadow-*` namespace).
- `Eyebrow` has a new tone, `onClearPhoto`. `PageHero` passes it, plus the shadow, only
  when `variant === 'screen'`.

**Unchanged, verified against the live computed styles:** the desktop on `/` and
`/investors` at 1440, and `/investors` and `/about` at 390. The six `band` pages are exactly
as they were.

## Why the six inner pages did not follow

They were first included by accident, because the phone scrim was one shared constant.
Screenshots looked fine, but measuring them showed their copy sits lower on the 400px photo,
over its brightest middle. At 10%, measured against the brightest 10% of pixels behind each
line with the gradient only:

| | eyebrow, 40% pill (4.5) | eyebrow, 60% pill | h1 (3.0) |
|---|---|---|---|
| homepage, worst of 4 widths | 3.37 | **6.16** | 1.71 (teal 1.58) |
| /investors, /portfolio, /insights | ~3.0 | 5.7 | **1.2** |
| /partners, /about, /strategy | 3.9–4.4 | 6.8–7.5 | 1.5–2.3 |

The homepage was what Hunter looked at and approved. The band pages were scoped back out
rather than shipped unreviewed. **If he asks for them too, measure them with the halo and
show him the pale slides first.**

## What is and is not measured

- The pill at 60% is **measured** and passes on every page and width.
- The headline at 10% **fails on the gradient alone** and is carried by the halo. The
  pixel model cannot score a text shadow, so its legibility was **judged by eye** on the
  palest slide (the white kitchen), not measured. That is the soft spot in this change.
- The lightest scrim that passed with no help was 50% at 50% (teal 3.20). If the halo is
  ever removed, go back to at least that.

These numbers come from a one-off script that draws each live slide into a canvas at the
painted geometry and blends the gradient per pixel. It is not committed. They do not
reconcile with the 09-16 figures, which used a different sampling method, so compare
within a table, not across handovers. Nothing in CI audits contrast, same as before.

## Verified

- 667 unit tests, `tsc`, `eslint`, `next build` (35 pages) clean.
- `heroCarousel.test.tsx` pins both scrims and their shared `sm:` string.
  `pageHero.test.tsx` pins that the halo and 60% pill appear on `screen` and not on `band`.
- **Not yet merged or deployed**: the merge was refused by the session's permission
  classifier and is Hunter's to do. Railway does not auto-deploy. After merging, deploy the
  merge SHA per `docs/deploys-and-migrations.md` and check `/` at 390 on the Railway domain.

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

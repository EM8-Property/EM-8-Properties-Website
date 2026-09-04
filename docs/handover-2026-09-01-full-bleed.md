# EM8 website — handover, end of 2026-09-01 (second session)

Supersedes `handover-2026-09-01.md`, which is now stale in four places: `main` has moved,
the homepage hero is no longer contained, the "Dropped" entry for full-bleed no longer
applies, and three pages it describes as holding "only `seo`" now hold their heading too.
`handover-prompt.md` is older still. All three files are untracked; commit them if you want
them to survive a fresh clone.

## Where things are

| | |
|---|---|
| Worktree | `C:\Users\Kathy\Claude\em8-website\.claude\worktrees\phase-1-implementation`, on `latest`, level with `main` |
| `main` | `f22fc2b` — deployed and verified |
| Deployed commit | `f22fc2b` (checked by hash, not by `SUCCESS`) |
| Studio | Redeployed from `main` after the schema change |
| Live | https://em-8-properties-website-production.up.railway.app |
| Open PRs | none |

## Verified green on `main`

`npm test` 421 · `npx tsc --noEmit` · `npm run lint` · `npm run test:content` 10 ·
`npm run build` 28 pages · `npm run test:e2e` 14 against the live URL.

## Shipped this session

Three PRs, #17 to #19.

- **#17 — every section page opens on a full-bleed photograph.** All seven of `/`,
  `/about`, `/insights`, `/investors`, `/partners`, `/portfolio`, `/track-record` now run
  the shared `heroCarousel` edge to edge with that page's own title laid over it. Before,
  the homepage hero was a 1152px block, five pages carried a thin 220px strip with their
  `<h1>` *below* it in ink on white, and `/investors` had no photograph at all. The two
  detail routes keep no shared band. `HomeHero` became `PageHero`; `CarouselSlot`,
  `carouselPages.ts` and the carousel's two variants are gone.
- **#18 — corrected the performance numbers #17 quoted.** See "measurement" below.
- **#19 — the last three page headings moved into Sanity.** `/portfolio`, `/insights` and
  `/track-record` held only `seo`; their eyebrow, title and intro were literals. This
  finishes plan revision D4 — every page's visible copy is now editable in the Studio.
  Also adds `--only=<step>` to the migration script.

## The two rules that matter most

**1. Applying a Sanity migration ahead of its code is safe for an ADDED field and breaking
for a MOVED or REMOVED one.** Unchanged, and it was exercised correctly this session:
`heading` was applied to production first, the live site was confirmed unaffected, the dry
run was re-run to prove idempotence, and only then did the code ship. Full account in
`docs/deploys-and-migrations.md`.

**2. `npm run migrate-content --apply` with no `--only` is not a backfill, it is a full
content reset.** It runs `createOrReplace` over every property, post, team member and
testimonial from the seed constants, silently reverting anything the team edited in the
Studio. Use `--only=<carousel|pages|seo|headings|header-button|cta>`. The flag fails closed —
`--only`, `--only=`, `--onlyheadings`, a typo, or two `--only` flags all refuse rather than
fall through to the full run. **`cta` is a removal, not an addition**: it unsets
`homePage.ctaBand`, the mutation that took the live homepage down on 2026-08-31, and it
warns before it writes.

## Still open, and who owns it

**Blocks launch, none of it code — unchanged from the previous handover:**

1. Verify `em-8.com` in Resend, then revert `RESEND_FROM` (currently the
   `onboarding@resend.dev` sandbox sender) and `LEAD_NOTIFICATION_EMAIL` (currently
   `hsheyman@gmail.com`, should be `info@em-8.com`). Resend reports the domain
   `not_started` and none of the three DNS records exist — a TXT at `resend._domainkey`
   and CNAMEs at `send` and `rsend`, all of which go in Wix. Resend needs no MX record.
2. Move Railway to an EM8-owned team rather than a personal account (spec §8).
3. Replace the draft footer disclaimer with counsel's version, and answer the
   structured-data question in `docs/disclaimer-draft.md`.
4. Confirm the Antioch OM return figures may be public.
5. DNS cutover in Wix. **At cutover, change `NEXT_PUBLIC_SITE_URL` off the Railway host**
   or every canonical and share card points at the wrong domain.
   `E2E_BASE_URL=https://em-8.com npx playwright test` asserts this; its polarity inverts
   after the move.

**New, and needing Hunter's decision:**

6. **The first carousel slide flattens to grey.** Boulevard's opener is a bright aerial
   drone shot; under the existing scrim at full width it reads as a flat grey panel rather
   than a building. The scrim and the image are both unchanged — full-bleed just makes it a
   much larger grey area. Reordering `siteSettings.heroCarousel` so a darker photo leads
   fixes it in the Studio with no deploy. Measured previously: eyebrow 9.18:1 on a dark
   image, 2.44:1 on a pale one.
7. **`/` and `/about` now open identically** — same headline, same photograph. They used to
   read as different pages. Also a mild duplicate-H1 SEO smell across two indexed pages.
8. **`/insights/[slug]` was excluded from the shared band on my judgement**, not Hunter's —
   he named only `/portfolio/[slug]`. Articles have their own optional `heroImage`, so one
   published without it opens on plain white. One line in `src/lib/heroPages.ts` to change.

**Technical, nobody blocked:**

- **Lighthouse `target-size` fails on the 10px carousel dots**, which is why accessibility
  scores 96 rather than 100. Pre-existing — the live site scored 96 before any of this —
  but it now appears on seven pages rather than six, including a conversion page. Fixing it
  without disturbing the dot spacing is fiddly; it was deliberately left alone.
- **`SectionHeading`'s `level` prop is dead.** `PageHero` owns every `<h1>` now, so no
  caller passes `level={1}`, though `headings.test.tsx` still covers it. Its docstring
  still explains itself in terms of "the five pages that use it for their title".
- Per-`source` rate-limit scoping; no analytics; both generated share cards render at
  regular weight because `next/og` embeds only `Geist-Regular`.
- Phase 2 is Hebrew and only Hebrew. The CSS logical-properties rule is what keeps it
  additive.

**Content EM8 owes** — unchanged: photography for Antioch Shopping Plaza; real lobby
photography (**must be dark**, see item 6); titles and photographs for Nir Dror and Ilan
Lior; **replace the two live testimonials**, both attributed to EM8 insiders presented as
"Investor", one reading "These guys made me buckets of money" on a page advertising a
506(c) offering — still the sharpest compliance item; hero images for the two insight
articles; the Antioch deal room URL and the remaining spec §9 figures.

## On measurement, because it bit twice

Byte budgets are stable and trustworthy. **Lighthouse's performance score against the
deployed site is not:** seven runs of the same commit returned 87, 87, 87, 97, 98, 87, 87
on an identical payload. Take at least five samples before believing a delta, and never
compare a `localhost` run against a deployed one — PR #17 did, quoted a wrong number, and
#18 retracted it.

What is solid about the full-bleed change: payload went **down** (703–717KB total against
725KB, images 362KB against 405KB), no budget overages, CLS 0, and accessibility, best
practices and SEO identical before and after.

## Traps found this session

All added to the README.

- **`npm start` does not replace a server already on port 3000.** The old process keeps the
  port and keeps serving the previous build while the new one exits quietly. Two
  measurements were taken against stale markup before this was spotted. Kill the listener
  first: `netstat -ano | grep :3000`, then `taskkill //PID <pid> //F`.
- **An overlaid header clips hero copy that is bottom-aligned.** The copy climbs as it
  wraps, so it collides only on a narrow viewport and only once long enough — at 375px the
  eyebrow began at y=62 while the header ran to y=68. Desktop looked perfect. The overlay
  reserves `pt-24` for this, and an E2E test now asserts it at both widths.
- **Dropping the outgoing carousel slide breaks the crossfade.** Narrowing the preload
  window to forward-only unmounts its `<Image>` on the render that starts its 700ms fade,
  so the photograph hard-cuts to the bare scrim. Every window test asserted at index 0,
  where this is invisible. `prev` is now tracked in the same state update as `index`.
- **A guard on a GROQ-projected object is not a guard on its contents.**
  `heading { eyebrow, title, intro }` projects to a truthy object even when every field is
  null, so `!copy?.heading` waves through a half-filled heading and renders an empty
  `<h1>`. Check the leaf.
- **`npx prettier` has no config in this repo.** Running it rewrites the file to double
  quotes and semicolons, which is not this codebase's style. Fix indentation by hand.
- **`npm run lighthouse` dies on Windows *after* it finishes** — `chrome-launcher` throws
  `EPERM` removing its own temp directory. `lh.json` is already written; run
  `node scripts/lighthouse-report.mjs` rather than concluding the audit failed.

## How Hunter wants the work done

Superpowers workflow: TDD, and a code review before anything merges. Open a PR, wait for
CI, merge, then trigger the Railway deploy — auto-deploy is off, so merging ships nothing.

Run things and read the output. Every real defect in this project has been invisible to the
build, the tests, lint and Lighthouse, and showed up only by fetching the deployed page or
measuring the rendered one. This session that was a headline under the header at 375px, a
photograph hard-cutting to grey every six seconds, and a migration flag that failed open
into a full content reset. Measure the rendered page; do not assume the fix landed.

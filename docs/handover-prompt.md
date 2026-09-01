Continue building the EM8 Properties website. It is live, deployed, and green. I want to keep editing it.

## Where everything is

- **WORKTREE:** `C:\Users\Kathy\Claude\em8-website\.claude\worktrees\phase-1-implementation`
- **REPO:** github.com/EM8-Property/EM-8-Properties-Website — `main` is what deploys
- **LIVE:** https://em-8-properties-website-production.up.railway.app
- **STUDIO:** https://em-8-properties.sanity.studio and `/studio` on the live site
- **SANITY:** project `v425a6nq`, dataset `production`, **private** (read token required)
- Current `main` is `69548fb`. Branch off `origin/main`, never off the local worktree branch — it goes stale because PRs are squash-merged.

## Read first, in this order

1. `README.md` — commands, the six non-negotiable constraints, and the traps
2. `docs/superpowers/plans/2026-08-28-em8-website-phase-1.md` — **read the Revisions section before trusting any code block in the task bodies**
3. `docs/superpowers/specs/2026-08-28-em8-website-design.md` — the approved design
4. `docs/resource-budget.md` — why the Lighthouse budget is where it is, and two image traps
5. `docs/disclaimer-draft.md` — unreviewed draft footer disclaimer, pending securities counsel

## Verified green as of handover

`npm test` (311) · `npm run test:content` (8) · `npm run build` (27 pages) · `npm run test:e2e` against the live URL (10 passed) · GitHub Actions CI green (jobs: `checks` and `build`)

## Credentials — two different .env.local files, and they differ

- `C:\Users\Kathy\Claude\em8-website\.env.local` — `NEXT_PUBLIC_SANITY_*`, `SANITY_API_WRITE_TOKEN`, `RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL`, **`RAILWAY_API_TOKEN` lives HERE**
- `...\worktrees\phase-1-implementation\.env.local` — the above minus Railway, **plus** `SANITY_API_READ_TOKEN` and `SANITY_REVALIDATE_SECRET`

Both are gitignored. Read them with `node --env-file=<path>`. Never print the values or paste secrets into chat.

## Tooling notes

- `gh` is installed at `C:\Program Files\GitHub CLI\gh.exe` but is **not** on PATH. Use `export PATH="/c/Program Files/GitHub CLI:$PATH"`. Authenticated (scopes: repo, workflow).
- No Docker locally, so the image cannot be built here.
- Railway is driven via GraphQL at `https://backboard.railway.com/graphql/v2` with header `Project-Access-Token` (**not** `Authorization: Bearer`).
  project `4225ede5-e320-4a62-8ccb-42a437d708a3` · environment `4260bc70-c3ea-448f-ad04-6541f3acc773` · service `5d00810f-87c2-4254-963e-b654812d53fd`
  Deploy with `serviceInstanceDeploy(serviceId, environmentId, latestCommit: true)`.
- **Railway auto-deploy is OFF.** Merging to `main` does not deploy. Trigger it via the API every time.

## TEMPORARY config that must be reverted

Lead notifications use Resend's sandbox sender because em-8.com is not a verified sending domain. On Railway right now:

- `RESEND_FROM = EM8 Website <onboarding@resend.dev>` → **delete** once verified
- `LEAD_NOTIFICATION_EMAIL = hsheyman@gmail.com` → back to `info@em-8.com`

The sandbox sender only delivers to the Resend account owner, which is why the recipient moved too. Resend currently reports `em-8.com` as `not_started`. The three DNS records needed in Wix are in `scratchpad/resend-dns-records.txt` — a TXT at `resend._domainkey` and CNAMEs at `send` and `rsend`. **Resend needs no MX record**; their support said otherwise and was wrong.

## Traps that already cost hours — do not rediscover these

**Railway / deploy**
1. Railway **stages** variable edits in the UI. They do nothing until you click Deploy. A variable can look set and not be.
2. Auto-deploy is off — the environment has zero deployment triggers.
3. `gh pr merge` fails locally with `fatal: 'main' is already used by worktree` — **the merge still succeeds on GitHub.** Confirm with `gh pr view <n> --json state` rather than retrying.

**Sanity**
4. A content edit does **not** appear on the next `npm run build`. Next's Data Cache serves the old response. Delete `.next/cache` (see trap 11) or rely on the publish webhook.
5. Portable Text needs `_key` on every block **and** every span. Sanity accepts writes without them and the site renders fine — only the Studio breaks, with "Missing keys".
6. Sanity webhooks: type must be `document`, not `transaction`. Custom headers live in a field called **`headers`**, not `httpHeaders`, set by `PATCH https://api.sanity.io/v2021-06-07/projects/<projectId>/<hookId>`. A webhook missing `x-revalidate-secret` 401s on every call and publishes silently never appear.
7. `sanity schema extract` needs `--force` or it fails on every run after the first.
8. Run `bash scripts/deploy-studio.sh` after **every** schema change, or editors get stale fields.

**Next / images**
9. **Next 16 allowlists image qualities and ships with only `[75]`.** A `quality={68}` prop holding any other value is silently ignored — no warning, no build error, byte-identical output. Any quality the code asks for must also be in `images.qualities` in `next.config.ts`.
10. Optimised images cache in `.next/cache/images`, separately from `fetch-cache`. Clear the whole `.next/cache` after any image-option change or you measure stale bytes.
11. `npm start` warns with `output: 'standalone'` but still serves; it is fine for local measurement.
12. Lighthouse will not run locally on this Windows machine (EPERM on temp cleanup). Measure image weight in the browser instead and let CI be the authority.

**Testing / shell**
13. If a dev server is on port 3000, Playwright silently reuses it and tests the **preview** dataset. Always set `E2E_BASE_URL` to test the deploy.
14. Files in this repo are CRLF. Multi-line regex replacements with `\n` silently fail — normalise with `.replace(/\r\n/g, '\n')` first.
15. `node -e` mangles apostrophes and quotes in the shell. For any patch containing prose, **write the script to a file and run it**, or use the Edit tool.
16. `tsc --noEmit` catches things vitest does not: a mangled `'/'` became a bare `/`, which esbuild parsed as a regex literal, so 294 tests passed on genuinely broken source. Always run the typecheck.

## Architecture decisions worth knowing before you edit

- **Homepage banding is derived, not hardcoded.** Every section is conditional, so `Band` + `alternatingTones` computes white/grey across whatever actually renders. Do not put `bg-panel` on a homepage section — it will collide the moment a different combination of sections renders.
- **Page copy lives in Sanity**, in four pinned singletons: `homePage`, `aboutPage`, `partnersPage`, `investorsPage`. Each page throws if its document is missing. Still hardcoded: each page's SEO `metadata` title and description, because Next's static export cannot read the CMS without converting to `generateMetadata`.
- **The carousel** is one list on `siteSettings.heroCarousel`, shown on six pages (home, portfolio, track record, insights, partners, about) via `CarouselSlot`'s exact-match path list. Full-bleed on the homepage only. Only a window of slides carries an `<Image>` — loading all eight blew the resource budget twice.
- **The header overlays** the photo on those six pages with an 85% white scrim; a test pins that alpha against the contrast floor.
- **`showInPortfolio`** hides a property from the Assets listing only — it stays an offering, keeps its page, and a sold asset still reaches /track-record.
- **Migration seeding rules:** page documents and the carousel seed only when absent; `publiclyOffered` and `showInPortfolio` honour an *explicit* stored boolean so a Studio decision survives a re-run. Verify both directions after touching this.

## Content

Sanity is the single source of truth. `scripts/content/em8-content.mjs` holds the payload with provenance for every figure; `scripts/migrate-content.mjs` writes it (dry run by default, `--apply` to write, idempotent). Gated offline by `tests/unit/contentSource.test.ts` **before** upload, and against the live dataset by `npm run test:content`.

**Deliberately empty — do not invent these:** municipal statistics, entitlement and zoning-litigation claims, Boulevard's target returns and retail suite mix, and Metra walk times not yet confirmed.

Real figures that replaced spec §9's invented ones: Burbank 1.99x exiting 2022, Embassy 1.37x exiting 2023. Antioch Shopping Plaza's 17.7% targeted levered IRR / 2.2x / 7-year hold come from its July 2026 OM.

Unit counts are split into residential and retail on purpose. Metra walk times are 5 minutes on the five transit properties, confirmed by Hunter on 2026-08-30 — his call, on the record.

## Backlog

Full detail: https://claude.ai/code/artifact/c0af14cb-8a7d-4135-9283-82d7ae9610f8

**Blocks launch**
1. Verify em-8.com in Resend, then revert the two variables above
2. Move Railway to an EM8-owned team, not personal (spec §8)
3. Replace the draft disclaimer with counsel's version
4. Delete three test lead documents (2026-08-31, hsheyman@umich.edu) — **ask me before deleting**
5. Confirm the Antioch OM return figures may be public (the OM is marked confidential)
6. DNS cutover in Wix. Keep Netlify up two weeks as rollback. **At cutover, change `NEXT_PUBLIC_SITE_URL` off the Railway host** or every canonical URL and share card stays wrong.

**Content EM8 owes**
- Photography for Antioch Shopping Plaza — the only live offering has no images at all
- Real lobby photos for the carousel. Five professional shots of 4800 157th St are in Drive including two genuine lobby images, 6–8MB each
- Titles and photographs for Nir Dror and Ilan Lior (both currently read "Board Member")
- Replace the two live testimonials — they read as test entries, one says "These guys made me buckets of money", which is a performance claim in an attributed quote on a page advertising a 506(c) offering
- Review the two starter insight articles, written in EM8's voice
- The Antioch deal room URL
- Remaining spec §9 figures

**Technical**
- The newsletter CTA sits on twelve pages sharing one 100/hour global rate-limit budget with the investor form. A burst could 429 a real investor and write no lead at all. Recommendation was to raise `GLOBAL_LIMIT` in `src/lib/rateLimit.ts` to 300–500. **Hunter approved raising it — not yet done.**
- No analytics of any kind
- No JSON-LD structured data
- Page `metadata` still hardcoded
- Phase 2 is Hebrew and only Hebrew; no plumbing built, deliberately

## How I want you to work

Follow the superpowers workflow: TDD, and a code review before anything merges. Open a PR, wait for CI, merge, then trigger the Railway deploy.

**Run things and check the output rather than trusting that they worked.** Almost every real bug in this build was invisible to tests, typecheck, lint, and Lighthouse, and only showed up by looking at the running site or the live API — a stale preview server faking an E2E pass, a webhook type that silently dropped headers, five pages with no `<h1>`, a mobile nav painted off-screen, an image `quality` prop that did nothing, and grey-on-grey that was two adjacent sections rather than the component I first blamed. Measure the rendered page; do not assume the fix landed.

Don't paste secrets into chat. Read them from the env files.

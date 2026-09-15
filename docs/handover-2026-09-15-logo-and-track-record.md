# EM8 website — handover, 2026-09-15 (logo and track record)

Supersedes `docs/handover-2026-09-15.md`, written earlier the same day, and keeps it beside
it. The topic suffix follows `handover-2026-09-01-full-bleed.md`; two handovers landed on
one date because two sessions did.

## Where things are

| | |
|---|---|
| Worktree | `C:\Users\Kathy\Claude\em8-website\.claude\worktrees\phase-1-implementation` |
| `main` | `4c34fa7` at the time of writing — run `git log --oneline -1 origin/main` rather than trusting this |
| Deployed | `4c34fa7`, confirmed by **commit hash** from the Railway API and by live content |
| Live | https://em-8-properties-website-production.up.railway.app |
| Studio | https://em-8-properties.sanity.studio — **redeployed 2026-09-15**, `dealStory` gained three fields |
| Sanity | project `v425a6nq`, dataset `production`, private — a read token is required |
| Railway | **auto-deploy is OFF.** Merging ships nothing. The sequence in the previous handover is correct and was followed twice today. |

## Shipped — PRs #36, #37, #38

### #36 — the logo

`EM8` in Cormorant Garamond Light with a teal `8`, from two assets Hunter supplied. Header
takes the bare mark, footer the stacked lockup (rule over letterspaced `PROPERTIES`). Body
type is untouched: Inter and Oswald are where they were.

The old wordmark was spelled out character for character in **three** files, and the first
thing the change found was that it had to be made in all three. `components/layout/
Wordmark.tsx` now owns the two a browser paints. The share card cannot share it — Satori
takes inline styles and no classes — so it stays a separate drawing with tests pinning the
parts that would drift.

One deviation from the artwork, made deliberately and told to Hunter rather than done
silently: the lockup's `PROPERTIES` is about `#9A9A9A` in the source file, roughly 2.8:1 on
white, which at 10px is illegible rather than quiet. It ships in `ink-secondary`. The teal
`8` **is** the artwork's bright teal — WCAG exempts a logo — but the mark is set at 24px so
`--color-teal`'s own "24px and up" rule is satisfied without leaning on the exemption.

### #37 — two alignment fixes

Homepage hero copy back onto the content measure. `screen` carried `p-6 sm:p-10`, an inset
from the *image* edge; at 1440px the headline sat at x=40 while the body text below started
at x=144. Both at x=137 now.

Footer lockup centred. `items-center` with `self-stretch` on the rule, and `-me-[0.42em]` on
`PROPERTIES` to cancel the trailing letter-space so the word is *optically* centred rather
than box-centred.

### #38 — the realized track record

Seven new sold properties plus realized figures for Burbank and Embassy. `dealStory` gained
`acquiredYear`, `grossIrr` and `salePrice`, all optional. Migration applied 2026-09-15,
11 mutations, verified against the live dataset.

Nine properties now publish a gross IRR. Two rows of the sheet are deliberately absent, each
with its reason stored in the payload: **ReVerb**, which the site says is still owned, and
**Old 157th**, which sold to an EM8 affiliate to assemble the 157 & Cicero redevelopment and
so is not an arm's-length exit. Hunter confirmed both omissions and does not want either.

## Six things this session got wrong

Recorded because five of the six were caught by something other than my own reasoning.

1. **I shipped #37 and #38 without running E2E, and two E2E tests were red on merged
   `main`.** Both pinned the homepage hero at the photograph's edge, which #37 deliberately
   reversed. I updated the *unit* test that pinned it (`pageHero.test.tsx`) and never looked
   for the E2E pair. It was caught only because writing this handover required running the
   suite to say "verified green" honestly — the merge and the deploy had already happened.
   **The site was never wrong; the tests were.** Fixed in the same commit as this file.
   Lesson, and it is the same one as trap 5 in the previous handover: a claim of green is
   not a run.
2. **I mapped Knox/Kilpatrick onto the existing `oak-forest-k` from the name alone.**
   Hunter corrected it — Oak Forest K is on Lamon Avenue, K&K on Knox. They are different
   properties, so K&K was a new record rather than an overlap.
3. **I flagged the homepage's 36.2% as unsupported by comparing it to the wrong row.** The
   sheet has an "Actual Average Annual Return" column averaging 6.2%; Hunter pointed out
   that is not return *on equity*. Recomputed properly — (multiple − 1) ÷ years held,
   averaged across the eleven — it is 35.8% against the site's 36.2%. The figure was right
   and my objection was not.
4. **My first Sanity query projected `name`, which no property has, and returned `null`
   eleven times.** I then reasoned about identity from slugs for several turns instead of
   noticing that a field coming back null for *every* document means the field is wrong.
5. **The migration's first dry run matched properties on `_id` and reported a live property
   as missing.** Ids are not slugs here: Burbank is `property-burbank-manor` behind the slug
   `burbank-manor-apartments`. The step failed closed and said which document it could not
   find, which is the only reason that was a wasted minute rather than a duplicate Burbank
   in production.
6. **I invented a filter change for Wisconsin before checking.** Three of the new properties
   are in Kenosha and I assumed `state` was filterable. It is rendered and never filtered
   on, and the map centres on each property's own coordinates, so the work was zero.

## Rules and traps this session paid for

1. **Satori's fonts are all-or-nothing.** `@vercel/og` uses its bundled default *only* when
   a card passes none (`fonts: options.fonts || defaultFonts` in its source). The moment one
   custom font is supplied the default is gone and every glyph it lacks renders as a blank
   box. Asking for the nine-glyph wordmark subset alone would have produced a correct `EM8`
   above a headline of empty rectangles — in a PNG that only ever renders inside someone
   else's link preview, where nothing in the build, the tests or a typecheck looks at it.
   `shareCardFonts()` supplies both faces together and a test pins that it does.
2. **A serif fallback is not the same shape as a condensed sans fallback, and
   `headerReservation.ts` is measured against the fallback.** `next/font`'s `adjustFontFallback`
   default is what kept the blocked-font wordmark within 2.1px of the loaded one. If anyone
   sets it to `false`, re-measure that table.
3. **A number in a chart or a table is not the same kind of content as a sentence** — the
   previous handover's rule, and it is why the track-record payload is **generated** from the
   spreadsheet by `scripts/dev/gen-track-record.mjs` rather than typed. Eleven deals times
   five figures is fifty-five chances to fat-finger something a reader takes for a
   measurement.
4. **Name a field for its basis when two bases exist.** `grossIrr`, not `irr`. The sheet has
   a Net IRR to LPs for two of eleven deals; Burbank is 51.7% gross against 42.5% net. A
   field called `irr` loses nine points of meaning the first time someone types a net figure
   into it. The renderer says "Realized Gross IRR" for the same reason, and its docblock
   says the word gross must not be tidied away.
5. **A migration that only adds optional fields buys its way out of the ordering rule.**
   `docs/deploys-and-migrations.md` records that a *required* leaf is safe early and fatal
   late. Every field #38 adds is optional, so it could run before or after the deploy, and a
   property with no figures renders no figures.
6. **Refuse rather than overwrite a published figure.** Burbank and Embassy already carried
   an `equityMultiple` and `exitYear` that matched the sheet exactly — which is what
   confirmed those two mappings. The step now throws if a sheet figure ever disagrees with a
   published one, instead of silently replacing a return an investor may have read.
7. **Alignment bugs hide below 1248px.** The content measure is flush at 24px there and the
   old image-edge inset was 40px — sixteen pixels apart, invisible. The 104px gap only opens
   on a wide desktop. Every phone and tablet check passed for a week. The E2E test for this
   deliberately runs at 1512/1440/1280 for that reason.
8. **`gh pr merge` fails from this worktree and succeeds on GitHub.** Carried forward from
   the previous handover because it happened again on #36 and #37: `fatal: 'main' is already
   used by worktree`, followed by `state=MERGED`. Confirm with `gh pr view <n> --json state`.
9. **`rm -rf .next` before a measured E2E run** — still true, still silent.

## Still open

### For Hunter, in the Studio

| item | state |
|---|---|
| Crestline's map pin | **Street-level only.** Three OSM candidates for W 115th St spanned about 1.2 miles, all labelled the same; seeded with the Alsip match and listed in `TRACK_RECORD_COORDS_UNCONFIRMED`. The other six new pins are house-number exact. |
| The seven new titles | **Provisional.** Built from the sheet's internal labels plus a descriptive noun — "Worth Apartments", "Uteg Street Apartments". Rename freely; nothing depends on the words. |
| Uteg's 6.0% gross IRR | **Worth checking against the source model.** A 1.52x over 4.1 years implies roughly 11% on a bullet cash flow. It is live and it is the weakest line in a record that otherwise runs 15–52%. |

### Carried forward, unchanged

- `/about` → Why EM8 section is **still empty**, both heading and body. The section and its
  nav link stay hidden until it is filled. The oldest item on this list.
- Oak Forest K has an overview and a business plan, both operational; §3 asked for
  city-involvement and partnership copy. Hunter's call whether that still matters.
- Burbank and Embassy have no business plan. Not rendered for sold assets, so cosmetic.
- `/strategy`'s search description mentions partners, which is `/partners`. One-field fix.
- **Multi-paragraph PortableText still renders as one unbroken wall** on `/insights/[slug]`
  and `/portfolio/[slug]`. Fixed on `/strategy` only. The fix is `space-y-4` on the wrapper,
  or better a shared `Prose` component.

### Blocks launch, none of it code

Unchanged: Resend domain verification and reverting `RESEND_FROM` /
`LEAD_NOTIFICATION_EMAIL`; moving Railway to an EM8-owned team; counsel's footer disclaimer;
the DNS cutover in Wix and `NEXT_PUBLIC_SITE_URL` with it.

**New and worth counsel's eye:** the site now publishes nine realized gross IRRs and
multiples. Hunter's decision of 2026-09-15 was that these are ungated — visible to any
visitor, not behind the 506(c) `publiclyOffered` gate that Antioch's *target* returns use.
The existing footer disclaimer already covers past performance and realized results; whether
it is sufficient for a nine-deal track record is a question for a person with a licence.

## Verified green

Run on merged `main` at `4c34fa7`, not carried forward from a branch:

`npm test` **624** · `npx tsc --noEmit` · `npm run lint` · `npm run test:content` **14** ·
`npm run build` **35 pages** · `npx playwright test` **40**.

Was 607 unit and 29 pages at `a4b9b4a`. #36 added 6 tests, #38 added 11. The page count moved
29 → 35 with the seven new property routes.

The two E2E tests fixed in this commit were **red on `main`** between `26c2f1f` and this
commit — see "things this session got wrong" #1. Nothing shipped broken; the assertions had
been inverted by an intended change and I had not re-run them.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude. Put decisions, corrections, priorities, or
anything the next session should know before it starts reading code.

### Priorities for the next session

-
-
-

### Corrections to anything above

-

### Decisions I have made that are not in the docs yet

-

### Content I am going to write, and when

-

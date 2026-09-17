# EM8 website — handover, 2026-09-17 (the hero copy's entrance)

One task: Hunter asked for the hero copy to slide up over the photograph the way it does on
the old em-8.com, on every page with an image hero. Shipped at `242a161` (PR #48), deployed
as `6ed23359`, and verified on the live site route by route.

**A second thing came out of shipping it, and it is arguably the more useful finding: a
merge to `main` does not deploy.** The procedure, the token type and the identifiers are now
written down in `docs/deploys-and-migrations.md` → "Deploying the code". See the last
section here.

It **extends** `docs/handover-2026-09-16-map-and-lightbox-fixes.md` rather than replacing
it. That file's list of stale-state failures grew again here, and the addition is the most
embarrassing of the five because it very nearly produced a confident, wrong claim about a
site Hunter owns.

## What shipped

The whole hero copy block — eyebrow, headline, intro, buttons, stats — fades up 48px over
one second as the page opens, on all seven routes with an image hero: `/`, `/about`,
`/insights`, `/investors`, `/partners`, `/portfolio`, `/strategy`.

One block, not five staggered. That is what the old site does, and it reads as the page's
title arriving rather than as a slideshow. It lives on `HeroCarousel`'s overlay, which is
the one element both `screen` and `band` share, so the two shapes cannot drift apart.

The numbers are **read off em-8.com, not invented**. Its copy block wears
`transition-all duration-1000 ease-out` and toggles `opacity-0 translate-y-12`, so this is
1s, `cubic-bezier(0, 0, 0.2, 1)` and 48px. Sampled side by side on a visible headless page:

| | em-8.com | this site |
|---|---|---|
| ~200ms | 0.47 opacity, 25.4px | 0.53 opacity, 22.7px |
| ~450ms | 0.74, 12.5px | 0.79, 10.3px |
| ~1030ms | 1.00, 0px | 1.00, `transform: none` |

## The three decisions worth carrying

### 1. A CSS animation, not the old site's JS class toggle

**The old site's version is broken right now, and that is why.** On a reload, its hero copy
sits at `opacity: 0` and `translateY(48px)` indefinitely and the headline never appears at
all. The class string still reads `opacity-0 translate-y-12`, so it is React's toggle that
never fires rather than a transition that stalls — a first visit runs the fade cleanly, a
reload does not.

Copying that mechanism would have copied that bug. An animation runs off the paint, so
there is no state left that can fail to change and no JS in the path at all.

The stake is higher here than it was there: **this hero carries each page's only `<h1>`**. A
title that needs JS to become visible is a title that can go missing — from a reader, and
from a crawler.

### 2. `backwards` fill, and the containing block nobody would have found

The keyframes are `from`-only, so the end of the animation is the element's own resting
style. With `backwards`, the animated `opacity` and `transform` are dropped the instant it
finishes rather than held.

That is not tidiness. **A transformed element is a containing block for `position: fixed`
descendants.** `InvestorPopup` is `fixed inset-0 z-50` and is one component away from this
subtree. `forwards` or `both` would have left a permanent transform on the overlay and
broken the first fixed overlay anyone rendered inside a hero — months later, with nothing
pointing back here.

It is the same shape of fault as the Leaflet z-index bug recorded on 2026-09-16, and it is
avoided the same way: **at the thing that creates the stacking context, not at the thing it
breaks.**

### 3. The no-photograph fallback deliberately does not animate

`PageHero`'s fallback branch is ink on white with no photograph for the copy to arrive
over — and it is the branch that renders when the CMS has lost its slides. That is the last
element on the site to make conditional on an animation. A unit test asserts on the
*rendered* class rather than on the source, so it fails if the utility is ever hoisted to a
wrapper both branches share.

## The E2E suite now runs with reduced motion

`playwright.config.ts` sets `contextOptions: { reducedMotion: 'reduce' }`, and anyone adding
a test here should understand why.

**Most of this suite measures where things are.** The eyebrow's `y` against the bottom of
the header, the hero's height against the fold, the painted width of a crop. A transform
moves the box `boundingBox()` reports, so every one of those assertions would have been
reading a position the copy is only *passing through*.

Playwright waits for an element to be stable before it **acts**. These tests do not act,
they measure, and a measurement has nothing to wait for. Under `reduce` the copy paints at
its resting position on the first frame and all forty pre-existing assertions mean exactly
what they meant before the animation existed.

The seven new tests opt back out with `page.emulateMedia` and are the only place the *end*
of the animation is checked: that it settles within 0.5px of where the reduced-motion run
says it rests, per route. `scripts/measure-phone.mjs` got the same treatment — its
`clearance` column is `eyebrow.y − header bottom`, which is precisely the number a transform
corrupts.

> It goes under `contextOptions`, **not** as a top-level `use` key as every example online
> shows. Playwright 1.62 has `reducedMotion` on `BrowserContextOptions` only, and `tsc`
> rejects the other spelling. Its own config docstring in
> `node_modules/playwright/types/test.d.ts` nests it the same way.

## A failure mode this repo had no guard for

**A Tailwind `animate-*` utility with no matching `--animate-*` in the theme compiles to
nothing. Silently.**

`tsc` does not read class strings. ESLint does not either. The build succeeds. Tailwind
emits no rule and no warning. The page simply never animates and nothing in the repo says
so — not one of the 659 unit tests, not the content suite, not the build.

`tests/unit/pageHero.test.tsx` now reads `globals.css` and asserts both the `--animate-*`
key and the `@keyframes` block exist. The E2E test covers the other half by reading
`getComputedStyle(el).animationName` off the **built** CSS, which is the only way to know
Tailwind actually emitted a rule rather than that a class name is present in a string.

This generalises: any Tailwind utility backed by a theme key can dangle this way.

## Tests, each seen red first

Six unit assertions and seven E2E tests. Every one was confirmed failing against a broken
version before being committed — with the utility removed, with the theme key renamed, with
a `to` keyframe added, with the fill changed to `both`, and with the animation hoisted onto
the no-photograph fallback.

**One of them caught itself, and it is the reason that rule exists.** The test reading the
keyframes used the obvious regex, `\{([\s\S]*?\})`. Non-greedy, so it stops at the first
closing brace — which is the end of the `from` block. It read a rule containing `to` as a
rule containing only `from`, and went green against exactly the fault it was written to
catch. It counts braces now.

A test that has never been seen red is a guess; a test that *was* seen red still has to be
seen red for the **right reason**.

## The fifth stale-state failure

The four recorded on 2026-09-16 were a warm image cache, a leftover server on port 3000, a
browser pane mid-resize reporting `innerWidth: 0`, and an upload verified by counting
totals. Here is the fifth:

**CSS animations are frozen at `currentTime: 0` in a hidden browser pane.**

The first reading of em-8.com was taken in the Claude desktop browser pane while that pane
was hidden. `document.visibilityState` was `hidden`, the animation's `playState` read
`running` while its `currentTime` never left 0, and the copy sat at `opacity: 0` for as long
as it was sampled. The conclusion drawn — *the old site's animation never fires* — was then
tested against this site's brand-new implementation, which looked **exactly as stuck**, for
a reason belonging to neither site.

Re-measured in a visible headless context, this site was correct and the old site really is
broken on reload. So the claim survived, and that is the uncomfortable part: **it was right
by luck, and it was going to be written into a commit message either way.** Had the old site
been fine, the session would have shipped a confident published statement that a site Hunter
owns is broken.

`playState: 'running'` is the specific trap. It looks like a live animation. It says nothing
about whether time is advancing.

The rule from 2026-09-16 is unchanged and now has one more instance: **a run against state
you did not establish is not a run.** The narrower version for anything visual: *measure
animation in a context you have confirmed is visible* — headless Playwright is visible,
a hidden pane is not.

## Verified green

On merged `main` at `242a161`:

`npm test` **659** · `npx tsc --noEmit` · `npm run lint` · `npm run test:content` **14** ·
`npm run build` **35 pages** · `npx playwright test` **47** (40 before), on a server started
from a cleared port 3000.

And on the **deployed** site at 1280x720, each route loaded twice — once under reduced
motion for the resting position, once animated and awaited to completion — with
`visibilityState` asserted `visible` on every run:

| route | `animation-name` | resting `y` | settled `y` | delta | `transform` after |
|---|---|---|---|---|---|
| `/` | `hero-rise` | 112.0 | 112.0 | **0.00** | `none` |
| `/about` | `hero-rise` | 112.0 | 112.0 | **0.00** | `none` |
| `/insights` | `hero-rise` | 133.9 | 133.9 | **0.00** | `none` |
| `/investors` | `hero-rise` | 181.6 | 181.6 | **0.00** | `none` |
| `/partners` | `hero-rise` | 322.4 | 322.4 | **0.00** | `none` |
| `/portfolio` | `hero-rise` | 181.6 | 181.6 | **0.00** | `none` |
| `/strategy` | `hero-rise` | 274.7 | 274.7 | **0.00** | `none` |

`animation-duration` 1s and `animation-fill-mode` `backwards` on all seven, and
`animation-name: none` under reduced motion on all seven. The delta is the number that
matters: the copy lands on exactly the pixel the rest of the E2E suite believes it sits on.

## The deploy does not happen on merge

PR #48 merged at 16:28 and the newest Railway deployment was still `87d6d5d` from that
morning. Listing the service's deployments afterwards showed **one** for the merge commit —
the one asked for by hand — and none from the merge itself.

Railway is connected to the GitHub repo and every deployment carries the branch, commit,
author and commit message, which is exactly why this reads as a push trigger and is not one.
`.env.example` asserted "Railway deploys by connecting to the GitHub repo — no API key is
needed" and has been corrected.

The full procedure is in `docs/deploys-and-migrations.md` → "Deploying the code". The two
things worth knowing before reading it:

- **`RAILWAY_API_TOKEN` is a *project* token.** It goes in a `Project-Access-Token` header,
  not `Authorization: Bearer`. With the Bearer header the API answers `Not Authorized` with
  `code: INTERNAL_SERVER_ERROR` — which reads like an expired token or a server fault rather
  than the wrong header, and is a good way to lose ten minutes.
- **`SUCCESS` is not verification.** It means Railway built and started the container. The
  live-site table above is what actually established that the change is on the page, and
  the same one-line poll — is the artefact my change produces present in the CSS the live
  page links? — took 380 seconds to go true after the mutation returned.

## Still open

Unchanged from `docs/handover-2026-09-16-map-and-lightbox-fixes.md`. Nothing here touched
any of it:

- **Antioch Industrial** still wants a real photograph. 620px resampled to 1800 is cleaner,
  not sharper, and it is the worst grainy hero on the site. Antioch Shopping Plaza has no
  Advantage Photos folder either.
- `uteg-street-apartments` has no gallery at all — the only property with no photograph.
- **No CI coverage of painted crop or of contrast.** A slide swapped in the Studio is
  audited by nothing.
- `/about` → Why EM8 is still empty. The oldest item on the list.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Priorities for the next session

-

### Corrections to anything above

-

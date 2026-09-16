# EM8 website — handover, 2026-09-16 (two bugs the gallery shipped with)

Third handover of 2026-09-16, and the one to read first of the three. Extended later the
same day; see the last two sections.

It **corrects** `docs/handover-2026-09-16-gallery-and-photos.md`, which was written before
these two bugs were found and says the gallery was verified. It was not. The other two are
kept beside it and are otherwise still accurate:

| file | covers |
|---|---|
| `handover-2026-09-16-phone-hero-crop.md` | the hero carousel crop, `1f797ff` |
| `handover-2026-09-16-gallery-and-photos.md` | gallery, sharpening, photo upload, `095e6a7` / `ee249ba` — **its "Verified green" section is wrong about the overlay; see below** |
| this file | `f7add71`, `dc03782`, and the grain cleanup at `fcd3b2c` |

Deployed at `dc03782` and then `fcd3b2c`. Both verified on the live site.

## The two bugs

Both were in the gallery shipped at `095e6a7`. Both were found by Hunter or by verifying on
the deployed site — **neither was caught by 654 unit tests, typecheck, lint, the content
suite, a clean build or 40 E2E tests**, and that is the theme of this document.

### 1. The map painted through the photo overlay — `f7add71`

Hunter opened a photograph on `/portfolio/382-penn-apartments` and the Glen Ellyn street
map was sitting on top of it, zoom controls and all.

Leaflet assigns its own z-indexes inside the map container and they are large: 400 on the
tile and overlay panes, 600 on markers, 700 on tooltips, 800 on `.leaflet-control`, 1000 on
`.leaflet-top` / `.leaflet-bottom`. **Nothing scopes them.** This site's own layers top out
at `z-50`, so with no stacking context on the map container those numbers competed in the
root context and won against everything.

Fixed with `isolation: isolate` on the map container, which forces a new stacking context so
every Leaflet z-index becomes relative to that div while the div itself stays at `z-index:
auto` in normal flow — which any positioned `z-50` element paints above.

**Fixed on the map, not on the overlay, and that was the important call.** `InvestorPopup`
is also `fixed inset-0 z-50`, so on any property page with coordinates the map would have
punched through that too; it fires on a delay and had simply not been seen against a map
yet. Raising the overlays to `z-[1001]` would have worked that afternoon, lost to the next
library that picks a bigger number, and needed repeating on every overlay ever added.

Measured on the running page with the overlay open, by asking `elementFromPoint` at the
centre of each Leaflet box whether Leaflet was what actually painted there:

```
isolation: isolate   ->  0 Leaflet elements on top
isolation: auto      ->  4 Leaflet elements on top
```

The same run restored the class and went back to 0, so that is causation rather than a
coincidence of scroll position.

### 2. The enlarged photograph never loaded on a cold visit — `dc03782`

Found while verifying the map fix. Opening a photograph on the deployed site gave a **44px
dialog containing only its own controls**. The photograph was never painted.

A deadlock, and both halves are needed to see it:

1. `next/image` defaults to `loading="lazy"`.
2. An unloaded image with `width: auto` inside a column flex container has no intrinsic size
   to resolve against, so its box computes to **0x0**.

A zero-area element never satisfies the lazy loader's intersection check — so it never
loads, so it never gains a size. Neither half is a bug on its own.

Fixed with `loading="eager"`, which fetches unconditionally with no intersection check so
the cycle cannot start. It is also just correct for this element: the reader has tapped a
thumbnail and is waiting for exactly this photograph. `priority` would work too and
additionally emit a preload hint, which is wrong for an image that does not exist at page
load.

A second fault in the same element was corrected alongside it: `max-h` with `w-auto`
constrains one axis and leaves the other free, so a 2000px-wide photograph clamped to 720px
tall is still painted **960px wide** — an overflow on a 375px phone. `max-w-full` with
`h-auto`/`w-auto` is the ordinary contain-within shape. Deliberately no fixed height:
several of these sources are barely 1080px wide and would be upscaled in the one place
meant to show the picture as it is.

## The thing actually worth carrying forward

**Three false readings in one session, all from measuring state that had not settled.** Each
one looked like a real finding and two of them produced confident, wrong statements to
Hunter.

1. **A warm image cache hid bug 2 completely.** It only bites on a cold load — with the file
   already cached the intrinsic size is there on the first layout pass and the cycle never
   forms. Every one of these images had been warmed by earlier local testing, so the overlay
   looked correct on localhost and failed on the deployed page. *A warm cache is not a test
   of image loading.* Test a photograph nothing has opened yet, or a different origin.
2. **A leftover `npm run start` on port 3000 made Playwright report 13 failures.**
   `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so it silently reused
   a server from two commits earlier instead of starting one. The same stale server had, an
   hour before, reported the map as un-isolated and a property page as having no gallery
   thumbnails — both wrong. **Kill port 3000 before a measured run**, and treat a surprising
   E2E result as a stale-server suspicion first.
3. **A browser pane mid-resize reported `innerWidth: 0`** and made the hero carousel look
   broken on desktop. Re-measuring after it settled showed it was correct all along.

The existing rule in this repo is "a claim of green is not a run". The 2026-09-16 addition
is narrower and sharper: **a run against state you did not establish is not a run either.**

### And a limit of the test suite, stated plainly

jsdom has no layout. The 0x0 deadlock **could not have been caught** by rendering
`PropertyGallery` in a unit test, however the test were written — there is no box to
measure. The two guards added in `dc03782` pin the attributes that prevent it
(`loading` not lazy, both axes constrained) and that is the most a unit test can do here.
This class of bug is only ever found on a real page.

## Tests added by these two commits

- `tests/unit/mapStacking.test.ts` — the map keeps `isolate`; the overlays have *not*
  escalated their z-index instead (which would mean the map fix was removed); and a forward
  guard that any component importing Leaflet must isolate the element it mounts into.
- `tests/unit/propertyGallery.test.tsx` — the enlarged photograph is not lazy-loaded, and is
  constrained on both axes with no definite height.

**Every one of these was confirmed to fail against the broken version before being
committed.** A regression test that has never been seen red is a guess.

## Verified green

Run on merged `main` at `dc03782`:

`npm test` **654** · `npx tsc --noEmit` · `npm run lint` · `npm run test:content` **14** ·
`npm run build` **35 pages** · `npx playwright test` **40** (after clearing port 3000 — see
above).

On the **deployed** site, opening photographs not opened earlier in the session, so the
cold-load path was genuinely exercised:

| | desktop 1440 | phone 390 |
|---|---|---|
| enlarged photograph | 936x624, dialog 668px | 358x358 |
| `loading` | `eager` | `eager` |
| overflow / horizontal scroll | — | none |
| map isolation | `isolate` | — |
| Leaflet elements over the dialog | **0** | — |

## Added after this file was first written — `fcd3b2c`

Hunter asked for the grainy photographs to be touched up with AI, and for the hero to appear
in the Photographs grid as well.

**There is no AI upscaler on this machine and no API key for one.** That was said plainly
rather than approximated with interpolation and called a touch-up. Splitting the problem
removed most of the need for one:

- **Five of the twelve needed no new photograph at all.** A higher-resolution shot of the
  same building was already in the dataset after the upload, sitting further down the same
  gallery. `scripts/dev/promote-hero-photos.mjs` promotes them: a property hero is
  `gallery[0]` so it is a reorder, a carousel slide is a pointer so it is a reference swap.
  Boulevard 985→1920, Oak Forest K 1222→1920, and the three grainy carousel slides to
  2528/1920/1920. Targets are matched on alt text rather than position, and anything other
  than exactly one match is an error rather than a guess.
- **The other seven** went through `scripts/dev/touch-up-heroes.mjs`: denoise, Lanczos
  resample to 1800px, unsharp mask. **Conventional processing, not AI.** It removes the
  blockiness of the browser stretching a small file; it invents nothing. The order is the
  same finding `urlForPhoto` rests on — sharpening before denoising amplifies exactly the
  noise that makes these look grainy. Non-destructive: the result is a new asset, every
  original is still in the dataset, and every replaced reference is printed.

**No hero or carousel slide is now served smaller than it is painted. It was twelve.**
Antioch Industrial still wants a real photograph: 620px resampled to 1800 is cleaner, not
sharper, and no parameter changes that.

`gallery.slice(1)` is gone — the grid shows the hero too. The original reasoning (do not show
the same picture twice) was the wrong trade: the hero is cropped to a 2.571 letterbox, so it
is the one photograph a reader cannot see in full, and excluding it removed the only place
they could open it uncropped.

### A fourth stale-state failure, and the one that actually lost data

**The 2026-09-16 upload silently dropped one file each for Oak Forest K and Park Townhomes**
— 89 of 91 landed. The uploader is idempotent so re-running restored both, but it went
unnoticed for hours because the verification counted totals and alt coverage rather than
confirming each file was present. The missing Oak Forest K file was its **exterior**, which
is exactly the photograph the hero promotion above then needed.

The check now compares the written alt list against the live gallery per file. **Verifying an
aggregate is not verifying the thing.** It is the same failure as the three recorded above in
a different costume: a count is state you did not establish either.

Separately, and not caused by the script: 382 Penn's original low-resolution hero was removed
from its gallery between the upload finishing (18 images, recorded) and later the same day
(17). The uploader only appends, so that came from the Studio. Left as found — the outcome is
right, its hero is now the 1920px exterior.


## Still open

Unchanged from `handover-2026-09-16-gallery-and-photos.md`, and repeated here because that
file's "Verified green" section can no longer be trusted at face value:

- **The twelve grainy originals** in `docs/image-resolution.md`. Nothing in code helps them.
  **The Boulevard's hero is 985x734 and its gallery now holds 1920px photographs of the same
  property**; Oak Forest K is the same story at 1222x811 against new photographs up to
  2528px. For those two the fix is a Studio reorder rather than a re-shoot. Not done
  unasked, because it changes what sits at the top of a property page.
- Antioch Industrial and Antioch Shopping Plaza have no Advantage Photos folder and got
  nothing from the upload. Antioch Industrial is also the worst grainy hero on the site.
- `uteg-street-apartments` has no gallery at all — the only property with no photograph.
- **No CI coverage of painted crop or of contrast.** The E2E suite pins hero height and
  header clearance; painted width is only checked by running `scripts/measure-phone.mjs` by
  hand, and a slide swapped in the Studio is audited by nothing.
- `/about` → Why EM8 is still empty. The oldest item on the list.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Priorities for the next session

-

### Corrections to anything above

-

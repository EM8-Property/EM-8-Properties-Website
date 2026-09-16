# EM8 website — handover, 2026-09-16 (gallery, sharpening, and the photo upload)

Second handover of 2026-09-16. `docs/handover-2026-09-16-phone-hero-crop.md` covers the
hero carousel crop earlier the same day; this covers everything after it.
`docs/handover-2026-09-15-logo-and-track-record.md` is still the general-state document.

## What Hunter asked for, in order

1. "In Studio I can upload multiple photos for a property, but they don't display. Can you
   make a spot on the property page to show a gallery of photos."
2. "Review my site for grainy photos and sharpen them."
3. "Also make sure the photos are not super zoomed in on the phone for the properties."
4. "Upload all the photos in the advantage photos folder in the drive for each of the
   active properties." — then "ignore Waverly since I already added the photos I wanted."

All four shipped. Deployed at `095e6a7`, verified on the live site.

## 1. The gallery was a missing renderer, not a missing schema

`property.gallery` has been an array of images since the schema was written, and
`PROPERTY_BY_SLUG_QUERY` has always projected the **whole array**. The page read
`gallery[0]` for the hero and nothing else. So the Studio was working exactly as Hunter
described and nothing had to be migrated or added to the schema — the field was already
there and already fetched.

`PropertyGallery` renders the rest: a thumbnail grid, 2-up on a phone and 3-up above, with
a modal overlay carrying a focus trap, Escape, arrow keys that wrap, focus returned to the
thumbnail that opened it, and the body scroll locked and restored to its *previous* value.
It is spelled the same way as `InvestorPopup` because that component had already paid for
these decisions.

**The hero slice lives on the page, not in the component.** `gallery[0]` is the photograph
at the top of the page, so the page passes `gallery.slice(1)` and the component renders
exactly what it is handed. Putting that rule in the component would let the two disagree
about which image is the hero.

## 2. Sharpening splits the site almost exactly in half

This is the part worth reading even if nothing else is.

Audited every image asset in the dataset. The magnification is painted CSS pixels over the
bitmap Sanity can actually deliver, and **`fit=max` never upscales** — so when a source is
smaller than the crop requested, Sanity returns it at its own size and the *browser*
stretches it.

| | count | worst |
|---|---|---|
| **Upscaled** — served smaller than painted | 12 | `/portfolio/antioch-industrial`, 620x426 across 1425 CSS px, **2.30x** (4.60x at DPR 2) |
| **Downscaled** — resampled from big originals | 12 | up to 5568px down to 1800 |

Sharpening the first group is **actively harmful**: there is no detail to recover, and an
unsharp mask amplifies the sensor noise and JPEG blocking that are already why it looks
grainy. So `urlForPhoto` applies `sharp=15` only where Sanity is genuinely shrinking the
source, and `urlForImage` stays as the unconditional builder underneath it.

Two things about the rule that are easy to get wrong:

- **It measures the crop, not the source width.** A 4000x500 panorama cropped to 1800x700
  is limited by its height — the widest crop is 1286px — so it is upscaled despite being
  4000px wide. `targetHeight` is a parameter for that reason. No asset is shaped like that
  today; a property site is where a panorama eventually gets uploaded.
- **It self-corrects.** Re-upload Antioch Industrial at 3000px and it crosses the line on
  the next build with nothing to change in code.

The twelve that no parameter can fix are ranked in **`docs/image-resolution.md`**, with the
source resolution a property hero actually needs (~2800px). Antioch Industrial is first and
it is not close: a 0.26MP original, smaller than a phone screenshot, on a full-width hero.

## 3. Property photos on a phone — the same fault as the carousel

The hero crop is 1800x700, an aspect of 2.571, and `object-cover` is height-driven on any
box narrower than that shape. At the fixed `h-[340px]` a 375px phone painted it **874 CSS
px, 2.33x the viewport**, showing 43% of an already-wide slice.

Now `190/280/340` by breakpoint. Measured on the deployed site: **1.25x at 390 wide**,
against 2.24x before. Desktop is untouched and needed to be — above about 875px the box is
wider than the crop is shaped, so it is width-driven and already paints 1:1. That asymmetry
is why this is three heights rather than art direction with a second crop.

Checked the rest of the site for the same fault while there: `PostCard` and `PropertyCard`
are width-driven on a phone (1.0x), and the `/insights/[slug]` hero has no `object-cover`
at all. The carousel and the property hero were the only two.

## 4. The photo upload — 85 photographs across five properties

`scripts/dev/upload-gallery.mjs`, run against the export Hunter had already downloaded to
`~/Downloads/EM8 - Images-20260911T193348Z-1-001.zip`.

| folder | property | added |
|---|---|---|
| One Fifty Seven | `157-and-cicero` | 21 |
| Park Townhomes | `park-townhomes-highland-park` | 18 |
| 382 Penn | `382-penn-apartments` | 17 |
| Oak Forest K | `oak-forest-k` | 15 |
| The Boulevard | `boulevard-at-central-station` | 14 |
| Woodland Trails | `reverb-woodland-trails` | 6 |
| Waverly Creek | — | **skipped, Hunter curated it himself** |

113 gallery images across the dataset now, **zero missing alt text**.

### Things that mattered in doing it

1. **The Drive connector cannot move these files.** It returns file contents as base64
   *into the model's context*; a single 10MB photograph is roughly 3.3M tokens, and the set
   is ~300MB. There is no `rclone`, `gdrive` or `gcloud` on this machine. The export
   already being on disk is what made this possible at all. **If this comes up again, the
   answer is a local path, not the connector.**
2. **The folder mapping was walked, not guessed.** Three of the six are not guessable from
   the folder name: "One Fifty Seven" is the `Oak Forest 1 - 157 & Cicero` folder,
   "Woodland Trails" is `Woodland Trail Apartments (Reverb)`, and "382 Penn" is
   `Gentry Manor - 382 Pennsylvania Ave, Glen Ellyn, IL`. Every one was confirmed by
   walking the Drive tree to the property-level folder. The 2026-09-15 handover records a
   property being mapped from its name alone and being wrong (Knox/Kilpatrick), which is
   how one building's photographs end up on another building's page.
3. **The script is idempotent and it was verified, not assumed.** Sanity deduplicates
   assets by content hash, but `gallery` is an array and appending twice adds a second
   entry pointing at the same picture. Every run reads the current gallery and skips any
   asset already referenced. Proven by running Woodland Trails twice: the second run added
   0 and skipped 6.
4. **Alt text was written by looking at all 91 photographs, not generated.** The schema
   requires alt and the exported filenames are all `original - 2026-09-11T133009.550.png`,
   so there was nothing to derive from. `PropertyGallery` uses alt as the thumbnail
   button's accessible name, so a fallback everywhere would announce twenty-one identical
   controls. Reviewed as 512px contact sheets, six to a numbered sheet — 17 sheets instead
   of 91 image reads, at the same token cost per image. The fallback in the script is still
   `"<title>, photograph N"`; it exists so a missing line cannot fail a build, not because
   it is good enough.
5. **The AI-generated files are in, on Hunter's instruction.** Five of Woodland Trails'
   six are `ChatGPT Image Sep 11, 2026…`, and there is one ChatGPT file in 157 & Cicero and
   one Gemini file in Park Townhomes. They were flagged before upload because a generated
   rendering under a heading reading "Photographs" on a page about a real owned asset is a
   different claim from a photograph of it. Hunter's answer: *"they are just touch ups of
   real photos."* Recorded here because the next person to look at the file names will ask
   the same question.

## Also fixed while in there

**Multi-paragraph PortableText no longer renders as one wall.** `space-y-4` on the wrappers
in `/portfolio/[slug]` (overview and business plan), `/about` and `/insights/[slug]`,
matching the fix already on `/strategy`. It had been on the open list since 2026-09-15 and
was visible on the property page this change was already editing. A shared `Prose`
component is still the better answer and is still not done.

## Two things caught by measuring rather than by looking

Both were **my own readings being wrong**, not the site:

1. I reported the gallery thumbnails as unsharpened on the live site. They were not — I had
   read `currentSrc` before the images decoded, so the URL was empty and the `sharp=`
   check was false. Fetching the URLs a moment later showed `sharp=15` on all of them.
2. Earlier the same day, a desktop reading taken while the browser pane was mid-resize
   reported `innerWidth: 0` and made the carousel look broken on desktop. **A measurement
   from a viewport or an image that has not settled is not a measurement** — take it again
   before believing it.

## Verified green

`npm test` **649** · `npx tsc --noEmit` · `npm run lint` · `npm run test:content` **14** ·
`npm run build` **35 pages** · `npx playwright test` **40**.

Was 626 at `1f797ff`; this adds 23 (12 gallery, 8 image/sharpening, 3 property page).

On the deployed site at `095e6a7`: `/portfolio/157-and-cicero` renders 21 thumbnails with
the written alt text as each button's accessible name, hero and thumbnails both carrying
`sharp=15`; `/portfolio/park-townhomes-highland-park` at 390x844 renders 18 thumbnails in a
2-up grid with the hero at 1.25x.

## Still open

- **The twelve grainy originals.** `docs/image-resolution.md`. Nothing in code helps them.
  Worth knowing: **The Boulevard's hero is 985x734 and this upload brought 1920px
  photographs of the same property**, and Oak Forest K's hero is 1222x811 against new
  photographs up to 2528px. Swapping a hero changes what sits at the top of a property
  page, so it was not done unasked — but for those two the fix is now a Studio reorder
  rather than a re-shoot.
- **Antioch Industrial and Antioch Shopping Plaza have no Advantage Photos folder**, so
  they got nothing from this batch. Antioch Industrial is also the worst grainy hero on the
  site.
- **`uteg-street-apartments` has no gallery at all** — zero images, so no hero. It is sold,
  so it is low stakes, but it is the only property with no photograph.
- **No CI coverage of crop or contrast**, carried forward from the earlier handover. The
  E2E suite pins hero height and header clearance; the painted width is only checked by
  running `scripts/measure-phone.mjs` by hand, and a slide swapped in the Studio is audited
  by nothing.
- The `/about` "Why EM8" section is still empty — the oldest item on the list.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Priorities for the next session

-

### Corrections to anything above

-

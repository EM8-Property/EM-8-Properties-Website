# EM8 website: handover, 2026-11-11 (headings and bold in Studio rich text)

Follows `docs/handover-2026-10-14-form-bot-check.md`. Hunter updated the NITA article in the
Studio and said the headings and bolding did not show on the website.

## Where things are

| | |
|---|---|
| em-8.com | Railway `e0c63e6`, deployment `9edd0e3b` (fonts). The heading fix went out first as `c2c2779`, deployment `241ca649`. Netlify proxy unchanged |
| The change | `c2c2779`, pushed straight to `main` at Hunter's choice (no branch, no PR) |
| The article | `post-what-a-village-wants-built`, slug `NITA-case-for-TOD`, published 15:27 UTC |

## What was wrong

The content was fine. The article's eight "Heading 2" blocks were saved as `style: 'h2'` and
the live HTML had eight `<h2>` elements. They rendered at **15px, weight 400**, the same as
the paragraphs around them, so they read as one more line of body text.

`PortableText`'s default components emit a bare `<h2>` with no class, and Tailwind's preflight
resets every heading to `font-size: inherit; font-weight: inherit`. Only `/privacy` had its
own components (added in #77). Every other rich-text field on the site had the same gap:
insight bodies, property overview and business plan, the Strategy body and About's
"Why EM8". None had used a heading until now, so nobody had seen it.

## What changed

`src/components/ui/RichText.tsx` is now the one renderer for Studio rich text, used by
`/insights/[slug]`, `/portfolio/[slug]`, `/strategy` and `/about`. `/privacy` keeps its own
components (smaller heading, legal page). It styles:

| Studio | On the page |
|---|---|
| Heading 1 and Heading 2 | 20px bold `<h2>`, ink. H1 is drawn as `<h2>` because the page title is the only `<h1>` |
| Heading 3 / Heading 4 | 16px bold / semibold |
| Quote | teal rule on the start side, italic |
| Bullet / numbered list | discs / numbers back, indented |
| Bold | semibold, ink, so it stands out from the grey body text |
| Italic | italic |
| Link | teal, underlined. `http(s)` links open in a new tab |

`tests/unit/richText.test.tsx` pins each of these. Lint requires logical properties
(`border-s`, `ps-`) for the planned Hebrew mirror.

## Bold

**No revision of the NITA article has ever contained bold.** Today's three publishes
(15:01, 15:13, 15:27 UTC) were checked through the history API: zero `strong` marks in each.
Bold was either never applied or was dropped when the text was pasted in. Sanity's paste
handling can drop bold from Word and Google Docs. Bold applied in the Studio (Ctrl+B, or
the **B** button) now shows on the site. The browser already bolded `<strong>`. This change
makes it darker too, so it stands out against the grey body text.

## Verified

**CI was not fully green when this deployed. Hunter chose to deploy anyway.** In run
43049864899 the `checks` job passed: lint, typecheck and the 710 unit tests. The `build` job
ran `npm run build` successfully, then failed three times at the Playwright browser install
(see "CI flake" below), so its E2E and Lighthouse steps never ran. As a substitute, the
production build and all 49 E2E tests passed locally.

**Closed the same day:** run 43067372518 on `c9518bd`, which carries this code plus two doc
commits, passed every step: lint, typecheck, unit, build, E2E and the Lighthouse budget.

Railway deployment `241ca649` reached `SUCCESS`. Its build log has `Compiled successfully`
and `Generating static pages (39/39)`, so it was a real Next build, not a cached layer.

On em-8.com after the deploy, at 390px:

| check | result |
|---|---|
| `/insights/NITA-case-for-TOD`, `article h2` | 8 headings, all `20px 700`. Body text 15px. Before: `15px 400` |
| The bullet list under The Boulevard section | `list-style-type: disc` |
| `/`, `/strategy`, `/about`, `/portfolio`, `/insights`, `/privacy`, both other articles, two property pages | 200 |

## CI flake on 11/11

The first run's `build` job failed in `npx playwright install --with-deps chromium`:
`Temporary failure resolving 'archive.ubuntu.com'` while apt fetched fonts. That is the
runner's DNS, not the code. `npm run build` had passed in the same job. Two reruns with
`gh run rerun <id> --failed` (16:00 and 16:12 UTC) failed the same way. The runner image
(`ubuntu-26.04`, `20261101.186.1`) is the same one that passed #77 on 11/4. GitHub's status
page said all systems operational. If it persists, a cached Playwright install, or
dropping `--with-deps` in favour of the image's own fonts, would take apt out of the path.
It had cleared by 16:52, when run 43067372518 installed the browser normally.

A **second, different** failure hit run 43060799768 (`e207c28`, a doc-only commit) at
16:45: `npm run build` itself failed with 10 errors, all in Cormorant Garamond (the wordmark
face). Inter and Oswald were fine:

```
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
next/font/google queries have exactly one entry
```

`next/font/google` downloads Google's stylesheet at build time and rewrites each font file
`url()` into a Turbopack import whose query is a JSON blob. That message comes from
Turbopack's query parser when the blob splits into more than one `key=value` entry, which
an `&` inside the font URL would cause. The stylesheet itself was fetched, since the
failing `@font-face` blocks are in the log. **The URL Google sent is not in the log**: Next
truncates it at `https://fonts.gs…`. So the exact cause is unproven. From here, 16 fetches
of the same stylesheet with Next's user agent all returned plain
`fonts.gstatic.com/s/cormorantgaramond/v21/….woff2` URLs. The next run, 7 minutes later,
built normally. A clean local build also passed.

Railway ran the same `next build`, so the same failure could have failed a deploy. Hunter
chose to remove the dependency, and that change shipped the same day (next section).

## Fonts self-hosted (e0c63e6)

`src/app/fonts.ts` replaces `next/font/google` with seventeen `next/font/local` calls. They
use Google's own woff2 files, copied byte for byte from the last Google build into
`src/app/fonts/`, with Google's `unicode-range` for each subset and one `font-family` per
font. Only the latin file of each font is preloaded. `globals.css` names the families in
`--font-sans`, `--font-display` and `--font-wordmark`, and declares the three fallback faces
with the exact metrics `next/font/google` had computed. `layout.tsx` imports the module for
its side effects only. `next build` no longer contacts Google.

**Trap found on the way:** next/font/local's `variable` names the family after the JS binding
under Turbopack ("cormorant"), not the declared `font-family`. Through `var(--font-…)` the
wordmark would have rendered in Times, and Inter and Oswald worked only because family names
are case-insensitive. Hence the hard-coded names. `tests/unit/fonts.test.ts` pins all of it,
including that nothing imports `next/font/google` again.

**Verified identical**, before and after:

| check | result |
|---|---|
| `@font-face` rules | 25 and 25: same families, weights, ranges, file contents and fallback metrics |
| Preloads | the same 3 latin files, same content hashes |
| Canvas render of Inter 400/500/600/700, Oswald 500/700, Cormorant 600/700 | identical pixel hashes and text widths |
| Google build vs self-hosted build, same local server, 390px | pixel-identical (max diff 6/765, JPEG noise) |
| em-8.com before vs after the deploy, 390px, whole screen | **max diff 0** |
| Live font files | byte-identical to `src/app/fonts/`; no request to Google |

A screenshot of em-8.com once differed from a local build in Inter text. That was Chrome
choosing subpixel vs grayscale anti-aliasing by environment (localhost vs the live origin),
not the fonts. The Google build differed from live in exactly the same way.

Shipped: CI run 43072858163 passed every step, including E2E and Lighthouse. Railway
deployment `9edd0e3b` built `e0c63e6` with a full Next build, and all 12 main pages return 200.

## Content note

The Boulevard article (`aca31ce3…`) opens with "fake bold": Unicode Mathematical Sans-Serif
Bold letters (𝗘𝗫𝗖𝗜𝗧𝗜𝗡𝗚 𝗡𝗘𝗪𝗦…), probably pasted from a LinkedIn post. Screen readers and
search engines don't read them as words, and no site font contains them. Not changed. The
fix is to retype those lines in the Studio with real bold.

## Open

1. Bold in the NITA article, if Hunter wants any: apply it in the Studio and publish.
2. The fake-bold opening of the Boulevard article (above), if Hunter wants it fixed.
3. `RAILWAY_API_TOKEN` in the main checkout's `.env.local` was replaced on 11/11 with the
   project token Hunter pasted in chat. It deployed this change and answers `projectToken`.
4. Earlier open items are unchanged: the domain, the read token in Railway build logs, the
   Editor token, and the hosted Studio redeploy for "Privacy page".

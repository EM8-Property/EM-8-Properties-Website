# Why there are font files in `public/`

These two are **not** served to browsers. Nothing on the site links to them, and the pages
get their webfonts from `next/font/google` in `src/app/layout.tsx` — self-hosted, hashed and
preloaded by Next, which is the right mechanism and is unrelated to this directory.

These exist for **Satori**, which draws the share cards (`src/app/share-card/route.tsx` and
`src/app/(site)/insights/[slug]/opengraph-image.tsx`). Satori renders to a PNG outside the
browser: it has no system fonts and no fallback chain, so it has to be handed raw font bytes
for every glyph it will draw.

`public/` specifically, because `next.config.ts` sets `output: 'standalone'` and the
Dockerfile copies exactly three things into the runtime image — `public`, `.next/standalone`
and `.next/static`. A font read from anywhere else in the tree depends on Next's file tracing
having noticed a `readFile` of a computed path, which works until it doesn't, and the failure
mode is a share card that renders on a laptop and 500s in the container.

| file | what it is for | licence |
|---|---|---|
| `CormorantGaramond-SemiBold-wordmark.ttf` | `EM8` on the card, at weight **600**. **Subset to nine glyphs** (`EM8PROTIS`) via the Google Fonts `text=` parameter, which is why it is 5KB rather than 290KB. | OFL |
| `CormorantGaramond-Bold-wordmark.ttf` | `PROPERTIES` on the card, at weight **700**. Same nine-glyph subset. | OFL |
| `Geist-Regular.ttf` | The card's headline, which is an arbitrary article title and so needs full Latin. A byte copy of `@vercel/og`'s own bundled default, so the headline renders exactly as it did before the card asked for a second face. | OFL |

## Two Cormorant weights, because the lockup sets its two lines differently

`components/layout/Wordmark.tsx` draws the mark at 600 and `PROPERTIES` at 700. Satori
resolves a face by family **plus weight**, so each weight is a separate file — there is no
variable-font instancing here and no synthesis. Two nine-glyph subsets cost 5KB more than
one.

A `CormorantGaramond-Light-wordmark.ttf` at weight 300 lived here until 2026-09-18 and is
gone, because nothing asks for 300 any more. If you change a weight in `Wordmark.tsx`,
**this directory and `shareCardFonts()` both have to follow**, and neither the build nor the
test suite will tell you if they do not — see the drift note below.

### Re-subsetting

The files come from the Google Fonts CSS API with a `text=` parameter, requested with a
user-agent old enough that the API serves TrueType instead of woff2 (Satori reads ttf/otf,
not woff2):

```
curl -H 'User-Agent: Mozilla/4.0' \
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&text=EM8PROTIS'
```

That returns a `@font-face` whose `src` is a `format('truetype')` URL; fetch it and save the
bytes. Worth verifying what arrives rather than trusting the request: check the magic number
is `00010000`, that `OS/2`'s `usWeightClass` is the weight you asked for, and that the `cmap`
maps all nine characters. Re-subset if the card's wordmark ever needs another character.

### The drift this directory caused

On 2026-09-18 the site's logo went Light → SemiBold and then `PROPERTIES` on to Bold. The
card followed **neither**, and shipped through two deploys drawing Light, because Satori is
handed font files rather than CSS and nothing here changed when `app/layout.tsx` did. It was
caught by eye, not by a check. `tests/unit/wordmark.test.tsx` now asserts the card asks for
the same two weights the page does, which closes that specific gap; the files themselves are
still only as correct as whoever last replaced them.

Geist is copied rather than read out of `node_modules` on purpose: the runtime image does not
carry `node_modules` in full, and copying also pins the face, so a Next upgrade that changes
the bundled default cannot silently restyle every share card on the site.

**They come as a pair.** `@vercel/og` uses its default font only when a card supplies none
(`fonts: options.fonts || defaultFonts`); the moment one custom font is passed, the default is
gone. Passing Cormorant alone would render a correct `EM8` above a headline of blank boxes, in
an image nothing in the build, the tests or a typecheck ever looks at. See `shareCardFonts()`
in `src/components/seo/shareCardFrame.tsx`, and the test that pins it in
`tests/unit/wordmark.test.tsx`.

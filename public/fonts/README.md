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
| `CormorantGaramond-Light-wordmark.ttf` | The EM8 logo on the card. **Subset to nine glyphs** (`EM8PROTIS`) via the Google Fonts `text=` parameter, which is why it is 5KB rather than 290KB. Re-subset it if the card's wordmark ever needs another character. | OFL |
| `Geist-Regular.ttf` | The card's headline, which is an arbitrary article title and so needs full Latin. A byte copy of `@vercel/og`'s own bundled default, so the headline renders exactly as it did before the card asked for a second face. | OFL |

Geist is copied rather than read out of `node_modules` on purpose: the runtime image does not
carry `node_modules` in full, and copying also pins the face, so a Next upgrade that changes
the bundled default cannot silently restyle every share card on the site.

**They come as a pair.** `@vercel/og` uses its default font only when a card supplies none
(`fonts: options.fonts || defaultFonts`); the moment one custom font is passed, the default is
gone. Passing Cormorant alone would render a correct `EM8` above a headline of blank boxes, in
an image nothing in the build, the tests or a typecheck ever looks at. See `shareCardFonts()`
in `src/components/seo/shareCardFrame.tsx`, and the test that pins it in
`tests/unit/wordmark.test.tsx`.

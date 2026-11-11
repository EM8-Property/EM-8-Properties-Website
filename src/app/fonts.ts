import localFont from 'next/font/local'

/*
 * The three site faces, self-hosted. Until 2026-11-11 these came from `next/font/google`,
 * which downloads Google's stylesheet and font files during `next build`. That made every
 * build, on CI and on Railway, depend on Google Fonts answering in a form Next can parse,
 * and on 2026-11-11 it did not: CI run 43060799768 failed `next build` with ten
 * "next/font/google queries have exactly one entry" errors, all in Cormorant Garamond, on
 * a docs-only commit. The run seven minutes later passed. See
 * `docs/handover-2026-11-11-article-headings.md`.
 *
 * **This reproduces exactly what `next/font/google` generated, so nothing on the page
 * changed.** The woff2 files in `./fonts/` are Google's own files, copied byte for byte out
 * of the last Google-built `.next/static/media`. Each call below is one of Google's
 * per-script subsets, with Google's `unicode-range`. They share one `font-family` name
 * through `declarations`, so a browser downloads a subset only when the page uses a
 * character in it, exactly as before. Only the latin file of each family is preloaded,
 * which is what `subsets: ['latin']` did.
 *
 * `next/font` needs every argument written out as a literal. That is why there are
 * seventeen calls and no loop.
 *
 * **Nothing reads the exports.** `layout.tsx` imports this module for its `@font-face`
 * rules alone, and `globals.css` names the families ('Inter', 'Oswald', 'Cormorant
 * Garamond') in `--font-sans`, `--font-display` and `--font-wordmark`. Do not switch to
 * `variable` or `.className`. Under Turbopack those name the family after the JS binding
 * ("cormorantLatin"), not the `font-family` declared here, and the logo would quietly fall
 * back to Times.
 *
 * Fallback faces (`Inter Fallback` and the others) are not generated here: every call sets
 * `adjustFontFallback: false`, and `globals.css` declares them with the exact override
 * values `next/font/google` computed. `lib/headerReservation.ts` was measured against those
 * values. The Cormorant fallback is load-bearing there; see the note on `cormorantLatin`.
 *
 * Verified on 2026-11-11 against the Google-built site: the same 25 `@font-face` rules, the
 * same 3 preloaded files, byte-identical font files, and pixel-identical pages served from
 * the same local server.
 *
 * To change a weight or add a script, download the file from Google Fonts and add a call.
 * `tests/unit/fonts.test.ts` checks every call against its file, the preloads and the
 * family names in `globals.css`.
 */

// ---------------------------------------------------------------------------------- Inter

/** Inter, the body face. Variable, 100 to 900. */
export const interLatin = localFont({
  src: './fonts/inter-latin.woff2',
  weight: '100 900',
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Inter' },
    {
      prop: 'unicode-range',
      value:
        'U+??, U+131, U+152-153, U+2BB-2BC, U+2C6, U+2DA, U+2DC, U+304, U+308, U+329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
})

export const interLatinExt = localFont({
  src: './fonts/inter-latin-ext.woff2',
  weight: '100 900',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Inter' },
    {
      prop: 'unicode-range',
      value:
        'U+100-2BA, U+2BD-2C5, U+2C7-2CC, U+2CE-2D7, U+2DD-2FF, U+304, U+308, U+329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
    },
  ],
})

export const interVietnamese = localFont({
  src: './fonts/inter-vietnamese.woff2',
  weight: '100 900',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Inter' },
    {
      prop: 'unicode-range',
      value:
        'U+102-103, U+110-111, U+128-129, U+168-169, U+1A0-1A1, U+1AF-1B0, U+300-301, U+303-304, U+308-309, U+323, U+329, U+1EA0-1EF9, U+20AB',
    },
  ],
})

export const interGreek = localFont({
  src: './fonts/inter-greek.woff2',
  weight: '100 900',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Inter' },
    {
      prop: 'unicode-range',
      value: 'U+370-377, U+37A-37F, U+384-38A, U+38C, U+38E-3A1, U+3A3-3FF',
    },
  ],
})

export const interGreekExt = localFont({
  src: './fonts/inter-greek-ext.woff2',
  weight: '100 900',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Inter' },
    { prop: 'unicode-range', value: 'U+1F??' },
  ],
})

export const interCyrillic = localFont({
  src: './fonts/inter-cyrillic.woff2',
  weight: '100 900',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Inter' },
    { prop: 'unicode-range', value: 'U+301, U+400-45F, U+490-491, U+4B0-4B1, U+2116' },
  ],
})

export const interCyrillicExt = localFont({
  src: './fonts/inter-cyrillic-ext.woff2',
  weight: '100 900',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Inter' },
    {
      prop: 'unicode-range',
      value: 'U+460-52F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F',
    },
  ],
})

// --------------------------------------------------------------------------------- Oswald

/** Oswald, property titles, always uppercase. Variable, 200 to 700. */
export const oswaldLatin = localFont({
  src: './fonts/oswald-latin.woff2',
  weight: '200 700',
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Oswald' },
    {
      prop: 'unicode-range',
      value:
        'U+??, U+131, U+152-153, U+2BB-2BC, U+2C6, U+2DA, U+2DC, U+304, U+308, U+329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
})

export const oswaldLatinExt = localFont({
  src: './fonts/oswald-latin-ext.woff2',
  weight: '200 700',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Oswald' },
    {
      prop: 'unicode-range',
      value:
        'U+100-2BA, U+2BD-2C5, U+2C7-2CC, U+2CE-2D7, U+2DD-2FF, U+304, U+308, U+329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
    },
  ],
})

export const oswaldVietnamese = localFont({
  src: './fonts/oswald-vietnamese.woff2',
  weight: '200 700',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Oswald' },
    {
      prop: 'unicode-range',
      value:
        'U+102-103, U+110-111, U+128-129, U+168-169, U+1A0-1A1, U+1AF-1B0, U+300-301, U+303-304, U+308-309, U+323, U+329, U+1EA0-1EF9, U+20AB',
    },
  ],
})

export const oswaldCyrillic = localFont({
  src: './fonts/oswald-cyrillic.woff2',
  weight: '200 700',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Oswald' },
    { prop: 'unicode-range', value: 'U+301, U+400-45F, U+490-491, U+4B0-4B1, U+2116' },
  ],
})

export const oswaldCyrillicExt = localFont({
  src: './fonts/oswald-cyrillic-ext.woff2',
  weight: '200 700',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Oswald' },
    {
      prop: 'unicode-range',
      value: 'U+460-52F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F',
    },
  ],
})

// ----------------------------------------------------------------------- Cormorant Garamond

/**
 * The wordmark face, and nothing else on the site. See `components/layout/Wordmark.tsx`.
 *
 * Pinned to weight 600. It was 300 until 2026-09-18, when Hunter asked for the mark at the
 * top and bottom of the page to be bolder — first "a little bit", which was taken to 400,
 * and then "even more bold" once he had seen it, which is this. All five weights Cormorant
 * Garamond publishes were rendered from the running site and compared: 400 and 500 are
 * near-indistinguishable at the 24px the mark is set at, and 700 reads heavy for a serif
 * this delicate.
 *
 * **Two weights, for the first time**, added 2026-09-18 when Hunter asked for `PROPERTIES`
 * bolder than `EM8` rather than level with it. 600 is the mark, 700 is the lockup's second
 * line. Every previous version of this comment argued for exactly one weight, and that is
 * still the default to return to — but the lockup now deliberately sets its two lines at
 * different weights. It costs no extra download: as noted below, both weights come from one
 * variable file per subset.
 *
 * **Neither weight can be changed from `Wordmark.tsx` alone.** Asking for a weight a subset
 * does not carry is how a browser ends up synthesising one — and at a single step it does
 * not even do that: with only the old file loaded, the new class selects that same face and
 * renders identically, so the change looks like a no-op and gets committed as one. The `src` weights
 * here and the classes there are one setting in two places, and
 * `tests/unit/wordmark.test.tsx` pins them together.
 *
 * The fallback face is load-bearing here, not incidental. `lib/headerReservation.ts` sizes the
 * hero's top padding against the header as it paints with **no webfonts at all**, and
 * swapping the wordmark from a condensed sans to a serif changes what that fallback is. The
 * `size-adjust` face is what keeps the blocked-font wordmark close to the loaded one, and it
 * is why that reservation table did not have to move. It used to be generated by
 * `next/font/google`. Since the fonts were self-hosted it has been declared in `globals.css` as
 * `Cormorant Garamond Fallback`, with the same values. If you change or remove it, re-measure.
 *
 * Google serves one file per subset for both weights: a variable font whose `wght` axis runs
 * 300 to 700. Its stylesheet declares a 600 face and a 700 face over that one file, and the
 * browser sets the axis to the declared weight. Each call below does the same with two `src`
 * entries.
 */
export const cormorantLatin = localFont({
  src: [
    { path: './fonts/cormorant-garamond-latin.woff2', weight: '600' },
    { path: './fonts/cormorant-garamond-latin.woff2', weight: '700' },
  ],
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Cormorant Garamond' },
    {
      prop: 'unicode-range',
      value:
        'U+??, U+131, U+152-153, U+2BB-2BC, U+2C6, U+2DA, U+2DC, U+304, U+308, U+329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
})

export const cormorantLatinExt = localFont({
  src: [
    { path: './fonts/cormorant-garamond-latin-ext.woff2', weight: '600' },
    { path: './fonts/cormorant-garamond-latin-ext.woff2', weight: '700' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Cormorant Garamond' },
    {
      prop: 'unicode-range',
      value:
        'U+100-2BA, U+2BD-2C5, U+2C7-2CC, U+2CE-2D7, U+2DD-2FF, U+304, U+308, U+329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
    },
  ],
})

export const cormorantVietnamese = localFont({
  src: [
    { path: './fonts/cormorant-garamond-vietnamese.woff2', weight: '600' },
    { path: './fonts/cormorant-garamond-vietnamese.woff2', weight: '700' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Cormorant Garamond' },
    {
      prop: 'unicode-range',
      value:
        'U+102-103, U+110-111, U+128-129, U+168-169, U+1A0-1A1, U+1AF-1B0, U+300-301, U+303-304, U+308-309, U+323, U+329, U+1EA0-1EF9, U+20AB',
    },
  ],
})

export const cormorantCyrillic = localFont({
  src: [
    { path: './fonts/cormorant-garamond-cyrillic.woff2', weight: '600' },
    { path: './fonts/cormorant-garamond-cyrillic.woff2', weight: '700' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Cormorant Garamond' },
    { prop: 'unicode-range', value: 'U+301, U+400-45F, U+490-491, U+4B0-4B1, U+2116' },
  ],
})

export const cormorantCyrillicExt = localFont({
  src: [
    { path: './fonts/cormorant-garamond-cyrillic-ext.woff2', weight: '600' },
    { path: './fonts/cormorant-garamond-cyrillic-ext.woff2', weight: '700' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Cormorant Garamond' },
    {
      prop: 'unicode-range',
      value: 'U+460-52F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F',
    },
  ],
})


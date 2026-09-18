import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter, Oswald } from 'next/font/google'
import './globals.css'
import { siteUrl } from '@/lib/siteUrl'

// Inter everywhere; Oswald for property titles, always uppercase.
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const oswald = Oswald({ variable: '--font-oswald', subsets: ['latin'] })

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
 * different weights, and that cannot be done from one file. The cost is one extra latin
 * subset, not a family: the browser fetches only the weights and ranges it uses.
 *
 * **Neither weight can be changed from `Wordmark.tsx` alone.** Asking for a weight a subset
 * does not carry is how a browser ends up synthesising one — and at a single step it does
 * not even do that: with only the old file loaded, the new class selects that same face and
 * renders identically, so the change looks like a no-op and gets committed as one. The list
 * here and the classes there are one setting in two places, and
 * `tests/unit/wordmark.test.tsx` pins them together.
 *
 * `adjustFontFallback` is left at its default of `true`, which is load-bearing here rather
 * than incidental. `lib/headerReservation.ts` sizes the hero's top padding against the
 * header as it paints with **no webfonts at all**, and swapping the wordmark from a
 * condensed sans to a serif changes what that fallback is. The generated `size-adjust`
 * face is what keeps the blocked-font wordmark close to the loaded one, and it is why that
 * reservation table did not have to move. If you ever set this to `false`, re-measure it.
 */
const cormorant = Cormorant_Garamond({
  variable: '--font-wordmark-cormorant',
  subsets: ['latin'],
  weight: ['600', '700'],
})

export const metadata: Metadata = {
  // Required, and its absence is silent. `opengraph-image.tsx` is a file-convention
  // image, so Next resolves its URL against metadataBase — and with none set it falls
  // back to VERCEL_* env vars, then to http://localhost:3000. On Railway that means every
  // insights article would advertise an og:image at localhost, so every LinkedIn share
  // card on the site's highest-leverage surface would render with no image at all.
  metadataBase: new URL(siteUrl()),
  title: 'EM8 Properties',
  description:
    'Transit-oriented multifamily and mixed-use development in suburban Chicago.',
}

/**
 * Root shell: document, fonts, tokens. Deliberately fetches nothing.
 *
 * The site chrome and the siteSettings guard live in `(site)/layout.tsx` instead, so
 * /studio and the API routes render without them. Putting the guard here locked an
 * editor out of the only tool that can fix a missing siteSettings document — the layout
 * threw, and /studio rendered inside it.
 *
 * Props are typed explicitly rather than with Next 16's generated `LayoutProps`: that
 * global only exists once `.next/types` has been produced by a build, so it fails
 * `tsc --noEmit` on a clean checkout, including in CI, which typechecks before building.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${inter.variable} ${oswald.variable} ${cormorant.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans antialiased">{children}</body>
    </html>
  )
}

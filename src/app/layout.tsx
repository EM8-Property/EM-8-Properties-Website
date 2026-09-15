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
 * Pinned to weight 300 because the logo is Cormorant Garamond *Light* specifically — the
 * 400 is a visibly heavier mark, and asking for a weight a subset does not carry is how a
 * browser ends up synthesising one. One weight, one subset, so this costs a single small
 * file rather than a family.
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
  weight: '300',
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

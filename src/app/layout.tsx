import type { Metadata } from 'next'
import './globals.css'
import { siteUrl } from '@/lib/siteUrl'
// The @font-face rules for Inter, Oswald and Cormorant Garamond, self-hosted: see fonts.ts.
// globals.css names the families. Nothing here reads the module's exports.
import './fonts'

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
      className="h-full"
    >
      <body className="flex min-h-full flex-col font-sans antialiased">{children}</body>
    </html>
  )
}

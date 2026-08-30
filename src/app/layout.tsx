import type { Metadata } from 'next'
import { Inter, Oswald } from 'next/font/google'
import './globals.css'

// Inter everywhere; Oswald only for the wordmark and property titles, always uppercase.
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const oswald = Oswald({ variable: '--font-oswald', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EM8 Properties',
  description:
    'Transit-oriented multifamily and mixed-use development in suburban Chicago.',
}

// Task 5 replaces this with the full shell (SiteHeader / SiteFooter, siteSettings).
// `dir="ltr"` is explicit so Phase 2's RTL switch has an obvious single place to change.
//
// Props are typed explicitly rather than with Next 16's generated `LayoutProps<'/'>`:
// that global only exists once `.next/types` has been produced by a build, so it fails
// `tsc --noEmit` on a clean checkout — including in CI, which typechecks before building.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${oswald.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">{children}</body>
    </html>
  )
}

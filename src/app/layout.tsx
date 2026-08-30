import type { Metadata } from 'next'
import { Inter, Oswald } from 'next/font/google'
import './globals.css'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { fetchSanity } from '@/sanity/client'
import { SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type { SITE_SETTINGS_QUERY_RESULT } from '@/sanity/types.generated'

// Inter everywhere; Oswald only for the wordmark and property titles, always uppercase.
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const oswald = Oswald({ variable: '--font-oswald', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EM8 Properties',
  description:
    'Transit-oriented multifamily and mixed-use development in suburban Chicago.',
}

// Props are typed explicitly rather than with Next 16's generated `LayoutProps<'/'>`:
// that global only exists once `.next/types` has been produced by a build, so it fails
// `tsc --noEmit` on a clean checkout — including in CI, which typechecks before building.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY)

  // Deliberate. Missing required content fails the build loudly rather than rendering a
  // shell with an empty footer and a dead Investor Login button. Silent fallback content
  // is the exact failure mode the old site's constants.ts created, and it is why nobody
  // noticed the site had drifted from its own CMS.
  if (!settings?.agoraPortalUrl || !settings?.disclaimer) {
    throw new Error(
      'siteSettings is missing or incomplete. Publish a siteSettings document in the ' +
        'Studio with agoraPortalUrl and disclaimer set: https://em-8-properties.sanity.studio',
    )
  }

  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${oswald.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <SiteHeader agoraUrl={settings.agoraPortalUrl} />
        <main className="flex-1">{children}</main>
        <SiteFooter disclaimer={settings.disclaimer} />
      </body>
    </html>
  )
}

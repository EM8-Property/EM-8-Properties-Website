import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }

/**
 * The default share card, at a fixed URL every page can point at.
 *
 * This started as `(site)/opengraph-image.tsx`, using Next's file convention. Measuring
 * the built HTML showed that does not do what it looks like it does: the card appeared on
 * `/` and on no other route. The convention applies to the segment holding the file, and
 * `(site)` is a route group whose own page is the homepage — the six sibling routes
 * inherited nothing, so they were still shipping with no `og:image` after the change
 * meant to give them one. Nothing in the build, the tests, lint or a typecheck would have
 * said so.
 *
 * A route handler has a URL that is known in advance, so `pageMetadata` can name it
 * directly and every page gets the same card from one implementation. The per-article card
 * at `(site)/insights/[slug]/opengraph-image.tsx` still overrides this, and so does a
 * property page's own photograph.
 *
 * `siteSettings.defaultShareImage` remains the intended home for a chosen image; it is
 * unset and read by nothing today, and wiring it needs these pages to become async, which
 * is the CMS-metadata change. Generating the card means the gap cannot reopen silently in
 * the meantime.
 */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#FFFFFF',
          padding: 72,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 2,
            color: '#1A1A1A',
          }}
        >
          EM8&nbsp;<span style={{ color: '#2C7A74' }}>PROPERTIES</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 54,
            fontWeight: 700,
            lineHeight: 1.15,
            color: '#1A1A1A',
            maxWidth: 900,
          }}
        >
          Transit-oriented development in suburban Chicago
        </div>
        {/* Teal as a fill, which is what the accent is for. */}
        <div style={{ height: 8, width: 160, background: '#4ABDB5' }} />
      </div>
    ),
    size,
  )
}

'use client'

/**
 * Catches failures in the root layout itself, which `(site)/error.tsx` cannot — an error
 * boundary cannot catch a throw from a layout above it. Must render its own <html> and
 * <body> because it replaces the root layout entirely.
 *
 * The realistic trigger is a missing or malformed siteSettings document, so the copy
 * points at the cause rather than shrugging.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en" dir="ltr">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          background: '#FFFFFF',
          color: '#1A1A1A',
          margin: 0,
          padding: '6rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          This page couldn&rsquo;t load
        </h1>
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#555555' }}>
          Required site content may be missing. If you manage this site, check that a
          siteSettings document is published.
        </p>
        {error.digest && (
          <p style={{ marginTop: '1.5rem', fontSize: '0.6875rem', color: '#555555' }}>
            Reference: {error.digest}
          </p>
        )}
      </body>
    </html>
  )
}

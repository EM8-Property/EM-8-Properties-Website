'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // A rendering failure here usually means required CMS content is missing or
    // malformed. Log it so it is diagnosable from the Railway logs rather than only
    // visible as a generic page to whoever hit it.
    console.error('Unhandled rendering error', error)
  }, [error])

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Something went wrong</h1>
      <p className="mt-3 text-sm text-ink-secondary">
        The page didn&rsquo;t load. Trying again often clears it.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-control bg-teal px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink"
      >
        Try again
      </button>
    </div>
  )
}

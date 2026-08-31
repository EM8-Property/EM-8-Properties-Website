import Link from 'next/link'

/**
 * Segment-specific 404. These URLs are shared on LinkedIn, so a dead one is likely to be
 * hit by someone arriving from outside — send them to the feed, not the homepage.
 */
export default function PostNotFound() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        We couldn&rsquo;t find that article
      </h1>
      <p className="mt-3 text-sm text-ink-secondary">
        It may have been renamed, or the link may predate a change.
      </p>
      <Link
        href="/insights"
        className="mt-6 inline-block rounded-control bg-teal px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink"
      >
        Read our insights
      </Link>
    </div>
  )
}

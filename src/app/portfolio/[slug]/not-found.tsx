import Link from 'next/link'

/**
 * Segment-specific 404. A stale /portfolio/[slug] is the realistic not-found on this
 * site — a link shared before a slug changed — so it points back at the portfolio index
 * rather than dumping the visitor on the homepage.
 */
export default function PropertyNotFound() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        We couldn&rsquo;t find that property
      </h1>
      <p className="mt-3 text-sm text-ink-secondary">
        It may have been renamed, or the link may predate a change.
      </p>
      <Link
        href="/portfolio"
        className="mt-6 inline-block rounded-control bg-teal px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white"
      >
        View the portfolio
      </Link>
    </div>
  )
}

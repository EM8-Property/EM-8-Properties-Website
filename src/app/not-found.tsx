import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        We couldn&rsquo;t find that page
      </h1>
      <p className="mt-3 text-sm text-ink-secondary">
        It may have moved, or the link may be out of date.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-control bg-teal px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white"
      >
        Back to home
      </Link>
    </div>
  )
}

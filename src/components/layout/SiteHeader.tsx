import Link from 'next/link'

const NAV = [
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/track-record', label: 'Track Record' },
  { href: '/insights', label: 'Insights' },
  { href: '/partners', label: 'Partners' },
  { href: '/about', label: 'About' },
]

export function SiteHeader({ agoraUrl }: { agoraUrl: string }) {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-display text-lg font-bold uppercase tracking-wide text-ink"
        >
          EM8 <span className="font-light text-teal-text">Properties</span>
        </Link>
        <nav className="flex items-center gap-5 text-xs font-medium text-ink-secondary">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-ink">
              {n.label}
            </Link>
          ))}
          {/*
            Agora is a separate product on its own domain and handles accreditation
            verification. It opens in a new tab; rel="noopener noreferrer" keeps the
            opened page from reaching back into this one via window.opener.
          */}
          <a
            href={agoraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-control border border-rule px-3 py-1.5 text-ink hover:border-teal"
          >
            Investor Login
          </a>
          <Link
            href="/investors"
            className="rounded-control bg-ink px-3 py-1.5 font-semibold uppercase tracking-wide text-white"
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  )
}

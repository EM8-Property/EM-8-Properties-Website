import Link from 'next/link'

const NAV = [
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/track-record', label: 'Track Record' },
  { href: '/insights', label: 'Insights' },
  { href: '/partners', label: 'Partners' },
  { href: '/about', label: 'About' },
  { href: '/investors', label: 'Investors' },
]

/**
 * The footer was previously the disclaimer and a copyright line, with no links at all.
 * `siteSettings.contactEmail` was queried by the layout on every request and then never
 * rendered, so a visitor who reached the bottom of any page had no route to EM8 except
 * the single form on /investors.
 *
 * The address is a prop rather than a literal because it moves — it was hunter@ before it
 * was info@ — and it belongs to content, not to markup.
 */
export function SiteFooter({
  disclaimer,
  contactEmail,
}: {
  disclaimer: string
  contactEmail: string
}) {
  return (
    <footer className="mt-16 border-t border-rule bg-panel">
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="flex flex-wrap justify-between gap-8">
          <div>
            <p className="font-display text-base font-bold uppercase tracking-wide text-ink">
              EM8 <span className="font-light text-teal-text">Properties</span>
            </p>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-3 inline-block text-xs text-teal-text hover:text-ink"
            >
              {contactEmail}
            </a>
          </div>

          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-xs text-ink-secondary sm:grid-cols-3">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-ink">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        {/*
          The disclaimer is required content in Sanity, not a hardcoded string. It is the
          securities language that has to be reviewable and editable without a deploy.
        */}
        <p className="mt-10 max-w-4xl text-[10px] leading-relaxed text-ink-secondary">
          {disclaimer}
        </p>
        <p className="mt-6 text-[10px] text-ink-secondary">
          © {new Date().getFullYear()} EM8 Properties. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

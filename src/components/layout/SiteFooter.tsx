import Link from 'next/link'
import type { NavKey, NavLabels } from '@/lib/navigation'

/*
 * The DESTINATIONS are literals here, and that is the fallback this footer exists to be:
 * spec §5, "The panel must not be the only route to a page. Every destination stays in the
 * footer, which is where a reader with JavaScript disabled and a crawler both find them."
 * `navigation.test.ts` keeps the two in step, asserting that every href in `NAV_TREE`
 * appears in this file — so a node added to the tree fails until this list has it.
 *
 * The LABELS used to be literals too, on an extension of that same sentence: "a fallback
 * that reads its labels from the same document as the thing it backs up is not a
 * fallback." That does not survive contact with how the labels are actually loaded. Every
 * `navLabels` leaf is required content, so `missingLeaves` throws in the layout before a
 * page renders — there is no state in which the header's words are broken and this footer
 * is quietly holding the site together. What the literals bought was drift in one
 * direction only: rename `navLabels.portfolio` to "Our Assets" in the Studio and the
 * header changed while the footer went on saying "Portfolio", with nothing to catch it.
 *
 * So the words come from the same place the header's do, and the routes do not. Five of
 * the six map onto a nav key; `/investors` is not in `NAV_TREE` at all — it is reached
 * from the header's own button — so it carries its own required leaf,
 * `siteSettings.footerLabels.investors`.
 *
 * `/about` takes `aboutUs`, the tab's own label, rather than the `aboutEm8` panel child.
 * Both point at /about; the tab is the one a reader has already seen at the top of the
 * page, so repeating it at the bottom is the pairing that reads as the same site map
 * twice rather than as two different names for one page.
 */
const NAV: readonly { href: string; key: NavKey }[] = [
  { href: '/portfolio', key: 'portfolio' },
  { href: '/strategy', key: 'strategy' },
  { href: '/insights', key: 'insights' },
  { href: '/partners', key: 'partners' },
  { href: '/about', key: 'aboutUs' },
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
  labels,
  investorsLabel,
}: {
  disclaimer: string
  contactEmail: string
  /** `siteSettings.navLabels`, the same object the header is handed. Required leaf by leaf. */
  labels: NavLabels
  /** `siteSettings.footerLabels.investors` — the one link the top navigation has no word for. */
  investorsLabel: string
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
                {labels[n.key]}
              </Link>
            ))}
            {/*
              Last, and outside the mapped list, because it is the one destination with no
              nav key behind it — see the note above `NAV`. Keeping it out of that array is
              what lets `NAV` be typed against `NavKey` and so lets the compiler catch a
              key that `navLabels` does not have.
            */}
            <Link href="/investors" className="hover:text-ink">
              {investorsLabel}
            </Link>
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

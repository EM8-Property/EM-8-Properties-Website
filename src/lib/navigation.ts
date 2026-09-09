/**
 * The site's navigation: which nodes exist, how they nest, and where each one points.
 *
 * The labels are NOT here. They are `siteSettings.navLabels`, Hunter's decision of
 * 2026-09-08 over the recommendation to keep them in code, and the split is the design:
 * Sanity owns the words, this file owns the structure. A bad edit in the Studio can make a
 * tab read oddly; it cannot re-aim it or remove it.
 *
 * The one failure that split leaves open is a label that lies about its destination —
 * "Insights" over a link to /partners is individually valid on both halves and catchable
 * by no test. The mitigations are that the hrefs are here rather than there, and that each
 * Studio field description names the destination it labels. Spec §5 records that as a
 * trust decision taken knowingly.
 *
 * Imports nothing, deliberately, like `propertyTaxonomy.ts`, `tokens.ts` and
 * `requiredContent.ts`: a server component (the layout), a client component (SiteHeader)
 * and three test files all consume it, and anything pulled in here would be pulled into
 * all of them.
 *
 * Two dropdowns and two plain links, which is spec §5's tree:
 *
 *   About Us ▾        Strategy ▾        Portfolio   Insights
 *     About EM8         Why Midwest
 *     Why EM8           Partners
 *     Our Team
 *
 * Nine keys, not the ten §5's prose counts. The tenth in its table is Investor Login,
 * which names a third-party product rather than carrying copy and stays a literal in
 * SiteHeader — the rule `README.md` and the `headerCta` docblock both state. Nine is also
 * the reversible count: a tenth label later is an ADDITION and safe to apply ahead of its
 * code, where retiring one would be a remove-plus-add and a breaking migration.
 */
export type NavKey =
  | 'aboutUs'
  | 'aboutEm8'
  | 'whyEm8'
  | 'ourTeam'
  | 'strategy'
  | 'whyMidwest'
  | 'partners'
  | 'portfolio'
  | 'insights'

export type NavNode = {
  /** Stable across label edits. It is the `siteSettings.navLabels` key and the React key. */
  key: NavKey
  /**
   * `null` for a parent with no destination of its own. `NavDropdown` still supports that
   * shape — a dropdown parent with no page of its own is a standard pattern a future node
   * may need — but no node in this tree currently uses it.
   *
   * `aboutUs` used to be null, on the reasoning that every page under it is a section of
   * /about, so the tab had nowhere distinct to go. Hunter overruled that on 2026-09-09:
   * `/about` IS a page and readers expect the tab to reach it, so `aboutUs` now gets a
   * destination the same way `strategy` already does — see `NavDropdown`, where a link
   * parent gets its own disclosure button so its panel stays reachable on a phone. Both
   * parents are now the same shape, and `/about` is reachable from two places in the bar
   * (the parent link and the `About EM8` panel child), exactly as `/strategy` already is
   * from `Strategy` and `Why Midwest` — consistent and intended, not a bug.
   */
  href: string | null
  children?: readonly NavNode[]
}

/** The labels, by key. Supplied by `siteSettings.navLabels`, required leaf by leaf. */
export type NavLabels = Record<NavKey, string>

export const NAV_TREE = [
  {
    key: 'aboutUs',
    href: '/about',
    children: [
      { key: 'aboutEm8', href: '/about' },
      /*
       * Sections, not pages. Hunter's word was "fold", and §12 records this as the place
       * four proposed routes became one: Why EM8 is a section of /about and Why Midwest is
       * the body of /strategy. The two pages that would have started empty are now
       * sections of pages that already have content.
       */
      { key: 'whyEm8', href: '/about#why-em8' },
      { key: 'ourTeam', href: '/about#team' },
    ],
  },
  {
    key: 'strategy',
    href: '/strategy',
    children: [
      /*
       * First child, and it repeats the parent's own page on purpose. §5: "a parent that
       * navigates cannot also open on first tap. It resolves the same way — the panel's
       * first child is the parent's own page, so the destination is reachable without
       * depending on how the parent behaves under a tap."
       *
       * Why Midwest is not a route. It is /strategy's body — the argument that page exists
       * to make — so this label names that content rather than a second address for it.
       */
      { key: 'whyMidwest', href: '/strategy' },
      { key: 'partners', href: '/partners' },
    ],
  },
  { key: 'portfolio', href: '/portfolio' },
  { key: 'insights', href: '/insights' },
] as const satisfies readonly NavNode[]

/**
 * Every label key, each parent before its own children, in bar order.
 *
 * Derived rather than written out, so it cannot disagree with the tree. `requiredContent`
 * cannot import this — it imports nothing, by design — so `navigation.test.ts` is what
 * joins the two lists, in both directions.
 */
export const NAV_KEYS: readonly NavKey[] = NAV_TREE.flatMap((node: NavNode) => [
  node.key,
  ...(node.children ?? []).map((child) => child.key),
])

/** Every href in the tree, parents included. Used to prove the footer covers them all. */
export function navDestinations(): string[] {
  return NAV_TREE.flatMap((node: NavNode) => [
    ...(node.href ? [node.href] : []),
    ...(node.children ?? []).map((child) => child.href).filter((h): h is string => !!h),
  ])
}

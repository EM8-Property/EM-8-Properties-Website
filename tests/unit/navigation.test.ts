import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'
import { NAV_TREE, NAV_KEYS, navDestinations } from '@/lib/navigation'
import { REQUIRED_SITE_SETTINGS } from '@/lib/requiredContent'

describe('the nav tree', () => {
  it('is the two dropdowns and the two plain links spec §5 specifies', () => {
    // Named rather than counted. `expected 5 to be 4` says a number changed, not which
    // tab arrived — and this shape is Hunter's instruction of 2026-09-08, so a diff here
    // is a product change and should read like one.
    expect(NAV_TREE.map((n) => n.key)).toEqual([
      'aboutUs',
      'strategy',
      'portfolio',
      'insights',
    ])
  })

  it('gives About Us no destination of its own and Strategy one', () => {
    /*
     * The asymmetry §5 calls deliberate, pinned so it cannot be tidied away. About Us is
     * a button: every page under it is a section of /about, so the tab itself has nowhere
     * distinct to go. Strategy is a link AND a parent, which is the awkward case — see
     * NavDropdown, where a link parent gets its own disclosure button so its panel stays
     * reachable on a phone.
     */
    const byKey = (k: string) => NAV_TREE.find((n) => n.key === k)!
    expect(byKey('aboutUs').href).toBeNull()
    expect(byKey('strategy').href).toBe('/strategy')
  })

  it('folds Why EM8 and Our Team into /about rather than minting routes', () => {
    // §12: "neither is a page at all". Four proposed routes became one, and these two are
    // anchors on a page that already has content. An href here that did not start with
    // /about would be that decision quietly reversed.
    const aboutChildren = NAV_TREE.find((n) => n.key === 'aboutUs')!.children!
    expect(aboutChildren.map((c) => [c.key, c.href])).toEqual([
      ['aboutEm8', '/about'],
      ['whyEm8', '/about#why-em8'],
      ['ourTeam', '/about#team'],
    ])
  })

  it('repeats /strategy as the first child of the Strategy panel', () => {
    /*
     * §5's resolution for a parent that navigates: the panel's first child is the
     * parent's own page, so the destination is reachable without depending on how the
     * parent behaves under a tap. Why Midwest IS /strategy — it is that page's body, not
     * a route of its own.
     */
    const strategyChildren = NAV_TREE.find((n) => n.key === 'strategy')!.children!
    expect(strategyChildren.map((c) => [c.key, c.href])).toEqual([
      ['whyMidwest', '/strategy'],
      ['partners', '/partners'],
    ])
  })

  it('lists nine label keys, parents and children alike', () => {
    // Nine, not the ten §5's prose counts. The tenth in its table is Investor Login,
    // which names a third-party product and stays a literal — see the plan's "Three
    // things the spec gets wrong". Nine is also the reversible count: a tenth later is an
    // addition, retiring one is a breaking migration.
    expect([...NAV_KEYS]).toEqual([
      'aboutUs',
      'aboutEm8',
      'whyEm8',
      'ourTeam',
      'strategy',
      'whyMidwest',
      'partners',
      'portfolio',
      'insights',
    ])
  })

  it('requires a Sanity label for every key in the tree', () => {
    /*
     * The failure this prevents is a tab rendering `undefined`. A node added to the tree
     * without a matching required leaf reads its label off a document that was never
     * asked to carry one, and neither guard fires: the layout only knows about leaves in
     * REQUIRED_SITE_SETTINGS, and the release gate builds its projection from the same
     * array. So the tree is the source of truth and this is the join.
     */
    const required = new Set(
      REQUIRED_SITE_SETTINGS.map((leaf) => leaf.path).filter((p) =>
        p.startsWith('navLabels.'),
      ),
    )
    for (const key of NAV_KEYS) {
      expect(
        required.has(`navLabels.${key}`),
        `nav node "${key}" has no required siteSettings leaf — its tab would render ` +
          'undefined and nothing would report it',
      ).toBe(true)
    }
    // The reverse too, so a leaf cannot outlive the node it labelled: a required leaf
    // with no node fails every build on content nothing renders.
    expect(
      required.size,
      'a navLabels leaf exists for a node that is not in the tree',
    ).toBe(NAV_KEYS.length)
  })

  it('keeps every destination in the footer, so the panel is never the only route', () => {
    /*
     * §5, verbatim: "The panel must not be the only route to a page. Every destination
     * stays in the footer, which is where a reader with JavaScript disabled and a crawler
     * both find them."
     *
     * Asserted against the footer's source rather than a render, because the footer's
     * labels are literals and its list is hand-maintained — this is the check that fails
     * when someone adds a nav node and forgets the other file. Anchors are compared by
     * their page: /about#team is reachable from a footer link to /about.
     */
    const footer = stripComments(
      readFileSync(
        resolve(import.meta.dirname, '../../src/components/layout/SiteFooter.tsx'),
        'utf8',
      ),
    ).replace(/\r\n/g, '\n')

    for (const href of navDestinations()) {
      const page = href.split('#')[0]!
      expect(
        footer.includes(`href: '${page}'`),
        `${href} is reachable from the nav panel and not from the footer`,
      ).toBe(true)
    }
  })

  it('mints no URL of its own for a property', () => {
    // Non-negotiable #4: one canonical URL per property, /portfolio/[slug]. A nav node
    // pointing into a property is how a second index of EM8's assets starts.
    for (const href of navDestinations()) {
      expect(href).not.toMatch(/^\/portfolio\/./)
    }
  })
})

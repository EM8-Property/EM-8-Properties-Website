import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { schemaTypes, SINGLETON_TYPES } from '@/sanity/schema'
import { PAGE_COPY } from '../../scripts/content/em8-content.mjs'
import { readSourceProse } from '../shared/sourceScan'
import { HomeHero } from '@/components/home/HomeHero'

/* eslint-disable @typescript-eslint/no-explicit-any -- asserting on raw schema shape */
const byName = (n: string) => schemaTypes.find((t: any) => t.name === n) as any

/**
 * Plan revision D4 recorded the hardcoded marketing copy as a conscious Phase 1 tradeoff:
 * the Partners cards, the Investors steps and the homepage hero lived as literals in TSX,
 * so the team could not edit its own investor-facing words without a developer.
 *
 * These tests pin the fix — and, more usefully, pin that it stays fixed. The prose scan
 * below is the one that matters: it fails if that copy ever reappears in a component.
 */
describe('page copy schema', () => {
  it('defines a singleton per page', () => {
    for (const t of ['homePage', 'aboutPage', 'partnersPage', 'investorsPage']) {
      expect(byName(t), `${t} is not registered`).toBeDefined()
      expect(SINGLETON_TYPES as readonly string[]).toContain(t)
    }
  })

  it('keeps every page singleton out of the create-new menu', () => {
    // A second homePage would be silently ignored by the query, so an editor's work would
    // land in a document the site never reads.
    expect(SINGLETON_TYPES).toContain('siteSettings')
    expect(SINGLETON_TYPES.length).toBe(5)
  })
})

describe('seeded page copy', () => {
  it('carries copy for all four pages', () => {
    expect(Object.keys(PAGE_COPY).sort()).toEqual([
      'aboutPage',
      'homePage',
      'investorsPage',
      'partnersPage',
    ])
  })

  it('reproduces the hero exactly as it shipped', () => {
    // This is a move, not a rewrite. If the seed drifts from what was on the page, the
    // "no visible change" claim is false.
    const hero = (PAGE_COPY as any).homePage.hero
    expect(hero.title).toBe('Creating communities people')
    expect(hero.titleAccent).toBe('choose to live in')
    expect(hero.primaryCta.href).toBe('/portfolio')
    expect(hero.secondaryCta.href).toBe('/insights')
  })

  it('states no return in any investor step', () => {
    const steps = JSON.stringify((PAGE_COPY as any).investorsPage.steps).toLowerCase()
    for (const banned of ['guaranteed', 'will return', 'risk-free', 'assured', 'no risk']) {
      expect(steps, `investor step promises "${banned}"`).not.toContain(banned)
    }
  })

  it('moves the partners deal-size figure into the CMS where the gate can see it', () => {
    // Plan revision R11 flagged "$10M – $50M" as an invented-looking figure sitting in TSX
    // with nothing gating it. In the CMS it is scanned like everything else.
    const facts = (PAGE_COPY as any).partnersPage.facts
    expect(facts.some((f: any) => f.label === 'Deal Size')).toBe(true)
  })
})

describe('the copy has actually left the components', () => {
  /**
   * `metadata` blocks are excluded, and that is a real remaining gap rather than a
   * convenience: each page's SEO title and description are still literals in TSX, because
   * Next's static `metadata` export cannot read the CMS without converting every page to
   * `generateMetadata`. Body copy — everything a visitor reads on the page — has moved.
   *
   * Stripping them here keeps the scan honest about what it proves. Widening it to ignore
   * the strings outright would let real hardcoded copy back in under the same exemption.
   */
  const prose = readSourceProse().map((f) => ({
    ...f,
    text: f.text.replace(/export const metadata[\s\S]*?\n\}/g, ''),
  }))
  const find = (needle: string) =>
    prose.filter((f) => f.text.includes(needle)).map((f) => f.file)

  it('no longer hardcodes the homepage hero', () => {
    expect(find('Creating communities people')).toEqual([])
  })

  it('no longer hardcodes any page heading', () => {
    for (const heading of [
      'Four things we refuse to compromise on',
      'One accountable team, start to finish',
      'We work with investors who can wait',
      'Have land near a Metra station',
      'How an investment works',
      'Currently accepting commitments',
    ]) {
      expect(find(heading), `"${heading}" is still hardcoded`).toEqual([])
    }
  })

  it('no longer hardcodes the partner names', () => {
    // Kinzie and Advantage are named partners; spec §10.3 assumes their consent, which
    // makes them exactly the kind of copy that must be editable without a deploy.
    expect(find('Our builder across the portfolio')).toEqual([])
    expect(find('Day-to-day operations and resident experience')).toEqual([])
  })

  it('no longer hardcodes the investor steps', () => {
    expect(find('Our portal verifies your accreditation')).toEqual([])
    expect(find('Subscription documents and capital calls')).toEqual([])
  })

  it('no longer hardcodes the deal-size figure', () => {
    expect(find('$10M – $50M')).toEqual([])
  })
})

describe('HomeHero', () => {
  const hero = {
    eyebrow: 'Eyebrow here',
    title: 'A headline',
    titleAccent: 'with an accent',
    titleSuffix: '.',
    intro: 'Some introductory copy.',
    primaryCta: { label: 'Go', href: '/portfolio' },
    secondaryCta: { label: 'Read', href: '/insights' },
  }

  it('renders the copy it is given', () => {
    render(<HomeHero hero={hero} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'A headline with an accent.',
    )
    expect(screen.getByRole('link', { name: 'Go' }).getAttribute('href')).toBe('/portfolio')
  })

  it('renders without an accent or a second button', () => {
    render(<HomeHero hero={{ ...hero, titleAccent: null, titleSuffix: null, secondaryCta: null }} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('A headline')
    expect(screen.queryByRole('link', { name: 'Read' })).toBeNull()
  })
})

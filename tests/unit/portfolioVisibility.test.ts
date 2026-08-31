import { describe, it, expect } from 'vitest'
import { schemaTypes } from '@/sanity/schema'
import {
  ALL_PROPERTIES_QUERY,
  CURRENT_OFFERINGS_QUERY,
  SOLD_PROPERTIES_QUERY,
  PROPERTY_SLUGS_QUERY,
  PROPERTY_BY_SLUG_QUERY,
} from '@/sanity/queries'

/* eslint-disable @typescript-eslint/no-explicit-any -- asserting on raw schema shape */
const field = (n: string) =>
  (schemaTypes.find((t: any) => t.name === 'property') as any).fields.find((f: any) => f.name === n)

/**
 * Antioch Shopping Plaza is under contract, not owned. Listing it under "Assets across the
 * Chicago MSA" states that EM8 owns it, which is the same misstatement the `under-contract`
 * status was added to avoid — one level up, at the index.
 *
 * The toggle hides a property from the assets listing only. It stays a live offering, it
 * keeps its own page, and a sold asset still reaches /track-record; hiding it from those
 * too would make one flag mean four different things.
 */
describe('showInPortfolio', () => {
  it('exists and defaults to visible, so nothing already listed disappears', () => {
    const f = field('showInPortfolio')
    expect(f).toBeDefined()
    expect(f.type).toBe('boolean')
    expect(f.initialValue).toBe(true)
  })

  it('filters the assets listing', () => {
    // `!= false` rather than `== true`: every existing document predates this field and
    // has no value at all, so `== true` would empty the portfolio page on deploy.
    expect(ALL_PROPERTIES_QUERY).toContain('showInPortfolio != false')
  })

  it('does not touch the current-offering module', () => {
    // Antioch is precisely the case: hidden from assets, still openly offered.
    expect(CURRENT_OFFERINGS_QUERY).not.toContain('showInPortfolio')
  })

  it('does not touch the track record', () => {
    expect(SOLD_PROPERTIES_QUERY).not.toContain('showInPortfolio')
  })

  it('still builds a page for a hidden property', () => {
    // The offering module links to it, so its URL has to resolve.
    expect(PROPERTY_SLUGS_QUERY).not.toContain('showInPortfolio')
    expect(PROPERTY_BY_SLUG_QUERY).not.toContain('showInPortfolio')
  })
})

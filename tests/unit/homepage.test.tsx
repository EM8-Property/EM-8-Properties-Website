import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomeHero } from '@/components/home/HomeHero'
import { PAGE_COPY } from '../../scripts/content/em8-content.mjs'

const PROMISSORY = /(guaranteed|will return|assured|risk-free|no risk)/i

/**
 * Rendered with the copy that actually ships, not with a fixture.
 *
 * The hero words moved into the CMS (plan revision D4), so asserting against a stand-in
 * would prove nothing about the live page. These render the seeded payload — the same
 * strings the migration writes — so the compliance and no-invented-figure guarantees still
 * cover the real hero rather than a test double.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- plain ESM data module */
const hero = (PAGE_COPY as any).homePage.hero

describe('HomeHero', () => {
  it('leads with the purpose, not the balance sheet', () => {
    render(<HomeHero hero={hero} />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(/choose to live in/i)
    expect(h1.textContent).not.toMatch(/\$100M/)
  })

  it('states the TOD thesis in the subhead', () => {
    render(<HomeHero hero={hero} />)
    expect(screen.getByText(/walking distance of Metra/i)).toBeDefined()
  })

  it('uses no promissory return language', () => {
    const { container } = render(<HomeHero hero={hero} />)
    expect(container.textContent ?? '').not.toMatch(PROMISSORY)
  })

  it('carries no invented figure in the hero', () => {
    // Spec §9: no placeholder number ships. The hero is the most likely place for one
    // to be hardcoded and forgotten.
    const { container } = render(<HomeHero hero={hero} />)
    expect(container.textContent ?? '').not.toMatch(/\d+(\.\d+)?x\b|\$\d|\d+%/)
  })
})

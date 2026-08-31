import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Band, alternatingTones } from '@/components/ui/Band'

/**
 * The homepage banded white and grey down the page, with each section hardcoding its own
 * ground. Every one of those sections is conditional — stats, factors, insights,
 * portfolio, testimonials and offerings each render only when they have content — so the
 * alternation held only for whichever combination happened to exist when it was written.
 *
 * Publishing the first two testimonials put "What our partners say" directly above
 * "Currently accepting commitments", both grey: 782px of continuous panel separated by a
 * 0.67px hairline. That is the grey-on-grey.
 *
 * Computing the tones from the sections that actually render is the fix. Hand-assigning
 * them again would just wait for the next combination nobody tried.
 */
describe('alternatingTones', () => {
  it('never repeats a tone twice in a row', () => {
    for (let n = 0; n <= 12; n++) {
      const tones = alternatingTones(n)
      expect(tones).toHaveLength(n)
      for (let i = 1; i < tones.length; i++) {
        expect(tones[i], `tone repeated at index ${i} of ${n}`).not.toBe(tones[i - 1])
      }
    }
  })

  it('starts on the plain ground, since the stat band above it is panelled', () => {
    expect(alternatingTones(3)).toEqual(['ground', 'panel', 'ground'])
  })

  it('handles no sections at all', () => {
    expect(alternatingTones(0)).toEqual([])
  })
})

describe('Band', () => {
  it('paints the panel tone and separates it with a rule', () => {
    const { container } = render(<Band tone="panel">x</Band>)
    const cls = container.firstElementChild!.className
    expect(cls).toContain('bg-panel')
    expect(cls).toMatch(/border-y|border-t/)
  })

  it('leaves the plain ground unpainted and unruled', () => {
    // A rule between two sections that already differ in ground is noise.
    const { container } = render(<Band tone="ground">x</Band>)
    const cls = container.firstElementChild!.className
    expect(cls).not.toContain('bg-panel')
    expect(cls).not.toMatch(/border-y|border-t/)
  })

  it('constrains its content to the site measure', () => {
    const { container } = render(<Band tone="ground">x</Band>)
    expect(container.innerHTML).toContain('max-w-[1200px]')
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<Band tone="panel">x</Band>)
    expect(container.innerHTML).not.toMatch(
      /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/,
    )
  })
})

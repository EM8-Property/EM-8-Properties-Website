import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Testimonials } from '@/components/ui/Testimonials'
import { stripOuterQuotes } from '@/components/ui/Testimonials'

const ITEMS = [
  { _id: 'a', quote: 'These are the best guys in the City.', attribution: 'Hunter Heyman', descriptor: 'Investor' },
  { _id: 'b', quote: '"Already wrapped in quotes."', attribution: 'Alexander', descriptor: 'Investor' },
]

/**
 * The cards were white on the homepage's #F5F5F3 panel — about 1.04:1 between the two
 * surfaces, separated by a single hairline rule. At a glance they did not read as cards at
 * all, which is the "grey on grey" complaint. On /investors, which has no panel, they were
 * white on white and read as nothing whatsoever.
 *
 * Replacing the filled card with a teal start-rule fixes both grounds at once and matches
 * the language the four success factors already use. A quote does not need a box.
 */
describe('Testimonials', () => {
  it('does not paint a card fill that can match its own ground', () => {
    const { container } = render(<Testimonials items={ITEMS} />)
    const fig = container.querySelector('figure')!
    expect(fig.className).not.toMatch(/bg-ground|bg-panel|bg-white/)
  })

  it('separates each quote with the accent rule, which reads on any ground', () => {
    const { container } = render(<Testimonials items={ITEMS} />)
    const fig = container.querySelector('figure')!
    // border-s, not border-l: this flips side in Hebrew.
    expect(fig.className).toMatch(/border-s-2/)
    expect(fig.className).toMatch(/border-teal/)
  })

  it('renders one pair of quotation marks, not two', () => {
    // The component adds typographic quotes and the stored text often already carries
    // straight ones, so both quotes rendered as ""like this"".
    render(<Testimonials items={ITEMS} />)
    const second = screen.getByText(/Already wrapped in quotes/)
    expect(second.textContent).toBe('“Already wrapped in quotes.”')
  })

  it('still quotes text that has none of its own', () => {
    render(<Testimonials items={ITEMS} />)
    expect(screen.getByText(/best guys/).textContent).toBe(
      '“These are the best guys in the City.”',
    )
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<Testimonials items={ITEMS} />)
    expect(container.innerHTML).not.toMatch(
      /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/,
    )
  })
})

describe('stripOuterQuotes', () => {
  it('removes a matched pair of straight quotes', () => {
    expect(stripOuterQuotes('"hello"')).toBe('hello')
  })

  it('removes a matched pair of curly quotes', () => {
    expect(stripOuterQuotes('“hello”')).toBe('hello')
  })

  it('leaves unquoted text alone', () => {
    expect(stripOuterQuotes('hello')).toBe('hello')
  })

  it('leaves an internal quote alone', () => {
    // Only a matched pair wrapping the whole string is removed. A quotation inside the
    // sentence is the author's, not stray punctuation.
    expect(stripOuterQuotes('he said "hi" to me')).toBe('he said "hi" to me')
  })

  it('does not strip a lone leading quote', () => {
    expect(stripOuterQuotes('"unbalanced')).toBe('"unbalanced')
  })

  it('tolerates empty and missing input', () => {
    expect(stripOuterQuotes('')).toBe('')
    expect(stripOuterQuotes(null)).toBe('')
  })
})

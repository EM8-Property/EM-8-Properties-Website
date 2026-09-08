import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TeamBio } from '@/components/about/TeamBio'

describe('TeamBio disclosure', () => {
  const BIO = 'First paragraph.\n\nSecond paragraph.'

  it('collapses the bio behind a summary', () => {
    const { container } = render(<TeamBio bio={BIO} name="Nir Dror" />)
    const details = container.querySelector('details')
    expect(details, 'the bio is not inside a <details>').not.toBeNull()
    // Closed by default: Etamar asked for bios that appear on click, and collapsing them
    // is also what shortens /about on a phone.
    expect(details!.hasAttribute('open')).toBe(false)
  })

  it('accessible name contains both the visible label and the person, per WCAG 2.5.3', () => {
    // Two things have to hold at once, in the accessible name (not just the DOM text).
    // The person's name has to be there, because a screen reader announces the control on
    // its own, without the card around it, and eight identical "Read bio" controls on one
    // page would otherwise be indistinguishable. And the visible words "Read bio" have to
    // be *contained in* that same name, because WCAG 2.5.3 (Label in Name) requires a
    // speech-input user who says "click Read bio" to have something to match against — an
    // accessible name that drops the visible label, e.g. by hiding it with aria-hidden,
    // fails that criterion even if a name is present.
    const { container } = render(<TeamBio bio={BIO} name="Nir Dror" />)
    const summary = container.querySelector('summary')!
    expect(summary).toHaveAccessibleName(/Nir Dror/)
    expect(summary).toHaveAccessibleName(/Read bio/)
  })

  it('still preserves paragraph breaks', () => {
    // The reason this component exists: `bio` is a plain text field, so a board member's
    // three-paragraph career collapses into one wall of text in a single <p>.
    const { container } = render(<TeamBio bio={BIO} name="Nir Dror" />)
    expect(container.querySelectorAll('details p')).toHaveLength(2)
  })

  it('renders nothing at all when there is no bio', () => {
    // No empty disclosure. A summary that opens onto nothing is worse than no control.
    const { container } = render(<TeamBio bio={null} name="Nir Dror" />)
    expect(container.innerHTML).toBe('')
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<TeamBio bio={BIO} name="Nir Dror" />)
    expect(container.innerHTML).not.toMatch(/\b(ml-|mr-|pl-|pr-|text-left|text-right)/)
  })
})

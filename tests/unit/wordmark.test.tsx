import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Wordmark } from '@/components/layout/Wordmark'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'
import { ShareCardFrame } from '@/components/seo/shareCardFrame'
import { palette } from '@/lib/tokens'

/**
 * The logo changed on 2026-09-15, from `EM8 Properties` in Oswald bold to Cormorant
 * Garamond Light with a teal `8`. It was spelled out in three files at the time. These
 * tests pin the three things that would each be invisible if they broke.
 */
describe('the wordmark', () => {
  it('keeps "EM8 Properties" as the accessible name even though it only shows EM8', () => {
    // The header's link is the only route home from every page. When the visible mark
    // lost the word "Properties", the accessible name of that link went with it unless
    // something carried it — and no test, lint or typecheck reports an accessible name
    // getting worse. `sr-only` text is what keeps a screen reader and a crawler reading
    // the company's name.
    render(<Wordmark />)
    expect(screen.getByText(/Properties/)).toHaveClass('sr-only')
    expect(document.body.textContent?.replace(/\s+/g, ' ')).toContain('EM8 Properties')
  })

  it('sets the 8 in `teal`, not `teal-text`, and only at a size that token allows', () => {
    // `tokens.ts` requires `tealText` below 24px. The `8` is exempt as part of a logo,
    // but the mark is set at 24px anyway so the exemption is never the thing load-bearing.
    // If someone shrinks it, this test is the reminder that the pair moves together.
    const { container } = render(<Wordmark />)
    const eight = screen.getByText('8')
    expect(eight).toHaveClass('text-teal')
    expect(eight).not.toHaveClass('text-teal-text')
    expect(container.querySelector('.font-wordmark')).toHaveClass('text-2xl')
  })

  it('draws the lockup as EM8 over a rule over PROPERTIES, and hides the rule', () => {
    const { container } = render(<Wordmark variant="lockup" />)
    // `Properties` is real, visible text in this variant — not the mark's `sr-only` copy.
    const properties = screen.getByText('Properties')
    expect(properties).not.toHaveClass('sr-only')
    expect(properties).toHaveClass('uppercase')
    // The rule is decoration between two pieces of one word and must not be announced.
    const rule = container.querySelector('.bg-rule')
    expect(rule).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders no visible "Properties" in the mark variant', () => {
    // The whole point of the header variant. A regression here is a header that silently
    // grew a word back.
    const { container } = render(<Wordmark />)
    const visible = [...container.querySelectorAll('*')].filter(
      (el) => el.textContent?.includes('Properties') && !el.classList.contains('sr-only'),
    )
    expect(visible.every((el) => el.querySelector('.sr-only'))).toBe(true)
  })
})

/**
 * The mark's weight is two edits in two files, and either one alone is silently wrong.
 *
 * It went Light → SemiBold on 2026-09-18, because Hunter asked for the logo at the top and
 * bottom of the page to be bolder, twice. The class here is only half of that: the
 * Cormorant subset in `app/layout.tsx` is pinned to a single weight, so `font-semibold`
 * against a subset pinned elsewhere selects that other face and paints the wrong weight. A
 * browser does not synthesise a single step, and nothing else in the suite, the typecheck
 * or the lint would report it — the classes would read as bold and the logo would not be.
 *
 * So these pin the pair, in the spirit of `typeScale.test.tsx` pinning the phone leading
 * next to the phone size: the thing that was costed is the combination.
 */
describe('the wordmark weight', () => {
  const layoutSource = stripComments(
    readFileSync(resolve(import.meta.dirname, '../../src/app/layout.tsx'), 'utf8'),
  )

  it('sets both lines of the lockup at the same weight, and not at the Light it started from', () => {
    // One brand asset, one weight — as it was at Light. A change that boldens `EM8` and
    // leaves `PROPERTIES` behind splits the lockup against its own artwork.
    const { container } = render(<Wordmark variant="lockup" />)
    const faces = [...container.querySelectorAll('.font-wordmark')]
    expect(faces).toHaveLength(2)
    for (const face of faces) {
      expect(face).toHaveClass('font-semibold')
      expect(face).not.toHaveClass('font-light')
    }
  })

  it('loads the weight those classes ask for, so the mark is not silently another weight', () => {
    // The other half of the pair. Comments are stripped because the docblocks in both
    // files discuss the weights they replaced in order to explain why they must not
    // come back, and a naive grep would read that prose as the setting itself.
    expect(layoutSource).toMatch(/weight:\s*'600'/)
    expect(layoutSource).not.toMatch(/weight:\s*(?!'600')'\d00'/)
  })
})

/**
 * The share card is the third drawing of the logo and the only one a browser never
 * paints, so it is the only one where a mistake reaches LinkedIn before it reaches a
 * reader. Satori takes inline styles and no classes, so these assert on style objects.
 */
describe('the share card wordmark', () => {
  it('draws the lockup in the wordmark face with a teal 8', () => {
    const el = ShareCardFrame({ headline: 'A headline' }) as React.ReactElement
    const json = JSON.stringify(el)
    expect(json).toContain('Cormorant Garamond')
    expect(json).toContain('PROPERTIES')
    // The same brand teal the browser-painted mark uses, from the same token.
    expect(json).toContain(palette.teal)
  })

  it('sets a body face on the frame so the headline is never left without one', () => {
    // Satori has no fallback: `fonts` replaces its default outright. If the frame asked
    // for `Cormorant Garamond` and nothing else, the headline — whose glyphs that
    // nine-character subset does not carry — would render as blank boxes in a PNG that
    // nothing in this repo looks at.
    const el = ShareCardFrame({ headline: 'A headline' }) as React.ReactElement<{
      style: React.CSSProperties
    }>
    expect(el.props.style.fontFamily).toBe('Geist')
  })
})

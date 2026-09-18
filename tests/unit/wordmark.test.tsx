import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Wordmark } from '@/components/layout/Wordmark'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'
import { ShareCardFrame, shareCardFonts } from '@/components/seo/shareCardFrame'
import { palette } from '@/lib/tokens'

const WEIGHT_OF_CLASS: Record<string, number> = {
  'font-light': 300,
  'font-normal': 400,
  'font-medium': 500,
  'font-semibold': 600,
  'font-bold': 700,
}

/** The numeric weight a rendered span asks for, via its Tailwind class. */
function weightOf(el: Element | undefined): number {
  const hit = [...(el?.classList ?? [])].find((c) => c in WEIGHT_OF_CLASS)
  const weight = hit === undefined ? undefined : WEIGHT_OF_CLASS[hit]
  if (weight === undefined) {
    throw new Error(`no font-weight class on: ${el?.className ?? 'nothing'}`)
  }
  return weight
}

/** The mark's size in px, whether it is set by a scale step or an arbitrary value. */
function markFontSize(container: HTMLElement): number {
  const cls = container.querySelector('.font-wordmark')?.className ?? ''
  const arbitrary = cls.match(/text-\[(\d+(?:\.\d+)?)px\]/)
  if (arbitrary) return Number(arbitrary[1])
  const SCALE: Record<string, number> = { 'text-xl': 20, 'text-2xl': 24, 'text-3xl': 30 }
  const step = Object.keys(SCALE).find((k) => cls.split(/\s+/).includes(k))
  const size = step === undefined ? undefined : SCALE[step]
  if (size === undefined) throw new Error(`could not read a font size from: ${cls}`)
  return size
}

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
    // `tokens.ts` requires `tealText` below 24px. The `8` is exempt as part of a logo, but
    // the mark is set above 24px anyway so the exemption is never the load-bearing thing.
    //
    // This asserts the **threshold**, not the exact size, because the threshold is what
    // the token rule cares about. It was pinned to `text-2xl` until 2026-09-18, when the
    // mark went to 26px and this failed for a change that was entirely safe — a test that
    // must be edited every time the mark is resized teaches the next person to edit it
    // without reading it. It still fails if anyone shrinks the mark under the token.
    const { container } = render(<Wordmark />)
    const eight = screen.getByText('8')
    expect(eight).toHaveClass('text-teal')
    expect(eight).not.toHaveClass('text-teal-text')
    expect(markFontSize(container)).toBeGreaterThanOrEqual(24)
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
 * A weight is two edits in two files, and either one alone is silently wrong.
 *
 * The logo went Light → SemiBold on 2026-09-18, and `PROPERTIES` then went on to Bold, both
 * because Hunter asked. The classes in `Wordmark.tsx` are only half of each change: a class
 * asking for a weight `app/layout.tsx` does not load selects a face the subset *does* carry
 * and paints the wrong weight. A browser does not synthesise a single step, and nothing else
 * in the suite, the typecheck or the lint would report it — the classes would read as bold
 * and the logo would not be.
 *
 * So these pin the pair, in the spirit of `typeScale.test.tsx` pinning the phone leading
 * next to the phone size: the thing that was chosen is the combination.
 */
describe('the wordmark weights', () => {
  const layoutSource = stripComments(
    readFileSync(resolve(import.meta.dirname, '../../src/app/layout.tsx'), 'utf8'),
  )

  /** Weights the Cormorant subset is actually built with, read off the font call. */
  const loadedWeights = (() => {
    const call = layoutSource.match(/Cormorant_Garamond\(\{[\s\S]*?\}\)/)
    if (!call) throw new Error('could not find the Cormorant_Garamond call in layout.tsx')
    return [...call[0].matchAll(/'(\d00)'/g)].map((m) => Number(m[1]))
  })()

  it('sets the mark at 600 and PROPERTIES at 700, which is an instruction not a default', () => {
    // These were one weight until 2026-09-18 — the artwork sets them level, and this file
    // used to argue that boldening one alone splits a single brand asset. Hunter saw the
    // deployed 600 and asked for PROPERTIES bolder than the mark. Pinned so the next person
    // to read that older reasoning does not quietly restore it.
    const { container } = render(<Wordmark variant="lockup" />)
    const [mark, properties] = [...container.querySelectorAll('.font-wordmark')]
    expect(weightOf(mark)).toBe(600)
    expect(weightOf(properties)).toBe(700)
  })

  it('loads every weight the classes ask for, so neither line is silently another weight', () => {
    // The other half of the pair, and the assertion that generalises: it compares the two
    // sides rather than naming a number, so it keeps working the next time either line
    // moves and still fails the moment a class outruns the subset.
    //
    // Comments are stripped because the docblocks in both files discuss the weights they
    // replaced in order to explain why those must not come back, and a naive grep would
    // read that prose as the setting itself.
    const { container } = render(<Wordmark variant="lockup" />)
    const asked = [...container.querySelectorAll('.font-wordmark')].map(weightOf)
    expect(asked).not.toHaveLength(0)
    for (const w of asked) {
      expect(loadedWeights).toContain(w)
    }
  })

  it('loads nothing it does not use, so the second subset stays paid for', () => {
    // Two weights is a deliberate exception to this file's long-standing one-weight rule.
    // A third arriving unused would be that rule eroding by accident rather than by
    // decision, and it costs a font file per weight.
    const { container } = render(<Wordmark variant="lockup" />)
    const asked = [...new Set([...container.querySelectorAll('.font-wordmark')].map(weightOf))]
    expect([...loadedWeights].sort((a, b) => a - b)).toEqual(asked.sort((a, b) => a - b))
  })
})

/** Every `fontWeight` the card sets on a Cormorant-faced node, in document order. */
function cardWordmarkWeights(node: unknown, out: number[] = []): number[] {
  if (!node || typeof node !== 'object') return out
  const el = node as React.ReactElement<{
    style?: React.CSSProperties
    children?: unknown
  }>
  const style = el.props?.style
  if (style?.fontFamily === 'Cormorant Garamond' && style.fontWeight != null) {
    out.push(Number(style.fontWeight))
  }
  const kids = el.props?.children
  if (Array.isArray(kids)) for (const k of kids) cardWordmarkWeights(k, out)
  else if (kids) cardWordmarkWeights(kids, out)
  return out
}

/**
 * The share card is the third drawing of the logo and the only one a browser never
 * paints, so it is the only one where a mistake reaches LinkedIn before it reaches a
 * reader. Satori takes inline styles and no classes, so these assert on style objects.
 */
describe('the share card wordmark', () => {
  // Reads the real files out of `public/fonts`, which is the thing worth checking: the
  // weights the card asks for are only real if a file exists for each of them.
  let fontFaces: Awaited<ReturnType<typeof shareCardFonts>> = []
  beforeAll(async () => {
    fontFaces = await shareCardFonts()
  })

  it('draws the lockup in the wordmark face with a teal 8', () => {
    const el = ShareCardFrame({ headline: 'A headline' }) as React.ReactElement
    const json = JSON.stringify(el)
    expect(json).toContain('Cormorant Garamond')
    expect(json).toContain('PROPERTIES')
    // The same brand teal the browser-painted mark uses, from the same token.
    expect(json).toContain(palette.teal)
  })

  it('draws the lockup at the same two weights the page does', () => {
    // The gap this closes cost two deploys. On 2026-09-18 the page's logo went Light →
    // SemiBold and then PROPERTIES on to Bold, and the card followed neither: Satori is
    // handed font *files* rather than CSS, so nothing in `shareCardFrame.tsx` moved when
    // the subset in `app/layout.tsx` did. The card kept drawing Light against a SemiBold
    // site, through a build, a full suite, a typecheck and a lint that were all green,
    // and it was caught by eye.
    //
    // Comparing the two renders rather than naming 600 and 700 is the point: the next
    // change to the page's weights fails here until the card is brought with it.
    const { container } = render(<Wordmark variant="lockup" />)
    const pageWeights = [...container.querySelectorAll('.font-wordmark')].map(weightOf)
    const cardWeights = cardWordmarkWeights(ShareCardFrame({ headline: 'A headline' }))
    expect(cardWeights).toEqual(pageWeights)
  })

  it('registers a font file for each weight it asks for, since Satori will not synthesise', () => {
    // Satori resolves by family plus weight and does not fail on a miss — it draws in
    // whichever face is registered. So a card asking for 700 with only a 600 file loaded
    // renders SemiBold and reports nothing, which is the same silent-wrong-weight failure
    // the page had, one layer down.
    const asked = [...new Set(cardWordmarkWeights(ShareCardFrame({ headline: 'A headline' })))]
    const registered = fontFaces
      .filter((f) => f.name === 'Cormorant Garamond')
      .map((f) => f.weight as number)
    expect(registered.sort((a, b) => a - b)).toEqual(asked.sort((a, b) => a - b))
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

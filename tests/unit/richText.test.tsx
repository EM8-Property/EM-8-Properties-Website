import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { RichText } from '@/components/ui/RichText'

/**
 * The NITA article (2026-11-11) had eight h2 section headings saved in Sanity and present
 * in the live HTML, yet they rendered at body size: PortableText's default <h2> carries no
 * class, and Tailwind's preflight resets headings to `font-size: inherit`. These tests pin
 * that every style the Studio offers comes out with a visible treatment.
 */
const span = (text: string, marks: string[] = []) => ({ _type: 'span', _key: text, text, marks })
const block = (key: string, style: string, children: unknown[], extra: object = {}) => ({
  _type: 'block',
  _key: key,
  style,
  markDefs: [],
  children,
  ...extra,
})

const tokens = (el: Element | null) => (el?.className ?? '').split(/\s+/).filter(Boolean)

describe('RichText', () => {
  it('gives an h2 a heading size, not the inherited body size', () => {
    const { container } = render(
      <RichText value={[block('a', 'h2', [span('What NITA is')])]} />,
    )
    const h2 = container.querySelector('h2')
    expect(h2?.textContent).toBe('What NITA is')
    expect(tokens(h2)).toContain('text-xl')
    expect(tokens(h2)).toContain('font-bold')
  })

  it('styles h3 and h4 too', () => {
    const { container } = render(
      <RichText value={[block('a', 'h3', [span('Three')]), block('b', 'h4', [span('Four')])]} />,
    )
    expect(tokens(container.querySelector('h3'))).toContain('font-bold')
    expect(tokens(container.querySelector('h4'))).toContain('font-semibold')
  })

  it('renders bold as a visibly heavier <strong>', () => {
    const { container } = render(
      <RichText value={[block('a', 'normal', [span('plain '), span('bold', ['strong'])])]} />,
    )
    const strong = container.querySelector('strong')
    expect(strong?.textContent).toBe('bold')
    expect(tokens(strong)).toContain('font-semibold')
  })

  it('puts bullets back on a bulleted list', () => {
    const { container } = render(
      <RichText
        value={[block('a', 'normal', [span('one')], { listItem: 'bullet', level: 1 })]}
      />,
    )
    expect(tokens(container.querySelector('ul'))).toContain('list-disc')
  })

  it('opens an external link in a new tab and colours it', () => {
    const { container } = render(
      <RichText
        value={[
          block('a', 'normal', [span('NITA', ['l1'])], {
            markDefs: [{ _type: 'link', _key: 'l1', href: 'https://example.org' }],
          }),
        ]}
      />,
    )
    const a = container.querySelector('a')
    expect(a?.getAttribute('href')).toBe('https://example.org')
    expect(a?.getAttribute('target')).toBe('_blank')
    expect(tokens(a)).toContain('text-teal-text')
  })
})

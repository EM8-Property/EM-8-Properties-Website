import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SectionHeading } from '@/components/ui/SectionHeading'

/**
 * Five of eight pages shipped with no `<h1>` at all — /portfolio, /insights, /investors,
 * /track-record and /partners — because `SectionHeading` hardcoded `<h2>` and those pages
 * use it for their page title.
 *
 * Nothing caught it. Lighthouse audits heading *order*, not the presence of an h1, so the
 * site scored 100 on accessibility and SEO while shipping five titleless pages. These
 * tests pin the mechanism; `pageHeadings.test.tsx` pins the pages themselves.
 */
describe('SectionHeading', () => {
  it('renders an h2 by default, so section usage is unchanged', () => {
    const { container } = render(<SectionHeading eyebrow="Portfolio" title="Our assets" />)
    expect(container.querySelector('h2')?.textContent).toBe('Our assets')
    expect(container.querySelector('h1')).toBeNull()
  })

  it('renders an h1 when asked, for the one heading that is the page title', () => {
    const { container } = render(
      <SectionHeading eyebrow="Portfolio" title="Our assets" level={1} />,
    )
    expect(container.querySelector('h1')?.textContent).toBe('Our assets')
    expect(container.querySelector('h2')).toBeNull()
  })

  it('keeps the same visual treatment at either level', () => {
    const asH1 = render(<SectionHeading eyebrow="E" title="T" level={1} />)
    const asH2 = render(<SectionHeading eyebrow="E" title="T" />)
    const cls = (c: HTMLElement, sel: string) => c.querySelector(sel)!.className
    expect(cls(asH1.container, 'h1')).toBe(cls(asH2.container, 'h2'))
  })
})

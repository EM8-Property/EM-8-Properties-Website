import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { JsonLd } from '@/components/seo/JsonLd'

describe('JsonLd', () => {
  it('emits a parseable ld+json script', () => {
    const { container } = render(<JsonLd data={{ '@type': 'Organization', name: 'EM8' }} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    expect(JSON.parse(script!.textContent!)).toEqual({ '@type': 'Organization', name: 'EM8' })
  })

  it('escapes < so a pasted closing tag cannot break out of the script', () => {
    // JSON.stringify does not escape `<`, so without this a headline containing
    // </script> would end the tag early and dump the rest of the JSON into the document.
    const { container } = render(
      <JsonLd data={{ headline: 'Before </script><img> After' }} />,
    )
    const html = container.innerHTML
    expect(html).not.toContain('</script><img>')
    expect(container.querySelector('img')).toBeNull()

    // Still valid JSON, and the value survives intact once parsed.
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(JSON.parse(script!.textContent!)).toEqual({
      headline: 'Before </script><img> After',
    })
  })
})

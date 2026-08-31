import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { schemaTypes } from '@/sanity/schema'
import { TeamBio } from '@/components/about/TeamBio'

/* eslint-disable @typescript-eslint/no-explicit-any -- asserting on raw schema shape */
const field = (doc: any, n: string) => doc.fields.find((f: any) => f.name === n)

type RuleCall = { method: string; arg: unknown }
function captureValidation(validation: (rule: any) => unknown): RuleCall[] {
  const calls: RuleCall[] = []
  const rule: any = new Proxy(
    {},
    { get: (_t, prop) => (...args: unknown[]) => (calls.push({ method: String(prop), arg: args[0] }), rule) },
  )
  validation(rule)
  return calls
}

/**
 * Staff bios are one line. A board member's is a career: prior firms, transactions,
 * degrees, usually across several paragraphs. The 200-character cap was sized for the
 * former and silently makes the latter unenterable — Sanity refuses the document, so the
 * failure surfaces as an editor being unable to save rather than as anything a test sees.
 */
describe('teamMember bio', () => {
  it('allows a full board biography', () => {
    const calls = captureValidation(field(schemaTypes.find((t: any) => t.name === 'teamMember'), 'bio').validation)
    const max = calls.find((c) => c.method === 'max')
    expect(max, 'bio has no max validation at all').toBeDefined()
    expect(max!.arg as number).toBeGreaterThanOrEqual(1200)
  })

  it('still has a ceiling, so the field cannot become a dumping ground', () => {
    const calls = captureValidation(field(schemaTypes.find((t: any) => t.name === 'teamMember'), 'bio').validation)
    expect((calls.find((c) => c.method === 'max')!.arg as number)).toBeLessThanOrEqual(2000)
  })
})

describe('TeamBio', () => {
  const TWO_PARAS = 'First paragraph about the person.\n\nSecond paragraph about their prior firm.'

  it('keeps paragraph breaks instead of running them together', () => {
    // `bio` is a plain text field, so its newlines collapse under normal HTML whitespace
    // handling and a three-paragraph career reads as one unbroken wall.
    const { container } = render(<TeamBio bio={TWO_PARAS} />)
    const paras = container.querySelectorAll('p')
    expect(paras).toHaveLength(2)
    expect(paras[0]!.textContent).toBe('First paragraph about the person.')
    expect(paras[1]!.textContent).toBe('Second paragraph about their prior firm.')
  })

  it('renders a single-paragraph bio as one paragraph', () => {
    const { container } = render(<TeamBio bio="Just the one line." />)
    expect(container.querySelectorAll('p')).toHaveLength(1)
  })

  it('renders nothing when there is no bio', () => {
    const { container } = render(<TeamBio bio={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('ignores blank lines rather than emitting empty paragraphs', () => {
    const { container } = render(<TeamBio bio={'One.\n\n\n\nTwo.'} />)
    expect(container.querySelectorAll('p')).toHaveLength(2)
  })

  it('does not use physical-direction utilities', () => {
    const { container } = render(<TeamBio bio={TWO_PARAS} />)
    expect(container.innerHTML).not.toMatch(/\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|text-left|text-right)-?\b/)
  })
})

import { describe, it, expect } from 'vitest'
import { schemaTypes } from '@/sanity/schema'

/* eslint-disable @typescript-eslint/no-explicit-any -- asserting on raw schema shape */
const byName = (n: string) => schemaTypes.find((t: any) => t.name === n) as any
const field = (doc: any, n: string) => doc.fields.find((f: any) => f.name === n)

type RuleCall = { method: string; arg: unknown }

/**
 * Runs a field's `validation` callback against a recording stand-in for Sanity's Rule,
 * returning the chain that was invoked.
 *
 * Character limits are asserted this way rather than via `options.maxLength`, which the
 * original plan used: `maxLength` exists only on SlugOptions, so on a string or text
 * field it is silently inert — TypeScript rejects it outright. `validation.max()` is what
 * enforces the cap and what drives the Studio's live character counter, so that is the
 * guardrail worth testing.
 */
function captureValidation(validation: (rule: any) => unknown): RuleCall[] {
  const calls: RuleCall[] = []
  const rule: any = new Proxy(
    {},
    {
      get(_target, prop) {
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), arg: args[0] })
          return rule
        }
      },
    },
  )
  validation(rule)
  return calls
}

describe('property schema', () => {
  const property = byName('property')

  it('exists with a required unique slug', () => {
    expect(property).toBeDefined()
    expect(field(property, 'slug').validation).toBeDefined()
    expect(captureValidation(field(property, 'slug').validation)).toContainEqual({
      method: 'required',
      arg: undefined,
    })
  })

  it('carries Metra station and walk minutes as first-class fields', () => {
    expect(field(property, 'metraStation')).toBeDefined()
    expect(field(property, 'walkMinutes').type).toBe('number')
  })

  it('caps the card blurb so it cannot overrun the card', () => {
    const calls = captureValidation(field(property, 'cardBlurb').validation)
    expect(calls).toContainEqual({ method: 'max', arg: 180 })
    expect(calls).toContainEqual({ method: 'required', arg: undefined })
  })

  it('hides deal story fields unless the property is sold', () => {
    expect(field(property, 'dealStory').hidden).toBeInstanceOf(Function)
    expect(field(property, 'dealStory').hidden({ parent: { status: 'stabilized' } })).toBe(true)
    expect(field(property, 'dealStory').hidden({ parent: { status: 'sold' } })).toBe(false)
  })

  it('defaults publiclyOffered to false so a 506(b) deal is never public by accident', () => {
    expect(field(property, 'publiclyOffered').initialValue).toBe(false)
  })

  it('requires alt text on every gallery image', () => {
    const galleryImage = field(property, 'gallery').of[0]
    const alt = galleryImage.fields.find((f: any) => f.name === 'alt')
    expect(captureValidation(alt.validation)).toContainEqual({ method: 'required', arg: undefined })
  })
})

describe('teamMember schema', () => {
  it('caps bios at 200 characters', () => {
    expect(captureValidation(field(byName('teamMember'), 'bio').validation)).toContainEqual({
      method: 'max',
      arg: 200,
    })
  })

  it('enables hotspot cropping so portrait headshots keep their subject', () => {
    expect(field(byName('teamMember'), 'photo').options?.hotspot).toBe(true)
  })
})

describe('testimonial schema', () => {
  it('carries a consent flag, since an unconsented name must never reach the site', () => {
    const consent = field(byName('testimonial'), 'consentOnRecord')
    expect(consent.type).toBe('boolean')
    expect(consent.initialValue).toBe(false)
  })
})

describe('schema completeness', () => {
  it('registers every document type the site needs', () => {
    const names = schemaTypes.map((t: any) => t.name)
    for (const n of ['property', 'post', 'teamMember', 'heroStat', 'focusCard', 'testimonial', 'lead', 'siteSettings']) {
      expect(names).toContain(n)
    }
  })

  it('does not register pullQuote — the Buffett quote was cut', () => {
    expect(schemaTypes.map((t: any) => t.name)).not.toContain('pullQuote')
  })
})

import { describe, it, expect } from 'vitest'
import { schemaTypes } from '@/sanity/schema'
import { ASSET_CLASSES, STATUSES, ASSET_CLASS_LABELS, STATUS_LABELS } from '@/lib/propertyTaxonomy'

/* eslint-disable @typescript-eslint/no-explicit-any -- asserting on raw schema shape */
const byName = (n: string) => schemaTypes.find((t: any) => t.name === n) as any
const field = (doc: any, n: string) => doc.fields.find((f: any) => f.name === n)

/**
 * Spec §4 says `publiclyOffered` "gates only the offering block: target returns, 'Enter
 * the deal room,' and the offering's appearance in any current-opportunity module" — but
 * the toggle shipped with no offering block behind it. There were no target-return fields
 * on `property` at all, because Boulevard's figures could not be sourced and the whole
 * block was deferred with them.
 *
 * Antioch Shopping Plaza has a real OM, so the block is built now.
 */
describe('property taxonomy', () => {
  it('includes retail, the asset class Antioch Shopping Plaza needs', () => {
    expect(ASSET_CLASSES).toContain('retail')
    expect(ASSET_CLASS_LABELS.retail).toBe('Retail')
  })

  it('includes under-contract, so an unclosed acquisition is not shown as owned', () => {
    // The plaza closes 2026-09-01. Presenting it as "Stabilized" before closing would
    // state that EM8 owns an asset it does not yet own.
    expect(STATUSES).toContain('under-contract')
    expect(STATUS_LABELS['under-contract']).toBe('Under Contract')
  })

  it('gives every asset class and status a label', () => {
    for (const a of ASSET_CLASSES) expect(ASSET_CLASS_LABELS[a]).toBeTruthy()
    for (const s of STATUSES) expect(STATUS_LABELS[s]).toBeTruthy()
  })
})

describe('property offering block', () => {
  const property = byName('property')
  const offering = field(property, 'offering')

  it('exists as an object on property', () => {
    expect(offering).toBeDefined()
    expect(offering.type).toBe('object')
  })

  it('carries the figures an OM actually reports', () => {
    const names = offering.fields.map((f: any) => f.name)
    for (const n of ['targetIrr', 'targetEquityMultiple', 'targetHoldYears', 'summary', 'dealRoomUrl']) {
      expect(names).toContain(n)
    }
  })

  it('hides itself unless the offering is public', () => {
    // The 506(b)/506(c) gate. A raise not filed under 506(c) may never be generally
    // solicited, so the whole block collapses when publiclyOffered is off.
    expect(offering.hidden).toBeTypeOf('function')
    expect(offering.hidden({ parent: { publiclyOffered: false } })).toBe(true)
    expect(offering.hidden({ parent: { publiclyOffered: true } })).toBe(false)
  })
})

describe('siteSettings', () => {
  it('holds the book-a-call URL as content, not as a hardcoded link', () => {
    expect(field(byName('siteSettings'), 'bookACallUrl')).toBeDefined()
  })
})

describe('lead schema', () => {
  it('accepts the newsletter source written by the homepage CTA', () => {
    const source = field(byName('lead'), 'source')
    expect(source.options.list).toContain('newsletter')
  })
})

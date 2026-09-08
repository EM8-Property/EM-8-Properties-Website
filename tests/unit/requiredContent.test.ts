import { describe, it, expect } from 'vitest'
import { REQUIRED_SITE_SETTINGS, missingLeaves } from '@/lib/requiredContent'

const COMPLETE = {
  agoraPortalUrl: 'https://example.com',
  contactEmail: 'info@em-8.com',
  disclaimer: 'x',
  headerCta: { label: 'Invest With Us', href: '/investors' },
  ctaBand: { heading: { title: 'x' }, submitLabel: 'x' },
}

describe('required siteSettings leaves', () => {
  it('lists every leaf the layout throws on', () => {
    expect(REQUIRED_SITE_SETTINGS.map((l) => l.path)).toEqual([
      'agoraPortalUrl',
      'contactEmail',
      'disclaimer',
      'headerCta.label',
      'headerCta.href',
      'ctaBand.heading.title',
      'ctaBand.submitLabel',
    ])
  })

  it('reports a leaf whose parent object exists but whose value is null', () => {
    /*
     * The trap this array exists to make unrepeatable. `headerCta { label, href }`
     * projects to a truthy OBJECT when both fields are null, so a guard written against
     * the parent waves a half-filled document straight through — and the header then
     * renders a dark rounded box with no words in it, on every page.
     */
    const missing = missingLeaves({ ...COMPLETE, headerCta: { label: null, href: null } })
    expect(missing.map((l) => l.path)).toEqual(['headerCta.label', 'headerCta.href'])
  })

  it('treats an empty string as missing, not as present', () => {
    // setIfMissing keys on absence, not on falsiness — a leaf holding '' is present and
    // useless, and a header button labelled '' is the defect this guards.
    const missing = missingLeaves({
      ...COMPLETE,
      headerCta: { label: '', href: '/investors' },
    })
    expect(missing.map((l) => l.path)).toEqual(['headerCta.label'])
  })

  it('returns nothing for a complete document', () => {
    expect(missingLeaves(COMPLETE)).toEqual([])
  })

  it('reports everything for a missing document', () => {
    expect(missingLeaves(undefined)).toHaveLength(REQUIRED_SITE_SETTINGS.length)
    expect(missingLeaves(null)).toHaveLength(REQUIRED_SITE_SETTINGS.length)
  })

  it('gives every leaf a GROQ projection and a description', () => {
    // The gate projects by these, and the layout's message is built from the
    // descriptions, so a leaf missing either fails uselessly.
    for (const leaf of REQUIRED_SITE_SETTINGS) {
      expect(leaf.groq, `${leaf.path} has no groq projection`).toBeTruthy()
      expect(leaf.describe, `${leaf.path} has no description`).toBeTruthy()
    }
  })
})

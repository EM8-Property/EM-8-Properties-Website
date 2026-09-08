import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'
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

describe('the layout consumes the array rather than repeating it', () => {
  /*
   * `resolve(import.meta.dirname, ...)` and `stripComments`, both copied from the
   * repo's existing scanners, because this file has been bitten by each: a scanner
   * resolving `src/` from the working directory silently reads nothing, and an assertion
   * that a string is ABSENT matches the comment discussing it and passes for the wrong
   * reason. `\r\n` is normalised for the same class of reason — core.autocrlf is on.
   */
  const layout = stripComments(
    readFileSync(
      resolve(import.meta.dirname, '../../src/app/(site)/layout.tsx'),
      'utf8',
    ),
  ).replace(/\r\n/g, '\n')

  it('imports the shared guard', () => {
    expect(layout).toMatch(/from '@\/lib\/requiredContent'/)
  })

  it('no longer checks leaves by hand', () => {
    /*
     * A source assertion, which is weak, and it is the right weak test here: the drift
     * this PR fixes was two lists of strings, and the only way to stop them growing back
     * is to notice when someone adds an eighth `!settings?....` beside the loop.
     */
    expect(layout).not.toMatch(/!settings\?\.headerCta\?\.label/)
    expect(layout).not.toMatch(/!settings\?\.ctaBand\?\.heading\?\.title/)
  })
})

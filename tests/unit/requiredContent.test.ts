import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'
import { REQUIRED_SITE_SETTINGS, missingLeaves } from '@/lib/requiredContent'
import { SITE_SETTINGS_QUERY } from '@/sanity/queries'

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

  it('gives every leaf a groq alias shaped the way the gate reconstructs it, and a description', () => {
    // Truthiness on `groq` guards against nothing a plausible edit would produce. What
    // actually matters: content-integrity.test.ts rebuilds a nested value from the flat
    // row by reading `leaf.groq.split('"')[1]` as the alias, so a nested leaf (a dotted
    // `path`) MUST have an aliased projection, or the gate's reconstruction silently
    // writes `undefined` in its place — and an unaliased nested projection is also
    // invalid GROQ on its own. A top-level leaf has nothing to alias, so its `groq`
    // should just be its `path`.
    for (const leaf of REQUIRED_SITE_SETTINGS) {
      expect(leaf.describe, `${leaf.path} has no description`).toBeTruthy()
      if (leaf.path.includes('.')) {
        expect(
          leaf.groq.startsWith('"'),
          `${leaf.path} is nested but its groq projection is not aliased — the release ` +
            'gate reconstructs nested values from the alias and will silently miss this one',
        ).toBe(true)
      } else {
        expect(
          leaf.groq,
          `${leaf.path} is not nested, so its groq projection should just be its path`,
        ).toBe(leaf.path)
      }
    }
  })

  it('derives a unique alias for every leaf', () => {
    // Two leaves that alias to the same flat key would make the gate's reconstruction
    // loop overwrite one leaf's value with the other's, silently — the same reason the
    // aliasing rule above exists, applied across the whole array instead of one leaf.
    const aliases = REQUIRED_SITE_SETTINGS.map((leaf) =>
      leaf.groq.includes(':') ? leaf.groq.split('"')[1]! : leaf.path,
    )
    expect(new Set(aliases).size, `duplicate aliases in: ${aliases.join(', ')}`).toBe(
      aliases.length,
    )
  })

  it('mentions every segment of every leaf\'s path in SITE_SETTINGS_QUERY', () => {
    /*
     * `(site)/layout.tsx` runs `missingLeaves` against the RESULT of `SITE_SETTINGS_QUERY`
     * — not against this array — so a leaf added to REQUIRED_SITE_SETTINGS without a
     * matching edit to the query reads as missing for a document that is actually
     * complete, and fails `next build` on all 29 pages. The release gate cannot catch
     * this: content-integrity.test.ts builds its OWN projection from `leaf.groq`, so it
     * fetches whatever the array says to fetch, gets a real value back, and stays green
     * while the build goes red on content it just certified as fine.
     *
     * This check is deliberately loose — it looks for each dotted path segment as a
     * substring anywhere in the query text, so a coincidental segment name elsewhere in
     * the query would satisfy it wrongly. That gap is accepted: this exists to catch the
     * realistic mistake, which is forgetting the query edit entirely, not to fully verify
     * the projection's shape.
     */
    for (const leaf of REQUIRED_SITE_SETTINGS) {
      for (const segment of leaf.path.split('.')) {
        expect(
          SITE_SETTINGS_QUERY.includes(segment),
          `${leaf.path}: SITE_SETTINGS_QUERY does not mention "${segment}" — the layout ` +
            'will read this leaf as always missing and fail next build on every page',
        ).toBe(true)
      }
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
     * is to notice when someone adds an eighth `!settings?....` beside the loop. Broadened
     * from asserting the two removed strings by name — that only caught those exact two
     * conditions coming back, and let any OTHER hand-written `!settings?.` condition sail
     * through untouched. The layout's only remaining use of `settings` is
     * `missingLeaves(settings)`, so this pattern has nothing legitimate left to match.
     */
    expect(layout).not.toMatch(/!settings\?\./)
  })
})

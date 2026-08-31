import { describe, it, expect } from 'vitest'
import { readSourceProse, stripComments } from '../shared/sourceScan'
import { SPEC_9_PLACEHOLDERS } from '../shared/placeholders'

/**
 * Scans the source for promissory return language and for figures spec §9 invented.
 *
 * The plan guarded both only inside the content-integrity suite, which reads Sanity
 * documents. But a great deal of investor-facing prose is hardcoded in TSX — the
 * Investors "how an investment works" steps, the Partners cards, the FactRail offering
 * block, the homepage hero — and none of it is in the CMS. Rules enforced only over
 * documents leave exactly the copy a developer writes completely uncovered.
 *
 * Permitted register for returns: targeted, projected, underwritten, estimated, pro forma.
 */
const BANNED = [
  /\bguarantee(s|d)?\b/i,
  /\bwill return\b/i,
  /\bassured\b/i,
  /\brisk[- ]free\b/i,
  /\bno risk\b/i,
  /\bcan't lose\b/i,
  /\bsafe investment\b/i,
]

describe('return language in source', () => {
  const sources = readSourceProse()

  it('finds source files to scan', () => {
    expect(sources.length).toBeGreaterThan(20)
  })

  it('uses no promissory return language anywhere in src/', () => {
    const offenders: string[] = []
    for (const { file, text } of sources) {
      for (const pattern of BANNED) {
        const match = text.match(pattern)
        if (match) offenders.push(`${file}: "${match[0]}"`)
      }
    }
    expect(offenders, `promissory language in source:\n  ${offenders.join('\n  ')}`).toEqual([])
  })

  it('actually detects a violation, so a green result means something', () => {
    // A scanner that cannot fail is decoration.
    const sample = stripComments(`
      // guaranteed — this is a comment and must be ignored
      export const Copy = () => <p>This investment is guaranteed to succeed.</p>
    `)
    expect(BANNED.some((p) => p.test(sample))).toBe(true)
  })

  it('ignores banned words that appear only in comments', () => {
    const sample = stripComments(`
      /* never write "guaranteed" or "will return" in visitor-facing copy */
      export const Copy = () => <p>Targeted returns are underwritten conservatively.</p>
    `)
    expect(BANNED.some((p) => p.test(sample))).toBe(false)
  })
})

describe('spec §9 placeholder figures in source', () => {
  const sources = readSourceProse()

  it('ships none of the figures spec §9 invented', () => {
    // The content gate checks Sanity documents. This checks the hardcoded marketing copy
    // the content gate cannot see — which, per plan revision D4, is where the Partners
    // cards, the Investors steps, and the homepage hero actually live.
    const offenders: string[] = []
    for (const { file, text } of sources) {
      for (const { pattern, note } of SPEC_9_PLACEHOLDERS) {
        if (pattern.test(text)) offenders.push(`${file}: ${note}`)
      }
    }
    expect(offenders, `placeholder figures in source:\n  ${offenders.join('\n  ')}`).toEqual([])
  })

  it('actually detects a placeholder, so a green result means something', () => {
    const sample = stripComments(`export const Copy = () => <p>We returned 2.1x on that deal.</p>`)
    expect(SPEC_9_PLACEHOLDERS.some(({ pattern }) => pattern.test(sample))).toBe(true)
  })

  it('does not flag the figures spec §9 confirms are real', () => {
    // 1.79x and 36.2% are genuine and are the most LP-relevant proof EM8 owns. If a
    // pattern ever starts matching these, the pattern is wrong, not the copy.
    const real = '$100M+ AUM, 1,350+ units managed, 750+ units sold, 1.79x realized, 36.2% annual'
    expect(SPEC_9_PLACEHOLDERS.some(({ pattern }) => pattern.test(real))).toBe(false)
  })
})

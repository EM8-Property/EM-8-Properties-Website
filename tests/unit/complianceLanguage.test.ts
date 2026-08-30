import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Scans the source for promissory return language.
 *
 * The plan's only guard on this was inside the content-integrity suite, which reads
 * Sanity documents. But a great deal of investor-facing prose is hardcoded in TSX — the
 * Investors "how an investment works" steps, the Partners cards, the FactRail offering
 * block — and none of it is in the CMS. A compliance rule enforced only over documents
 * leaves the copy most likely to be written by a developer completely uncovered.
 *
 * Permitted register: targeted, projected, underwritten, estimated, pro forma.
 */
const BANNED = [
  /\bguaranteed\b/i,
  /\bwill return\b/i,
  /\bassured returns?\b/i,
  /\brisk[- ]free\b/i,
  /\bno risk\b/i,
  /\bcan't lose\b/i,
  /\bsafe investment\b/i,
]

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      sourceFiles(full, acc)
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('types.generated.ts')) {
      acc.push(full)
    }
  }
  return acc
}

/**
 * Removes comments before scanning.
 *
 * The rule is about prose a visitor can read, and a comment cannot ship. Several
 * components document this very policy by naming the forbidden words in order to forbid
 * them — scanning comments would flag the documentation of the rule as a violation of it.
 *
 * `//` is only treated as a comment when it does not follow a colon, so URLs survive.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe('return language in source', () => {
  const files = sourceFiles('src')

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it('uses no promissory return language anywhere in src/', () => {
    const offenders: string[] = []
    for (const file of files) {
      const text = stripComments(readFileSync(file, 'utf8'))
      for (const pattern of BANNED) {
        const match = text.match(pattern)
        if (match) offenders.push(`${file}: "${match[0]}"`)
      }
    }
    expect(offenders, `promissory language in source:\n  ${offenders.join('\n  ')}`).toEqual([])
  })

  it('actually detects a violation, so a green result means something', () => {
    // A scanner that cannot fail is decoration. This proves the patterns match real copy.
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

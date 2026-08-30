import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** Absolute path to src/, independent of the process working directory. */
export const SRC_DIR = resolve(import.meta.dirname, '../../src')

export function sourceFiles(dir: string = SRC_DIR, acc: string[] = []): string[] {
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
 * These scans are about prose a visitor can read, and a comment cannot ship. Several
 * components document these very policies by naming the forbidden words and figures in
 * order to forbid them — scanning comments would flag the documentation of a rule as a
 * violation of it.
 *
 * `//` is only treated as a comment when it does not follow a colon, so URLs survive.
 */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

/** Reads every source file with comments removed, keyed by path. */
export function readSourceProse(): { file: string; text: string }[] {
  return sourceFiles().map((file) => ({
    file,
    text: stripComments(readFileSync(file, 'utf8')),
  }))
}

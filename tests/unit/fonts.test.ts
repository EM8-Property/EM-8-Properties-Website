import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

/**
 * The site's fonts are self-hosted (`src/app/fonts.ts`) so that `next build` never fetches
 * from Google Fonts. On 2026-11-11 that fetch failed a CI build: Cormorant Garamond came
 * back in a form Next could not parse. These pin the pieces that have to agree, because
 * each one fails silently: a wrong path or family name renders the fallback font, and a
 * stray preload costs every visitor a download.
 */
const root = resolve(import.meta.dirname, '../..')
const fontsSource = readFileSync(join(root, 'src/app/fonts.ts'), 'utf8')
const globalsCss = readFileSync(join(root, 'src/app/globals.css'), 'utf8')

type Call = { name: string; body: string }

/** Every `export const x = localFont({ ... })` call, by binding name. */
const calls: Call[] = [...fontsSource.matchAll(/export const (\w+) = localFont\(\{([\s\S]*?)\n\}\)/g)].map(
  (m) => ({ name: m[1]!, body: m[2]! }),
)

const familyOf = (c: Call) => c.body.match(/prop: 'font-family', value: '([^']+)'/)?.[1]
const pathsOf = (c: Call) => [...c.body.matchAll(/'(\.\/fonts\/[^']+)'/g)].map((m) => m[1]!)

describe('self-hosted fonts', () => {
  it('declares the seventeen subsets next/font/google used to generate', () => {
    const byFamily: Record<string, number> = {}
    for (const c of calls) byFamily[familyOf(c) ?? 'none'] = (byFamily[familyOf(c) ?? 'none'] ?? 0) + 1
    expect(byFamily).toEqual({ Inter: 7, Oswald: 5, 'Cormorant Garamond': 5 })
  })

  it('points every call at a real woff2 file, and every file in fonts/ is used', () => {
    const used = new Set<string>()
    for (const c of calls) {
      const paths = pathsOf(c)
      expect(paths.length, c.name).toBeGreaterThan(0)
      for (const p of paths) {
        const file = join(root, 'src/app', p)
        expect(existsSync(file), `${c.name}: ${p}`).toBe(true)
        // A woff2 file starts with the signature "wOF2". An HTML error page saved under
        // the right name would otherwise pass an existence check.
        expect(readFileSync(file).subarray(0, 4).toString('latin1'), p).toBe('wOF2')
        expect(statSync(file).size, p).toBeGreaterThan(5_000)
        used.add(p.replace('./fonts/', ''))
      }
    }
    expect(readdirSync(join(root, 'src/app/fonts')).sort()).toEqual([...used].sort())
  })

  it('gives every subset its own unicode-range, so a browser fetches only what it needs', () => {
    for (const c of calls) {
      expect(c.body, c.name).toMatch(/prop: 'unicode-range',\s*value:\s*'U\+/)
    }
    // Latin is the only subset that covers plain ASCII.
    const latin = calls.filter((c) => c.body.includes("'U+??,"))
    expect(latin.map((c) => c.name).sort()).toEqual(['cormorantLatin', 'interLatin', 'oswaldLatin'])
  })

  it('preloads the latin file of each family and nothing else, as subsets: [latin] did', () => {
    for (const c of calls) {
      const isLatin = c.name.endsWith('Latin')
      expect(/preload: false/.test(c.body), c.name).toBe(!isLatin)
    }
  })

  it('leaves the fallback faces to globals.css, with the values next/font/google computed', () => {
    for (const c of calls) expect(c.body, c.name).toContain('adjustFontFallback: false')
    for (const fallback of ['Inter Fallback', 'Oswald Fallback', 'Cormorant Garamond Fallback']) {
      expect(globalsCss).toContain(`font-family: '${fallback}';`)
    }
  })

  it('names the families in globals.css exactly as fonts.ts declares them', () => {
    // Not via next/font's `variable`: under Turbopack that names the family after the JS
    // binding, so `--font-wordmark` would point at a font called "cormorantLatin".
    expect(globalsCss).toMatch(/--font-sans: 'Inter', 'Inter Fallback'/)
    expect(globalsCss).toMatch(/--font-display: 'Oswald', 'Oswald Fallback'/)
    expect(globalsCss).toMatch(/--font-wordmark: 'Cormorant Garamond', 'Cormorant Garamond Fallback'/)
  })

  it('never goes back to fetching fonts from Google at build time', () => {
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (/\.(ts|tsx|css)$/.test(entry.name)) {
          if (/next\/font\/google|fonts\.googleapis\.com/.test(readFileSync(full, 'utf8'))) {
            offenders.push(full.slice(root.length + 1))
          }
        }
      }
    }
    walk(join(root, 'src'))
    // fonts.ts and globals.css mention next/font/google in their history comments only.
    const real = offenders.filter((f) => {
      const code = readFileSync(join(root, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      return /next\/font\/google|fonts\.googleapis\.com/.test(code)
    })
    expect(real).toEqual([])
  })
})

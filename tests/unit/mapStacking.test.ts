import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'

const src = resolve(__dirname, '../../src')
const read = (p: string) => stripComments(readFileSync(resolve(src, p), 'utf8'))

const map = read('components/property/PropertyMap.tsx')
const gallery = read('components/property/PropertyGallery.tsx')
const popup = read('components/home/InvestorPopup.tsx')

/*
 * Leaflet's z-indexes must not reach the root stacking context.
 *
 * Hunter reported this on 2026-09-16: opening a photograph in `PropertyGallery` on
 * /portfolio/382-penn-apartments showed the Glen Ellyn street map sitting on top of the
 * picture, zoom controls and all.
 *
 * Leaflet assigns 400 to its tile and overlay panes, 600 to markers, 700 to tooltips, 800
 * to `.leaflet-control` and 1000 to `.leaflet-top` / `.leaflet-bottom`, and nothing scopes
 * them. This site's own layers top out at `z-50`. So with no stacking context on the map
 * container those numbers competed in the ROOT context and won against everything.
 *
 * Measured on the running page with the overlay open, by asking `elementFromPoint` at the
 * centre of each Leaflet box whether Leaflet was the thing actually painted there:
 *
 *   isolation: isolate   ->  0 Leaflet elements on top
 *   isolation: auto      ->  4 Leaflet elements on top
 *
 * The same run restored the class and went back to 0, so that is causation rather than a
 * coincidence of scroll position.
 *
 * It was never only the gallery: `InvestorPopup` is also `fixed inset-0 z-50`, so on any
 * property page with coordinates the map would have punched through that too — it just
 * fires on a delay and had not been seen against a map yet. That is why the fix is on the
 * map rather than on the overlay, and why this test asserts the relationship between them
 * rather than a number on either one.
 */
describe('the map cannot paint over things that overlay it', () => {
  it('gives the map container its own stacking context', () => {
    // `isolate` is Tailwind's `isolation: isolate`. Pinned as the literal because it is the
    // whole fix and it looks exactly like a decorative utility to anyone tidying up.
    expect(map, 'PropertyMap lost `isolate` — Leaflet will paint over every overlay').toMatch(
      /className="[^"]*\bisolate\b/,
    )
  })

  it('does not fight Leaflet by escalating the overlays instead', () => {
    /*
     * The tempting alternative is `z-[1001]` on the overlays. It works today and loses to
     * the next library that picks a bigger number, and it has to be repeated on every
     * overlay that will ever exist. If someone has done that, the map fix has probably been
     * removed and this says so.
     */
    for (const [name, source] of [
      ['PropertyGallery', gallery],
      ['InvestorPopup', popup],
    ] as const) {
      const big = source.match(/z-\[(\d+)\]/g)
      expect(big, `${name} escalated its z-index instead of isolating the map`).toBeNull()
      expect(source, `${name} is no longer a z-50 overlay`).toMatch(/\bz-50\b/)
    }
  })

  it('has no other un-isolated third-party canvas that sets its own z-index', () => {
    /*
     * A forward guard rather than a check on any one change. Leaflet is the only library
     * here that draws its own layered UI, and the failure is silent — it looks fine until
     * something is laid over it, which is months later and in a different file.
     *
     * If a second one is added, this fails and points at it rather than letting the same
     * afternoon get spent twice.
     */
    const components = resolve(src, 'components')
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.endsWith('.tsx')) {
          const body = stripComments(readFileSync(full, 'utf8'))
          // A component that imports leaflet must isolate the element it mounts into.
          if (/from 'leaflet'|import\('leaflet'\)/.test(body) && !/\bisolate\b/.test(body)) {
            offenders.push(entry.name)
          }
        }
      }
    }
    walk(components)
    expect(offenders, `these mount Leaflet without isolating it: ${offenders.join(', ')}`).toEqual(
      [],
    )
  })
})

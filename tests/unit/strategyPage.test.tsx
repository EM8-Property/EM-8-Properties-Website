import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'
import { STRATEGY_PAGE_QUERY } from '@/sanity/queries'
import { HERO_PATHS } from '@/lib/heroPages'

/**
 * The one new route in spec §5. Asserted against its source and its query rather than by
 * rendering it: it is an async server component that fetches from Sanity, and the three
 * pages shaped like it are covered the same way.
 */
const source = stripComments(
  readFileSync(
    resolve(import.meta.dirname, '../../src/app/(site)/strategy/page.tsx'),
    'utf8',
  ),
).replace(/\r\n/g, '\n')

describe('the strategy page', () => {
  it('projects its heading, seo and all four Why Midwest sections', () => {
    // Fields inlined and named, because typegen only discovers queries written that way
    // and cannot resolve an interpolated fragment — written otherwise it reports "0
    // queries" and the type safety this CMS was chosen for disappears.
    expect(STRATEGY_PAGE_QUERY).toContain('_id == "strategyPage"')
    expect(STRATEGY_PAGE_QUERY).toContain('seo { title, description }')
    expect(STRATEGY_PAGE_QUERY).toContain('heading { eyebrow, title, intro }')
    expect(STRATEGY_PAGE_QUERY).toContain('body')
    expect(STRATEGY_PAGE_QUERY).toContain('pillarsHeading { eyebrow, title, intro }')
    expect(STRATEGY_PAGE_QUERY).toContain('pillars[] { icon, eyebrow, title, body }')
    expect(STRATEGY_PAGE_QUERY).toContain('marketHeading { eyebrow, title, intro }')
    expect(STRATEGY_PAGE_QUERY).toContain('marketBars[] { label, value, highlight }')
    expect(STRATEGY_PAGE_QUERY).toContain('marketUnit')
    expect(STRATEGY_PAGE_QUERY).toContain('marketSource')
  })

  it('throws on a missing heading title rather than rendering a titleless page', () => {
    /*
     * The same guard /portfolio and /insights carry, and it checks `heading.title` rather
     * than `heading`: GROQ projects an all-null heading into a truthy object, which a
     * shallow check waves through as an empty <h1>. Sanity's required() is Studio-side
     * only, so this throw is the real guard.
     */
    expect(source).toMatch(/!copy\?\.heading\?\.title/)
    expect(source).toMatch(/throw new Error/)
  })

  it('renders nothing at all when the body is empty', () => {
    /*
     * The state this page shipped in on 2026-09-08, and the state it returns to whenever
     * an editor empties the field. A `<PortableText>` handed `null` throws, and an
     * unguarded empty section renders a bare rule across the page — neither is acceptable
     * for a page whose sections are all optional.
     */
    expect(source).toMatch(/copy\.body\s*&&/)
  })

  it('gates each section on the leaf it renders, never on the heading object', () => {
    /*
     * GROQ projects an all-null `headingBlock` into a *truthy* object, so
     * `copy.pillarsHeading &&` would render an empty <h2> above a grid with nothing in
     * it — the same trap the `heading.title` guard above exists for, one level down.
     * Both halves are required: a heading with no cards is a promise the page does not
     * keep, and a grid with no heading is one a reader has no frame for.
     */
    expect(source).toMatch(/copy\.pillarsHeading\?\.title\s*&&\s*pillars\.length > 0/)
    expect(source).toMatch(/copy\.marketHeading\?\.title\s*&&\s*bars\.length > 0/)
  })

  it('refuses to render figures with no source behind them', () => {
    /*
     * Spec §9's rule reaching the one place on this site where an editor can publish a
     * fresh statistic to investors in four keystrokes. The schema requires `marketSource`
     * as soon as a bar exists, but Sanity's validation is Studio-side only — the CLI,
     * Vision and any direct API write ignore it — so this is the guard that actually
     * holds. Unattributed figures do not render at all rather than rendering bare.
     */
    expect(source).toMatch(/bars\.length > 0\s*&&\s*copy\.marketSource/)
  })

  it('assigns grounds to the sections that actually rendered', () => {
    /*
     * Every section here is conditional, so a ground hardcoded per section is only correct
     * for the combination that existed when it was written: publishing the chart while the
     * pillars were still empty would put two sections back to back on the same ground, and
     * emptying the prose would open the page on a panelled band directly under the
     * photograph. That is the defect `alternatingTones` was written for on the homepage.
     */
    expect(source).toContain('alternatingTones(sections.length)')
    expect(source).toMatch(/\.filter\(Boolean\)/)
  })

  it('closes with the call to action every page closes with', () => {
    // ctaCoverage.test.ts enumerates the route files and asserts this for all of them, so
    // this is the same claim stated where a reader of this file will see it.
    expect(source).toContain('<CtaBand')
    expect(source).toMatch(/copy=\{settings\?\.ctaBand\}/)
  })

  it('opens on the shared photograph band, like the other six section pages', () => {
    expect([...HERO_PATHS]).toContain('/strategy')
    expect(source).toContain('<PageHero')
  })
})

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
  it('projects its heading, seo and body', () => {
    // Fields inlined and named, because typegen only discovers queries written that way
    // and cannot resolve an interpolated fragment — written otherwise it reports "0
    // queries" and the type safety this CMS was chosen for disappears.
    expect(STRATEGY_PAGE_QUERY).toContain('_id == "strategyPage"')
    expect(STRATEGY_PAGE_QUERY).toContain('seo { title, description }')
    expect(STRATEGY_PAGE_QUERY).toContain('heading { eyebrow, title, intro }')
    expect(STRATEGY_PAGE_QUERY).toContain('body')
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
     * The live state on the day this ships. The Why Midwest argument is copy EM8 owes
     * (§3), so the field is optional and the page is a hero and a call to action until it
     * arrives. A `<PortableText>` handed `null` throws, and an unguarded empty section
     * renders a bare rule across the page — neither is acceptable for the normal state of
     * a shipped page.
     */
    expect(source).toMatch(/copy\.body\s*&&/)
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

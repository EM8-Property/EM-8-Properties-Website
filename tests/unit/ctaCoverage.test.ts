import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'

const siteDir = resolve(__dirname, '../../src/app/(site)')

function pageFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...pageFiles(full))
    else if (entry.name === 'page.tsx') found.push(full)
  }
  return found
}

function routeOf(file: string): string {
  const rel = file.slice(siteDir.length + 1).replace(/\\/g, '/')
  const dir = rel.replace(/\/?page\.tsx$/, '')
  return dir === '' ? '/' : `/${dir}`
}

const routes = pageFiles(siteDir).map((file) => ({ file, route: routeOf(file) }))

/**
 * Every page must offer a way to start a conversation.
 *
 * Five did not: /about, /insights, /insights/[slug], /portfolio and /track-record ran
 * their content and then stopped at the footer disclaimer. Spec §3 closes the narrative
 * with a call to action, and /insights exists to be linked from LinkedIn — an article that
 * ends with nothing to do next wastes the arrival it was written to earn.
 *
 * `/investors` and `/partners` are the two exceptions, and deliberately so: each already
 * leads with a full form. A second, lower-friction email capture underneath would compete
 * with the ask the page is built around.
 */
const HAS_OWN_FORM = ['/investors', '/partners']

describe('every page offers a way to make contact', () => {
  it('covers every route, so the assertions below cannot go vacuous', () => {
    expect(routes.map((r) => r.route).sort()).toEqual([
      '/',
      '/about',
      '/insights',
      '/insights/[slug]',
      '/investors',
      '/partners',
      '/portfolio',
      '/portfolio/[slug]',
      '/track-record',
    ])
  })

  it.each(routes.map((r) => [r.route, r.file]))('%s', (route, file) => {
    const source = stripComments(readFileSync(file, 'utf8'))

    if (HAS_OWN_FORM.includes(route)) {
      expect(source, `${route} should rely on its own form`).toMatch(/<LeadForm/)
      return
    }

    expect(source, `${route} has no call to action`).toMatch(/<CtaBand/)

    // The copy comes from siteSettings, never from a page document. It lived on
    // `homePage` and only the homepage passed it, so all eleven property pages rendered
    // the band with no heading, no intro, and no book-a-call — a bare email box.
    expect(source, `${route} must read the CTA copy from siteSettings`).toMatch(
      /copy=\{settings\?\.ctaBand\}/,
    )
  })

  /**
   * `Band` owns its own ground and measure — that is its documented contract, and
   * `band.test.tsx` asserts it. Nesting it inside a page's own `max-w-[…]` container
   * breaks that three ways at once: the panel and its rules stop short of the viewport so
   * it reads as a floating card, `px-6` applies twice so the CTA heading sits inboard of
   * the page heading above it, and the parent's bottom padding lands below the panel.
   *
   * Three routes shipped exactly that. `/insights/[slug]` was the worst: inside a 720px
   * article the band's `md:grid-cols-2` still fired at a 768px viewport, putting the email
   * capture and the book-a-call block into roughly 296px columns.
   *
   * Nothing else sees this — it builds, it typechecks, it renders, and every other test
   * passes. This is the assertion that catches it.
   */
  it.each(
    routes.filter((r) => !HAS_OWN_FORM.includes(r.route)).map((r) => [r.route, r.file]),
  )('%s renders the band outside any page measure', (route, file) => {
    const source = stripComments(readFileSync(file, 'utf8')).replace(/\r\n/g, '\n')
    const at = source.indexOf('<CtaBand')
    expect(at, `${route} has no CtaBand`).toBeGreaterThan(-1)

    // Every element still open at the point the band is rendered. A `max-w-` on any of
    // them is a measure the band is trapped inside.
    const before = source.slice(0, at)
    const opened: string[] = []
    for (const tag of before.matchAll(/<(\/?)(div|article|section|main)\b([^>]*)>/g)) {
      const closing = tag[1] === '/'
      const attrs = tag[3] ?? ''
      if (closing) opened.pop()
      else if (!attrs.trimEnd().endsWith('/')) opened.push(attrs)
    }

    const measured = opened.filter((attrs) => /max-w-\[/.test(attrs))
    expect(
      measured,
      `${route} nests CtaBand inside a measured container: ${measured.join(' | ')}`,
    ).toEqual([])
  })

  /**
   * /about ends on a panelled section — the board cards — and `CtaBand` is panelled by
   * default. Left alone that puts two grey sections back to back, which is the exact
   * defect PR #9 chased to the wrong component and PR #10 fixed structurally. The
   * homepage passes a computed tone; this page has to be told explicitly.
   */
  it('does not put a panelled CTA directly under /about’s panelled board section', () => {
    const source = stripComments(
      readFileSync(join(siteDir, 'about', 'page.tsx'), 'utf8'),
    )
    expect(source).toMatch(/bg-panel/)
    expect(source, '/about must close on plain ground').toMatch(/tone="ground"/)
  })
})

/**
 * Measure the rendered page on a phone — the acceptance evidence spec §11 asks for.
 *
 * Every real defect in this project has been invisible to `next build`, the unit suite,
 * `tsc`, ESLint and Lighthouse, and showed up only by measuring the rendered page: five
 * pages with no `<h1>`, a mobile nav painted off-screen, an `og:image` that applied to one
 * route, a `quality` prop that did nothing, a nav panel that buried the hero copy on four
 * pages, and a CI failure caused by a font nobody had thought about. This script exists so
 * that measurement is a command rather than a script somebody rewrites every session — the
 * numbers in `docs/superpowers/plans/2026-09-09-*.md` were produced by an ad-hoc copy of it
 * and were nearly lost with the session that made them.
 *
 * Usage:
 *   node scripts/measure-phone.mjs                          # deployed site, fonts loaded
 *   node scripts/measure-phone.mjs --local                  # http://localhost:3000
 *   node scripts/measure-phone.mjs --block-fonts            # the case CI renders in
 *   node scripts/measure-phone.mjs --bands                  # homepage band inventory
 *   node scripts/measure-phone.mjs --images                 # bytes and the real bitmap width
 *   node scripts/measure-phone.mjs --base https://…         # any origin
 *
 * `--block-fonts` is not optional rigour. CI renders with fallback fonts, the wider face
 * makes the header's first row wrap, and the header goes 113px → 153px at 320px. A phone on
 * a slow connection paints fallback fonts first, so a real visitor sees it too. Take every
 * measurement both ways; each band of `HEADER_RESERVATION` is sized by the worse of them.
 */
import { chromium } from '@playwright/test'

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const val = (f, d) => {
  const i = args.indexOf(f)
  return i === -1 ? d : args[i + 1]
}

const BASE = has('--local')
  ? 'http://localhost:3000'
  : val('--base', 'https://em-8-properties-website-production.up.railway.app')
const BLOCK = has('--block-fonts')

/**
 * The review viewport is 390x844 DPR-3 (spec §11). The others are the widths where
 * something actually changes: 320 is where the header's row one wraps in the fallback face,
 * 375x667 is a short phone where `min-h-svh` leaves the hero far less slack than a tall one,
 * and 360/375 sit in the `pt-48` band while 390 is the first width in `pt-36`.
 */
const VIEWPORTS = [
  [390, 844],
  [375, 812],
  [375, 667],
  [360, 844],
  [320, 844],
]

const ROUTES = ['/', '/about', '/portfolio', '/strategy']

const browser = await chromium.launch()

async function context(width, height, dpr = 3) {
  const c = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
    isMobile: true,
    hasTouch: true,
  })
  if (BLOCK) await c.route('**/*.{woff,woff2,ttf,otf}', (r) => r.abort())
  return c
}

// `load` plus a settle, not `networkidle`: the hero carousel keeps fetching crops, so
// networkidle times out on the deployed site rather than resolving.
async function goto(page, route) {
  await page.goto(BASE + route, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
}

function fmt(n, w = 6) {
  return String(n).padStart(w)
}

console.log(`\nBASE ${BASE}   fonts ${BLOCK ? 'BLOCKED (the CI / cold-visitor case)' : 'loaded (the warm case)'}`)

/* ---------------------------------------------------------------- page geometry */

console.log('\n== page length, header, headline, hero slack ==')
console.log('  viewport      route        screens      px   h1  h1 box  header   hero  overlay   slack  clearance')

for (const [w, h] of VIEWPORTS) {
  const c = await context(w, h)
  const page = await c.newPage()
  for (const route of ROUTES) {
    await goto(page, route)
    const m = await page.evaluate(() => {
      const box = (el) => (el ? el.getBoundingClientRect() : null)
      const h1 = document.querySelector('h1')
      const header = document.querySelector('header')
      const overlay = document.querySelector('[data-hero-overlay]')
      const hero = document.querySelector('section[aria-roledescription="carousel"]')
      const eyebrow = document.querySelector('[data-hero-overlay] p')
      const hb = box(header)
      const eb = box(eyebrow)
      const ob = box(overlay)
      const hr = box(hero)
      const h1b = box(h1)
      return {
        scroll: document.documentElement.scrollHeight,
        vh: window.innerHeight,
        h1Font: h1 ? getComputedStyle(h1).fontSize : null,
        h1H: h1b ? Math.round(h1b.height) : null,
        header: hb ? Math.round(hb.height * 10) / 10 : null,
        hero: hr ? Math.round(hr.height) : null,
        overlay: ob ? Math.round(ob.height) : null,
        // What a taller headline or an extra stat row can grow into before the box does.
        slack: hr && ob ? Math.round(hr.height - ob.height) : null,
        // Header bottom to the first line of hero copy. Negative means copy under the bar.
        clearance: hb && eb ? Math.round((eb.y - (hb.y + hb.height)) * 10) / 10 : null,
      }
    })
    console.log(
      `  ${String(`${w}x${h}`).padEnd(10)} ${route.padEnd(12)} ` +
        `${(m.scroll / m.vh).toFixed(2)}  ${fmt(m.scroll)}  ${String(m.h1Font).padStart(4)} ` +
        `${fmt(m.h1H, 6)}  ${fmt(m.header, 6)} ${fmt(m.hero, 6)}  ${fmt(m.overlay, 7)} ${fmt(m.slack, 7)}` +
        `  ${m.clearance === null ? '     n/a' : `${m.clearance >= 0 ? '+' : ''}${m.clearance}`}`,
    )
  }
  await c.close()
}

/* ---------------------------------------------------------------- band inventory */

if (has('--bands')) {
  const c = await context(390, 844)
  const page = await c.newPage()
  await goto(page, '/')
  console.log('\n== homepage band inventory, 390x844 DPR-3 ==')
  const bands = await page.evaluate(() => {
    const main = document.querySelector('main') ?? document.body
    return [...main.children].map((el) => {
      const r = el.getBoundingClientRect()
      const label =
        el.querySelector('h1')?.textContent?.trim() ??
        el.querySelector('h2')?.textContent?.trim() ??
        `(${el.className.slice(0, 34)})`
      return { h: Math.round(r.height), label: label.slice(0, 44) }
    })
  })
  let total = 0
  for (const b of bands) {
    total += b.h
    console.log(`  ${fmt(b.h, 5)}px  ${b.label}`)
  }
  console.log(`  ${fmt(total, 5)}px  total of main's children`)
  await c.close()
}

/* ---------------------------------------------------------------- images */

if (has('--images')) {
  console.log('\n== first-paint images on /, 390x844 ==')
  for (const dpr of [1, 2, 3]) {
    const c = await context(390, 844, dpr)
    const page = await c.newPage()
    let kb = 0
    let n = 0
    page.on('response', (r) => {
      if (/\/_next\/image|cdn\.sanity/.test(r.url())) {
        kb += Number(r.headers()['content-length'] ?? 0) / 1024
        n += 1
      }
    })
    await goto(page, '/')
    await page.waitForTimeout(2000)
    const hero = await page.evaluate(async () => {
      const im = document.querySelector('section[aria-roledescription="carousel"] img')
      if (!im) return null
      try {
        await im.decode()
      } catch {}
      const u = new URL(im.currentSrc)
      const sizesW = Number(u.searchParams.get('w'))
      const r = im.getBoundingClientRect()
      /*
       * `naturalWidth` is NOT the bitmap width when srcset uses `w` descriptors — the
       * browser reports it in CSS pixels, divided by `chosen descriptor ÷ sizes-computed
       * CSS width`. On this page a genuine 1600px asset reads 649 at DPR 3 and 1299 at
       * DPR 1: 1600 ÷ (3840 ÷ 1560) = 649. Reading it alone sends you chasing a 650px
       * image that does not exist; that happened once in this project and produced a wrong
       * conclusion about the hero's sharpness.
       *
       * There is no reliable way to recover the bitmap from the DOM here, so this reports
       * the inputs and lets the reader do the division against the crop cap in
       * HeroCarousel.tsx rather than inventing a number. The true bitmap is
       * min(requested w, crop cap).
       */
      const sizesCssW = Number.parseFloat(im.sizes) || null
      return {
        requestedW: sizesW,
        quality: u.searchParams.get('q'),
        naturalWidthReported: im.naturalWidth,
        sizesAttr: im.sizes,
        // Multiply naturalWidth by this to undo the browser's density correction, IF you
        // know the sizes-computed CSS width. Printed so the division is visible.
        densityHint: sizesCssW ? Math.round((sizesW / sizesCssW) * 100) / 100 : null,
        paintedCssW: Math.round(r.width),
        paintedCssH: Math.round(r.height),
        // object-cover on a box taller than the crop is shaped: painted width is the box
        // height times the crop aspect (1600x900 -> 1.778), not the box width.
        coverPaintedW: Math.round(r.height * (16 / 9)),
        devicePxWanted: Math.round(r.height * (16 / 9) * window.devicePixelRatio),
      }
    })
    console.log(
      `  DPR ${dpr}: ${Math.round(kb)} KB across ${n} requests` +
        (hero
          ? `   hero q=${hero.quality} requested w=${hero.requestedW}` +
            `  painted ${hero.coverPaintedW} CSS px  wants ${hero.devicePxWanted} device px` +
            `  naturalWidth reads ${hero.naturalWidthReported} (density-corrected, not the bitmap)`
          : ''),
    )
    await c.close()
  }
  console.log('\n  The bitmap is min(requested w, crop cap). Read the cap off')
  console.log('  urlForImage(...).width(N) in HeroCarousel.tsx — every srcset entry at or')
  console.log('  above it resolves to the same asset, which is what bounds the image budget.')
}

await browser.close()

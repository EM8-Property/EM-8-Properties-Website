import { test, expect } from '@playwright/test'

/*
 * The headline is CMS copy, so this asserts the shape of the sentence rather than its
 * exact wording.
 *
 * It pinned /choose to live in/i, matching the approved spec, and went red on 2026-09-03
 * when the accent was edited in the Studio to "chose to live in" — confirmed with Hunter
 * as intentional. A test that fails whenever someone rewords their own marketing copy is
 * a test that trains people to ignore it, and what is worth protecting here is that the
 * homepage still leads with the purpose at all: an <h1> about communities and living,
 * rather than an empty one or a fallback.
 */
test('homepage leads with the purpose', async ({ page }) => {
  await page.goto('/')
  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toContainText(/creating communities/i)
  await expect(h1).toContainText(/to live in/i)
})

/*
 * Three tests below need real content in the CMS.
 *
 * They skip — visibly, with a reason — rather than fail when the dataset has no
 * properties or posts. A test that fails for "content not entered yet" is noise, and
 * noise trains people to ignore red; a test that silently passes with no data is worse,
 * because it reports success for something it never checked. Skipping says exactly what
 * happened.
 *
 * These become live checks the moment Task 15's content migration lands. If they are
 * still skipping at cutover, that is itself the finding.
 */

/**
 * The head fields a dynamic route needs, asserted on the rendered document.
 *
 * Both dynamic routes hand-rolled their own Open Graph block once and lost `og:url` and
 * `og:site_name` doing it — the two fields the social graph uses to identify a shared
 * object. They are also the routes that run through the `image: null` seam, so they are
 * the ones most worth checking here rather than only in a unit test.
 */
async function expectShareableHead(page: import('@playwright/test').Page, path: string) {
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
  expect(canonical, `canonical on ${path}`).toBeTruthy()
  expect(new URL(canonical!).pathname, `canonical path on ${path}`).toBe(path)

  const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content')
  expect(ogUrl, `og:url on ${path}`).toBe(canonical)

  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    'content',
    'EM8 Properties',
  )
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  )
}

test('a portfolio card opens its canonical property page', async ({ page }) => {
  await page.goto('/portfolio')
  const cards = page.locator('a[href^="/portfolio/"]')
  test.skip((await cards.count()) === 0, 'no properties published yet — enter content (Task 15)')

  await cards.first().click()
  await expect(page).toHaveURL(/\/portfolio\/[a-z0-9-]+$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expectShareableHead(page, new URL(page.url()).pathname)
})

test('the portfolio filter narrows the grid', async ({ page }) => {
  await page.goto('/portfolio')
  const before = await page.locator('a[href^="/portfolio/"]').count()
  test.skip(before === 0, 'no properties published yet — enter content (Task 15)')

  const firstType = page
    .getByRole('button', { name: /^(Multifamily|Mixed-Use|Townhomes)$/ })
    .first()
  await firstType.click()
  await expect(firstType).toHaveAttribute('aria-pressed', 'true')
  expect(await page.locator('a[href^="/portfolio/"]').count()).toBeLessThanOrEqual(before)
})

test('an insights article resolves and carries share metadata', async ({ page }) => {
  await page.goto('/insights')
  const articles = page.locator('a[href^="/insights/"]')
  test.skip((await articles.count()) === 0, 'no posts published yet — enter content (Task 15)')

  await articles.first().click()
  /*
   * Case-insensitive, deliberately.
   *
   * Property slugs are all lowercase and their own test keeps the stricter pattern.
   * Two articles published on 2026-09-03 carry capitals — NITA-case-for-TOD and
   * EM8-the-Boulevard — and Hunter confirmed he wants them that way, both being
   * acronyms that read wrong lowercased. What this assertion is for is that the feed
   * links to a real article route rather than to a hash, a query string or an absolute
   * URL, and that survives the relaxation.
   */
  await expect(page).toHaveURL(/\/insights\/[A-Za-z0-9-]+$/)
  // og:title is not synthesised from <title> by Next — this asserts it is set explicitly.
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1)
  // metadataBase must resolve the generated share card to an absolute, non-localhost URL.
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
    'content',
    /^https?:\/\/(?!localhost)/,
  )
  await expectShareableHead(page, new URL(page.url()).pathname)
  // An article overrides the site-wide default: it is an article, not a website.
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
})

/*
 * The deleted route stays deleted, and nothing points at it.
 *
 * Replaces `track record links back to canonical property URLs, not its own`, whose page
 * no longer exists. The assertion worth keeping was its second one — that no property is
 * addressable under a second path — and this is that claim in the form it can still take.
 */
test('the deleted track-record route is gone and unadvertised', async ({ page }) => {
  const res = await page.goto('/track-record')
  expect(res?.status(), '/track-record should not resolve').toBe(404)

  await page.goto('/')
  await expect(page.locator('a[href*="track-record"]')).toHaveCount(0)

  const sitemap = await page.goto('/sitemap.xml')
  expect(await sitemap!.text()).not.toContain('track-record')
})

/*
 * The header button renders the CMS record, on a real build against the real dataset.
 *
 * The unit suite proves the component renders whatever it is handed; this proves the
 * chain that hands it to it — schema, GROQ projection, the layout's guard, the prop —
 * survives a production build. Nothing else in the suite covers that: the build succeeds
 * either way, and a projection that silently returned null would render the guard's
 * throw, not a wrong label.
 *
 * Asserted as "not the old literal, and a non-empty label pointing somewhere" rather
 * than as the exact words, because the words are now editable and the point of this
 * change is that changing them needs no code. "Get Started" is worth naming explicitly:
 * that string coming back means the deployed build predates this, which is exactly the
 * question you ask after triggering a Railway deploy.
 *
 * Anchored to `#header-actions`, and the `toHaveCount(1)` below is load-bearing. This
 * canary spent a task grading the wrong element: it used to take `#site-nav a` and `.last()`,
 * which was the CTA until the two-row header moved the CTA out of the nav into its own
 * row-one container — after which the selector resolved to the `Insights` nav link, whose
 * label is non-empty, is not "Get Started" and has an href, so all three assertions below
 * passed against it and the deploy-staleness canary was silently detached from its subject.
 * A count assertion is what turns the next such move into a failure rather than a pass:
 * `#header-actions` holds exactly one internal link, the CMS-driven CTA, because Investor
 * Login is an off-site absolute URL.
 */
test('the header button comes from the CMS, not from a literal', async ({ page }) => {
  await page.goto('/')
  const cta = page.locator('#header-actions a[href^="/"]')
  await expect(
    cta,
    'the header CTA is no longer the one internal link in #header-actions — this canary is grading the wrong element',
  ).toHaveCount(1)

  const label = (await cta.innerText()).trim()
  expect(label.length, 'the header button rendered with no words in it').toBeGreaterThan(0)
  expect(label, 'the header still shows the hardcoded label — is the deploy stale?').not.toMatch(
    /get started/i,
  )

  const href = await cta.getAttribute('href')
  expect(href, 'the header button points nowhere').toBeTruthy()
})

/*
 * Investor Login on a desktop: off-site, and *visible* without a tap.
 *
 * `toBeVisible` is the addition, and it is the assertion that pins `md:flex` on the link
 * and `md:hidden` on the phone-only disclosure button. Those two tokens are the entire
 * reason "the desktop header does not change" is true after the two-row rewrite, and until
 * this line nothing checked them at a real width: `toHaveAttribute` passes against a
 * `display:none` element, and jsdom cannot see a media query at all. Delete `md:flex` and
 * Investor Login vanishes from the desktop header with every other test green.
 *
 * The default project is `devices['Desktop Chrome']` at 1280px, which is above `md`.
 */
test('Investor Login points off-site to Agora', async ({ page }) => {
  await page.goto('/')
  const link = page.getByRole('link', { name: /investor login/i }).first()
  await expect(link, 'Investor Login is not visible on a desktop — is `md:flex` still on it?').toBeVisible()
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noopener/)

  // The other half of the pair. The disclosure button is a phone affordance; on a desktop
  // it must be gone, or two nodes carry the accessible name "Investor Login".
  await expect(
    page.locator('header button[aria-controls="investor-login-link"]'),
    'the phone disclosure button is showing on a desktop — is `md:hidden` still on it?',
  ).toBeHidden()
})

test('Keep in Touch submits and confirms', async ({ page }) => {
  // The request is intercepted rather than allowed through.
  //
  // Letting this hit the real endpoint would write a lead document to the production
  // dataset and fire a real notification email to the team on every CI run — polluting
  // the investor list with test rows and training everyone to ignore the alert that
  // exists to catch actual investors. The server side is covered by unit tests; what
  // matters here is that the browser posts the right payload and shows confirmation.
  let posted: Record<string, unknown> | null = null

  await page.route('**/api/lead', async (route) => {
    posted = JSON.parse(route.request().postData() ?? '{}')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, id: 'e2e-intercepted' }),
    })
  })

  await page.goto('/investors')
  await page.getByLabel('First name').fill('Playwright')
  await page.getByLabel('Email', { exact: true }).fill('e2e@example.test')
  await page.getByLabel(/accredited investor/i).check()
  await page.getByRole('button', { name: /send/i }).click()

  await expect(page.getByText(/thank you/i)).toBeVisible()
  expect(posted).toMatchObject({ source: 'keep-in-touch', email: 'e2e@example.test' })
})

test('a bad URL renders the 404 rather than crashing', async ({ page }) => {
  const res = await page.goto('/portfolio/does-not-exist')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/couldn.t find/i)
})

test('robots and sitemap are served', async ({ request }) => {
  const robots = await request.get('/robots.txt')
  expect(robots.status()).toBe(200)
  expect(await robots.text()).toContain('Sitemap:')

  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.status()).toBe(200)
  expect(await sitemap.text()).toContain('<urlset')
})

test('the revalidate endpoint refuses an unauthenticated purge', async ({ request }) => {
  const res = await request.post('/api/revalidate')
  expect([401, 500]).toContain(res.status())
})

/**
 * The whole Open Graph story for seven of nine routes hangs on one route handler. Unit
 * tests can assert its URL is *named*; only a request can prove it resolves.
 *
 * This is the check that would have caught the first attempt at this feature, where
 * `(site)/opengraph-image.tsx` produced a card for the homepage alone and every other
 * route silently kept shipping without one.
 */
test('the default share card renders', async ({ request }) => {
  const res = await request.get('/share-card')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('image/png')
  expect((await res.body()).byteLength).toBeGreaterThan(1000)
})

test('every content route declares the canonical it should, and a large card', async ({
  page,
  baseURL,
}) => {
  const routes = [
    '/',
    '/about',
    '/insights',
    '/investors',
    '/partners',
    '/portfolio',
  ]

  const origins = new Set<string>()

  for (const route of routes) {
    await page.goto(route)

    // Asserted on the rendered document, not on the source. A canonical pointing at the
    // wrong URL is worse than none — it asks Google to drop the page — and the
    // source-scanning unit test cannot see what Next actually emitted.
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical, `canonical on ${route}`).toBeTruthy()
    const url = new URL(canonical!)

    // The path is what this test can know regardless of where it runs. The *origin* comes
    // from `metadataBase`, which is baked at build time from NEXT_PUBLIC_SITE_URL — so
    // against a local `npm start` with that unset it is the em-8.com fallback, not the
    // localhost the suite is pointed at. Comparing full URLs would fail locally for a
    // reason that is not a defect.
    //
    // `/` canonicalises to the bare origin, which is Next's own normalisation.
    expect(url.pathname, `canonical path on ${route}`).toBe(route === '/' ? '/' : route)
    // https, unless a developer has pointed NEXT_PUBLIC_SITE_URL at a local origin to
    // make local canonicals sane — that is a setup choice, not a defect.
    const localOrigin = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    expect(
      localOrigin ? ['http:', 'https:'] : ['https:'],
      `canonical protocol on ${route}`,
    ).toContain(url.protocol)
    origins.add(url.origin)

    const ogImage = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute('content')
    expect(ogImage, `og:image on ${route}`).toBeTruthy()

    const twitterCard = await page
      .locator('meta[name="twitter:card"]')
      .getAttribute('content')
    expect(twitterCard, `twitter:card on ${route}`).toBe('summary_large_image')
  }

  // Every page must agree on one origin. Two would mean some subset of the site is
  // canonicalising itself onto a different host.
  expect([...origins], 'canonical origins across the site').toHaveLength(1)

  // Against a real deploy the origin must also BE that deploy. This is the assertion that
  // catches the DNS-cutover failure: if NEXT_PUBLIC_SITE_URL is not moved off the Railway
  // host, every page on em-8.com canonicalises to Railway and Google consolidates the
  // site onto the wrong domain. Skipped for localhost, where the two legitimately differ.
  const target = new URL(baseURL!)
  if (target.hostname !== 'localhost' && target.hostname !== '127.0.0.1') {
    expect([...origins][0], 'canonical origin must match the deployed host').toBe(
      target.origin,
    )
  }
})

/*
 * The hero, measured on the rendered page rather than inferred from a class.
 *
 * This is the check that caught the defects this band actually shipped with: a headline
 * sitting *under* the overlaid header at 375px, and — twice — a stale server still serving
 * the previous build while every unit test passed. Neither was visible to the build, tsc,
 * lint or Lighthouse.
 *
 * The band now has two shapes, so the properties split three ways: what holds everywhere,
 * what only the homepage's `screen` does, and what only the other six pages' `band` does.
 */
test('every section page opens on a full-bleed photograph with its own title on it', async ({
  page,
}) => {
  // The homepage is `screen`; the rest are `band`.
  const routes = [
    '/',
    '/about',
    '/insights',
    '/investors',
    '/partners',
    '/portfolio',
  ]

  for (const route of routes) {
    const isScreen = route === '/'
    await page.goto(route)
    const band = page.locator('section[aria-roledescription="carousel"]').first()
    await expect(band, `${route} has no photo band`).toBeVisible()

    const viewportWidth = page.viewportSize()!.width
    const box = (await band.boundingBox())!

    // Edge to edge: it starts at the left edge and spans the viewport. A band nested in
    // the 1200px measure would start ~156px in and stop short on both sides.
    expect(box.x, `${route} band is inset from the edge`).toBeLessThanOrEqual(1)
    expect(box.width, `${route} band is narrower than the viewport`).toBeGreaterThanOrEqual(
      viewportWidth - 1,
    )
    // It reaches the top of the page, which is what the overlaid header requires.
    expect(box.y, `${route} band does not reach the top`).toBeLessThanOrEqual(1)

    const innerHeight = await page.evaluate(() => window.innerHeight)
    if (isScreen) {
      // The homepage fills the screen. Measured in full in its own test below.
      expect(box.height, 'the homepage band is shorter than the screen').toBeGreaterThanOrEqual(
        innerHeight - 1,
      )
    } else {
      /*
       * The other six do NOT, and this is the assertion that pins the revert.
       *
       * All seven filled the screen for a day. On these six that put a page's whole
       * content below the fold — a photograph and a title, and nothing telling the reader
       * there was a portfolio underneath it. The band is 420/500/560px by breakpoint and
       * grows with its copy, so the bound here is loose on purpose: what matters is that
       * something other than the photograph is visible on load.
       */
      expect(box.height, `${route} band fills the screen`).toBeLessThan(innerHeight)
      expect(box.height, `${route} band is thinner than the 420px floor`).toBeGreaterThanOrEqual(
        420,
      )
    }

    // The page's own h1 is inside the band, laid over the photograph.
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1, `${route} has no h1`).toBeVisible()
    const h1Box = (await h1.boundingBox())!
    expect(h1Box.y, `${route} h1 is not on the photograph`).toBeLessThan(box.y + box.height)

    // And it clears the header rather than rendering underneath it. This is the mobile
    // defect: measured at 375px the eyebrow began at y=62 while the header ran to y=68.
    const headerBox = (await page.locator('header').boundingBox())!
    expect(
      h1Box.y,
      `${route} h1 overlaps the header`,
    ).toBeGreaterThanOrEqual(headerBox.y + headerBox.height)

    /*
     * Where the copy starts horizontally is the other half of the variant.
     *
     * The wordmark is the anchor because it is on every page and sits in the same
     * `mx-auto max-w-[1200px] px-6` container as every heading and paragraph in the body,
     * so one comparison covers the whole measure. A class assertion cannot do this job:
     * the overlay could carry the right utilities and still be pushed out of line by the
     * band around it.
     *
     * The six `band` pages line up with it. The homepage deliberately does not — its copy
     * belongs to the photograph, and at a 1280px viewport the measure would move it 24px
     * further in. Both directions are asserted, because "out of line" is the intended
     * state on exactly one page and a defect on the other six.
     */
    const wordmarkBox = (await page.locator('header a').first().boundingBox())!
    if (isScreen) {
      // Hugging the edge of the photograph — 24px, or 40px from the `sm` breakpoint up —
      // rather than sitting on the grid. Asserted as a bound rather than against the
      // wordmark because the sign of that difference flips: the content column is flush at
      // 24px up to a 1200px viewport and only passes 40px above 1232, where
      // (viewport - 1200) / 2 + 24 exceeds the inset. Measured, the two coincide at 40px
      // at 1231-1232.
      //
      // Which means this bound stops discriminating anywhere from 1024px to 1232px: in
      // that window the column is at or below 40px too, and a hero that had been snapped
      // back onto the measure would satisfy it. This loop runs at Playwright's default
      // 1280x720, where the column is at 64px, so it discriminates by 24px. Do not
      // retarget it into that window without changing the assertion.
      expect(
        Math.round(h1Box.x),
        'the homepage h1 has left the edge of the photograph',
      ).toBeLessThanOrEqual(40)
    } else {
      expect(
        Math.round(h1Box.x),
        `${route} h1 is out of line with the content column`,
      ).toBe(Math.round(wordmarkBox.x))
    }
  }
})

test('a band page lines its hero copy up with the section copy below it, at every width', async ({
  page,
}) => {
  // The wordmark is the anchor in the loop above; this is the other end of the same
  // claim, measured against body copy on the page rather than chrome, and at the widths
  // where the column is doing something different: centred with wide gutters, centred
  // with narrow ones, and flush at the phone width.
  //
  // /about rather than / — the homepage is the one page whose copy is deliberately NOT on
  // the measure, and it gets the opposite assertion in the test below.
  for (const width of [1512, 1440, 1280, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/about')

    const x = await page.evaluate(() => {
      const at = (el: Element | null) => (el ? Math.round(el.getBoundingClientRect().x) : null)
      return {
        // The eyebrow when there is one, the intro when there is not — either way the
        // first paragraph of hero copy, and both sit in the same measure.
        firstLine: at(document.querySelector('[data-hero-overlay] p')),
        h1: at(document.querySelector('h1')),
        // The first section heading below the fold, and the footer wordmark at the
        // other end of the page — both inside the content measure.
        h2: at(document.querySelector('main h2')),
        footer: at(document.querySelector('footer p')),
      }
    })

    expect(x.h2, `no section heading found at ${width}px`).not.toBeNull()
    expect(x.h1, `h1 out of line with the section heading at ${width}px`).toBe(x.h2)
    expect(
      x.firstLine,
      `the first line of hero copy is out of line with the section heading at ${width}px`,
    ).toBe(x.h2)
    expect(x.footer, `footer out of line with the hero at ${width}px`).toBe(x.h1)
  }
})

test('the homepage keeps its copy on the photograph, not on the measure', async ({
  page,
}) => {
  /*
   * The explicit ask, and the reason it needs its own test: for a day the homepage copy
   * was on the content measure like the other six, and putting it back is a change that
   * only a measurement can confirm — the classes differ by three utilities and the page
   * looks plausible either way.
   *
   * At 1512px the difference is 140px. Up to a 1200px viewport the measure is flush at
   * 24px while the inset is 40px, so the two swap which is further in and coincide at 40px
   * at 1231-1232; the assertion is written as "not the column" plus a bound on the inset
   * rather than as a direction. The three widths here are all above that crossover, which
   * is what makes the `not.toBe(column)` half meaningful.
   */
  for (const width of [1512, 1440, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')

    const x = await page.evaluate(() => {
      const at = (el: Element | null) => (el ? Math.round(el.getBoundingClientRect().x) : null)
      return {
        h1: at(document.querySelector('h1')),
        firstLine: at(document.querySelector('[data-hero-overlay] p')),
        column: at(document.querySelector('main h2')),
      }
    })

    expect(x.column, `no section heading found at ${width}px`).not.toBeNull()
    expect(x.h1, `the homepage h1 is on the content column at ${width}px`).not.toBe(x.column)
    // 40px is `sm:p-10`, the inset from the edge of the photograph.
    expect(x.h1, `the homepage h1 has left the photograph's edge at ${width}px`).toBe(40)
    expect(x.firstLine, `the eyebrow disagrees with the h1 at ${width}px`).toBe(40)
  }
})

/*
 * The hero clears the overlaid header, on both shapes and at the narrow viewports where
 * it does not.
 *
 * The original defect appeared below ~640px: the copy is bottom-aligned, so it climbs as
 * it wraps, and at 375px the eyebrow began at y=62 while the header ran to y=68.
 *
 * The two shapes are nowhere near each other in how much of the reservation they actually
 * need, which is why this runs on both. Measured clearance, 2026-09-09, against
 * `HEADER_RESERVATION = 'pt-32 md:pt-28'` — the numbers this docblock used to quote were
 * the pre-§5 ones against `pt-24` and read as current:
 *
 *   /        375px   342.3px   — `screen`, all the slack in the world
 *   /about   375px    39.5px
 *   /about   360px    15.0px   — the tightest on the site
 *   /about   320px    15.0px
 *
 * Below 375px the band's overlay has grown past the 420px floor, so the box is exactly as
 * tall as the copy and bottom-alignment leaves no slack at all: the reservation minus the
 * header is the entire margin. Which means the vulnerable shape is `band` at a narrow
 * viewport, and for a day this test covered only the homepage — verified: dropping the
 * reservation still clears the header at 1280px and at 375px, and fails first at 320px on
 * a band page.
 *
 * 15px, not 28px. A reader planning the next header change should budget the real slack:
 * the phone header has fifteen pixels of it, and `src/lib/headerReservation.ts` carries the
 * full table.
 */
for (const [route, width] of [
  ['/', 375],
  ['/about', 320],
] as const) {
  test(`the hero clears the header at ${width}px on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await page.goto(route)

    const headerBox = (await page.locator('header').boundingBox())!
    // The eyebrow is the first line of copy, so it is the one that goes under the header.
    const eyebrow = page.locator('[data-hero-overlay] p').first()
    const eyebrowBox = (await eyebrow.boundingBox())!

    expect(
      eyebrowBox.y,
      `the eyebrow renders under the overlaid header on ${route} at ${width}px`,
    ).toBeGreaterThanOrEqual(headerBox.y + headerBox.height)
  })
}

/*
 * The nav is visible on a phone without a tap.
 *
 * This is the assertion that would have caught what Etamar reported, and nothing in the
 * suite could have: the links were all in the DOM and all one tap away, so every unit test
 * passed while the rendered header showed two items. Asserted on the rendered page at the
 * review viewport for that reason (spec §11).
 */
test('the four nav parents are visible on a phone without a tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const header = page.locator('header')
  const nav = header.locator('#site-nav')
  await expect(nav).toBeVisible()

  // Four children of the nav: two dropdown groups and two plain links. Counted on the nav
  // rather than by label, because the labels are CMS content now and a test that pins
  // wording fails when someone edits their own copy.
  await expect(nav.locator(':scope > *')).toHaveCount(4)

  for (const child of await nav.locator(':scope > *').all()) {
    await expect(child).toBeVisible()
    const box = (await child.boundingBox())!
    expect(box.width, 'a nav item painted at zero width is invisible while "visible"').toBeGreaterThan(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
  }

  // The CTA, which the earlier header painted off the edge of the screen, is still a
  // plain visible link.
  await expect(header.getByRole('link', { name: 'Invest With Us' })).toBeVisible()

  /*
   * Investor Login itself is a second-pass finding, not the first-pass design: row one
   * (wordmark, Investor Login, the CTA) measured 366px of content against 342px of content
   * width at 390px wide, which is `flex-wrap`'s exact third-row case — two flex children
   * that do not fit together move to their own lines, so row one became two rows and the
   * header three instead of two. Per §5's own fallback rule for exactly this shape,
   * Investor Login moved behind a small button rather than staying a plain row-one link; it
   * is reachable one tap away here (and always from the footer). SiteHeader.tsx's docblock
   * has the full measurement.
   */
  const accountToggle = header.getByRole('button', { name: /investor login/i })
  await expect(accountToggle).toBeVisible()
  await accountToggle.click()
  await expect(header.getByRole('link', { name: /investor login/i })).toBeVisible()
})

/*
 * Revealing Investor Login does not change the header's height — so the hero still clears
 * it AFTER the tap, not only before.
 *
 * This test exists because its predecessor performed exactly this gesture and then checked
 * nothing about the consequence, which is worse than no test: it looks like coverage. The
 * disclosed link shipped as an in-flow flex sibling, row one cannot hold wordmark + link +
 * CTA at any phone width (which is the whole reason the disclosure exists), so revealing it
 * wrapped row one and the header grew 42px — 88.5→130.5px at 375px, 113→155px at 320px.
 * The hero reserves a FIXED `pt-32`, so /about's eyebrow went to −2.5px and −27.0px of
 * clearance: the first line of copy rendered under a translucent bar. `npm run build`,
 * `tsc`, the 516 unit tests, ESLint and Lighthouse were all green through it, because the
 * only way to see it is to measure the rendered page in the state a user produces.
 *
 * Asserted as a HEIGHT DELTA as well as a clearance, because those are two different
 * regressions. A clearance-only assertion would go green again if someone raised
 * `HEADER_RESERVATION` to paper over an interactive header height, which costs every mobile
 * page 32px of hero even when the disclosure is closed. The requirement is that the header
 * does not move.
 *
 * 320px and 375px: 320 is the tightest clearance on the site (15px), and 375 is where the
 * nav stops wrapping to two lines, so the two widths cover both header heights.
 */
for (const width of [320, 375] as const) {
  test(`revealing Investor Login does not change the header's height at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 812 })
    await page.goto('/about')

    const header = page.locator('header')
    const eyebrow = page.locator('[data-hero-overlay] p').first()

    const clearance = async () => {
      const h = (await header.boundingBox())!
      const e = (await eyebrow.boundingBox())!
      return { height: h.height, clearance: e.y - (h.y + h.height) }
    }

    const before = await clearance()
    expect(
      before.clearance,
      `the eyebrow is already under the header at ${width}px before any interaction`,
    ).toBeGreaterThan(0)

    const toggle = header.getByRole('button', { name: /investor login/i })
    await expect(toggle).toBeVisible()
    await toggle.click()

    // The tap did what it is for: the link is reachable, not merely present.
    await expect(header.getByRole('link', { name: /investor login/i })).toBeVisible()

    const after = await clearance()
    expect(
      after.height,
      `revealing Investor Login moved the header from ${before.height}px to ${after.height}px at ${width}px — it must be out of flow below md`,
    ).toBeCloseTo(before.height, 1)
    expect(
      after.clearance,
      `the eyebrow renders under the overlaid header at ${width}px once Investor Login is revealed`,
    ).toBeGreaterThan(0)
  })
}

/*
 * Opening a nav panel does not change the header's height either — the same assertion, for
 * the header's other disclosure, after the same defect.
 *
 * The panel shipped as an in-flow `w-full` block below `md`, inside a group that is itself
 * a flex item of the wrapping `<nav>`, so revealing it made the header taller: measured on
 * a production build, 88.5→186px at 390px and 113→186px at 320px, which against the FIXED
 * `HEADER_RESERVATION` put /about's eyebrow 58.0px under a translucent bar (from +39.5px
 * and +15.0px) and /insights' 24.3px under it. Four of the seven section pages.
 *
 * Nothing in the suite reported it, and the panel HAD an E2E test: it ran on `/`, the one
 * route with 332px of hero slack, and asserted `aria-expanded`, the URL and a link count —
 * no geometry at all. A test that performs the gesture and checks nothing about its
 * consequence is worse than no test, because it looks like coverage. That is the second
 * time this exact hole appeared in this header (see the Investor Login tests above), so
 * this one runs where it can fail: a band page, at the two widths that bracket the nav's
 * own wrap, asserting the same two things as its sibling — the height DELTA, because a
 * clearance-only assertion goes green again if someone pads `HEADER_RESERVATION` to cover
 * an interactive header height, and the clearance, because that is what a reader sees.
 *
 * Both panels, because they are two instances with different anchors and different
 * children (`aboutUs` renders two of its three here, `strategy` two).
 *
 * The third assertion is the one that pins WHICH box the panel is absolute against. Off the
 * header's bottom edge it covers the top of the photograph, which nothing depends on;
 * anchored to its own group it would hang from a line-one nav label and land on top of
 * `Insights`, which wraps to line two below 375px — the mistake the Investor Login popover
 * made first, in the task whose whole purpose is that the nav labels are visible.
 */
for (const width of [320, 390] as const) {
  for (const key of ['aboutUs', 'strategy'] as const) {
    test(`opening the ${key} nav panel does not change the header's height at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 812 })
      await page.goto('/about')

      const header = page.locator('header')
      const eyebrow = page.locator('[data-hero-overlay] p').first()

      const measure = async () => {
        const h = (await header.boundingBox())!
        const e = (await eyebrow.boundingBox())!
        return { height: h.height, clearance: e.y - (h.y + h.height) }
      }

      const before = await measure()
      expect(
        before.clearance,
        `the eyebrow is already under the header at ${width}px before any interaction`,
      ).toBeGreaterThan(0)

      const toggle = page.locator(`#site-nav button[aria-controls="nav-panel-${key}"]`)
      await expect(toggle).toBeVisible()
      await toggle.click()

      // The gesture did what it is for, so the measurements below are of an OPEN panel.
      const panel = page.locator(`#nav-panel-${key}`)
      await expect(panel).toBeVisible()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')

      const after = await measure()
      expect(
        after.height,
        `opening the ${key} panel moved the header from ${before.height}px to ${after.height}px at ${width}px — it must be out of flow below md`,
      ).toBeCloseTo(before.height, 1)
      expect(
        after.clearance,
        `the eyebrow renders under the overlaid header at ${width}px once the ${key} panel is open`,
      ).toBeGreaterThan(0)

      // And it hangs below the header rather than over it: no header item is covered.
      const panelBox = (await panel.boundingBox())!
      const items = [
        ...(await page.locator('#site-nav > *').all()),
        page.locator('#header-actions a[href^="/"]'),
        page.locator('header a[href="/"]').first(),
      ]
      for (const item of items) {
        const box = (await item.boundingBox())!
        const dx =
          Math.min(panelBox.x + panelBox.width, box.x + box.width) - Math.max(panelBox.x, box.x)
        const dy =
          Math.min(panelBox.y + panelBox.height, box.y + box.height) -
          Math.max(panelBox.y, box.y)
        expect(
          dx > 0 && dy > 0,
          `the open ${key} panel covers "${(await item.innerText()).trim().split('\n')[0]}" at ${width}px, by ${dx.toFixed(1)}x${dy.toFixed(1)}px`,
        ).toBe(false)
      }
    })
  }
}

/*
 * The panel opens on a tap and does not navigate on that tap.
 *
 * §5's requirement for a touch device, and the case a hover-only panel fails silently:
 * on a phone there is no hover, so a CSS-driven panel simply never opens and its children
 * are reachable only from the footer.
 *
 * `playwright.config.ts` does not set `hasTouch` on the chromium project (it only spreads
 * `devices['Desktop Chrome']`), so `tap()` needs it turned on here or it throws. Declared
 * with `test.use` rather than switched to a dispatchEvent+click fallback, since the point
 * of this test is specifically a touch tap.
 */
test.describe(() => {
  test.use({ hasTouch: true })

  test('a nav panel opens on tap without leaving the page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const toggle = page.locator('#site-nav button[aria-controls="nav-panel-aboutUs"]')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.tap()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page).toHaveURL(/\/$/)
    // 2, not 3: `whyEm8` has no body in the dataset, so Task 8's nav gate hides it and
    // only About EM8 and Our Team remain in the panel.
    await expect(page.locator('#nav-panel-aboutUs a')).toHaveCount(2)
  })
})

/*
 * The homepage hero fills the first screen, measured on the rendered page.
 *
 * A class assertion cannot see this: `min-h-svh` is one Tailwind utility away from
 * `min-h-[100vh]`, which looks identical in a unit test and identical on a desktop
 * browser, and differs only on a phone with an address bar. It also cannot see a parent
 * that constrains the band, or a scrollbar-versus-viewport discrepancy.
 *
 * Homepage only. The other six pages are asserted the other way in the loop above, and
 * `/about` carries the band's own version of this below.
 */
for (const viewport of [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 375, height: 812 },
]) {
  test(`the homepage hero fills the first screen on ${viewport.name}, and the page scrolls`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')

    // The viewport as the page sees it, which is what svh resolves against — not the
    // number passed above, which does not account for a scrollbar.
    const innerHeight = await page.evaluate(() => window.innerHeight)
    const band = page.locator('section[aria-roledescription="carousel"]').first()
    const box = (await band.boundingBox())!

    expect(box.height, 'the hero is shorter than the screen').toBeGreaterThanOrEqual(
      innerHeight - 1,
    )
    // And it is the screen rather than a multiple of it. min-h means CMS copy can push it
    // past the fold, but only by the amount that copy actually needs; a stray `h-[200vh]`
    // or a doubled unit would sail through the assertion above.
    expect(box.height, 'the hero is taller than the screen needs').toBeLessThan(
      innerHeight * 1.5,
    )

    // Nothing but the hero is on the first screen. This is the point of the change: the
    // stat band used to sit under the fold on a laptop and above it on a desktop monitor.
    const nextSection = page.locator('section[aria-roledescription="carousel"] ~ *').first()
    const nextBox = (await nextSection.boundingBox())!
    expect(nextBox.y, 'the section after the hero is visible on load').toBeGreaterThanOrEqual(
      innerHeight - 1,
    )

    // "So you have to scroll down" — there has to be somewhere to scroll to.
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    expect(scrollHeight, 'the page does not scroll').toBeGreaterThan(innerHeight)
  })

  test(`a band page shows its content below the photograph on ${viewport.name}`, async ({
    page,
  }) => {
    /*
     * The inverse, and the reason the six pages were reverted: at full screen a reader
     * landing on /about saw a photograph and a title and nothing else, with the purpose,
     * the four factors and the team all below the fold.
     *
     * Asserted as "something else is visible" rather than against a pixel height, because
     * the band grows with its CMS copy: /about renders exactly 420px at 375px wide, 423px
     * at 360px and 456px at 320px.
     */
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/about')

    const innerHeight = await page.evaluate(() => window.innerHeight)
    const band = page.locator('section[aria-roledescription="carousel"]').first()
    const box = (await band.boundingBox())!

    expect(box.height, 'the band fills the screen').toBeLessThan(innerHeight)

    const nextSection = page.locator('section[aria-roledescription="carousel"] ~ *').first()
    const nextBox = (await nextSection.boundingBox())!
    expect(nextBox.y, 'nothing below the band is visible on load').toBeLessThan(innerHeight)
  })
}

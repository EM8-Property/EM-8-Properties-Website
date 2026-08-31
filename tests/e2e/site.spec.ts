import { test, expect } from '@playwright/test'

test('homepage leads with the purpose', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/choose to live in/i)
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
  await expect(page).toHaveURL(/\/insights\/[a-z0-9-]+$/)
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

test('track record links back to canonical property URLs, not its own', async ({ page }) => {
  await page.goto('/track-record')
  const links = page.locator('a[href*="/portfolio/"]')
  if ((await links.count()) > 0) {
    await expect(links.first()).toHaveAttribute('href', /^\/portfolio\/[a-z0-9-]+$/)
  }
  // No property may be addressable under /track-record/.
  await expect(page.locator('a[href^="/track-record/"]')).toHaveCount(0)
})

test('Investor Login points off-site to Agora', async ({ page }) => {
  await page.goto('/')
  const link = page.getByRole('link', { name: /investor login/i }).first()
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noopener/)
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
    '/track-record',
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

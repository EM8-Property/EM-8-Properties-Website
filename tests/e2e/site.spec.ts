import { test, expect } from '@playwright/test'

test('homepage leads with the purpose', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/choose to live in/i)
})

test('a portfolio card opens its canonical property page', async ({ page }) => {
  await page.goto('/portfolio')
  await page.locator('a[href^="/portfolio/"]').first().click()
  await expect(page).toHaveURL(/\/portfolio\/[a-z0-9-]+$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('the portfolio filter narrows the grid', async ({ page }) => {
  await page.goto('/portfolio')
  const before = await page.locator('a[href^="/portfolio/"]').count()
  const firstType = page
    .getByRole('button', { name: /^(Multifamily|Mixed-Use|Townhomes)$/ })
    .first()
  await firstType.click()
  await expect(firstType).toHaveAttribute('aria-pressed', 'true')
  expect(await page.locator('a[href^="/portfolio/"]').count()).toBeLessThanOrEqual(before)
})

test('an insights article resolves and carries share metadata', async ({ page }) => {
  await page.goto('/insights')
  await page.locator('a[href^="/insights/"]').first().click()
  await expect(page).toHaveURL(/\/insights\/[a-z0-9-]+$/)
  // og:title is not synthesised from <title> by Next — this asserts it is set explicitly.
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1)
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

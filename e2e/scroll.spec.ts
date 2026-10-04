import { test, expect, type Page } from '@playwright/test'
import { freshDefaults } from '../src/menu'
import { calculateTotals, priceLine } from '../src/money'
import type { Locator } from '@playwright/test'

async function scrollContent(page: Page, content: Locator) {
  const metrics = await content.evaluate((e) => ({
    height: e.clientHeight,
    total: e.scrollHeight,
    top: e.scrollTop,
  }))
  if (metrics.total <= metrics.height) return // Content fits; no artificial overflow.
  const box = await content.boundingBox()
  if (!box) throw new Error('Scrolling content is not visible')
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(100, box.height / 2))
  await page.mouse.wheel(0, 400)
  await expect.poll(() => content.evaluate((e) => e.scrollTop)).toBeGreaterThan(metrics.top)
}

async function inspectSheet(page: Page, name: string) {
  const sheet = page.getByRole('dialog', { name, exact: true })
  // Measure the fixed header after the existing transform entrance finishes.
  await sheet.evaluate(async (e) => Promise.all(e.getAnimations().map((a) => a.finished)))
  const header = sheet.locator('.sheet-header')
  const top = (await header.boundingBox())!.y
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await scrollContent(page, sheet.locator('.sheet-content'))
  expect(Math.abs((await header.boundingBox())!.y - top)).toBeLessThan(1)
  await sheet.getByRole('button', { name: `Close ${name}`, exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
}

async function addBurrito(page: Page) {
  await page.getByRole('button', { name: /^Regular Burrito \$/ }).click()
  await page.getByRole('button', { name: 'Grilled Chicken', exact: true }).click()
  await page.getByRole('button', { name: /Add to order/ }).click()
  await page.getByRole('button', { name: /VIEW ORDER/ }).click()
}

async function unlocked(page: Page) {
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
  await page.getByRole('button', { name: 'Sides', exact: true }).click()
  await page.mouse.move(100, 300)
  const before = await page.evaluate(() => scrollY)
  await page.mouse.wheel(0, 500)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before)
}

test('custom cash closes overlapping sheets and releases document scrolling', async ({ page }) => {
  await page.goto('./')
  await addBurrito(page)
  await page.getByRole('button', { name: 'Other', exact: true }).click()
  await page.getByRole('textbox', { name: 'Custom cash amount' }).fill('20.00')
  await page.getByRole('button', { name: /Calculate change/ }).click()
  await page.getByRole('button', { name: 'DONE / NEXT ORDER' }).click()
  await unlocked(page)
})

test('confirmed cart clear closes overlapping sheets and releases document scrolling', async ({
  page,
}) => {
  await page.goto('./')
  await addBurrito(page)
  await page.getByRole('button', { name: 'Clear order', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'Clear this order?' })
    .getByRole('button', { name: 'Clear order', exact: true })
    .click()
  await unlocked(page)
})

test('closing a nested sheet keeps its parent locked until the last sheet closes', async ({
  page,
}) => {
  await page.goto('./')
  await addBurrito(page)
  await page.getByRole('button', { name: 'Other', exact: true }).click()
  await page.getByRole('button', { name: 'Close Cash received', exact: true }).click()
  await expect(page.locator('dialog[open]')).toHaveCount(1)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.getByRole('button', { name: 'Clear order', exact: true }).click()
  await page.getByRole('button', { name: 'Keep order', exact: true }).click()
  await expect(page.locator('dialog[open]')).toHaveCount(1)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.getByRole('button', { name: 'Close Your order', exact: true }).click()
  await unlocked(page)
})

for (const width of [320, 375, 390, 430, 768, 820, 1024, 1180]) {
  test(`native scrolling, clean header and repeated sheet lifecycle at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1180 ? 650 : 844 })
    const config = freshDefaults()
    const cart = config.products
      .filter((p) => p.enabled && p.category === 'Sides')
      .map((p) => ({
        ...priceLine(p, undefined, [], config)!,
        id: p.id,
        productId: p.id,
        name: p.name,
        taxClass: p.taxClass,
        quantity: 1,
      }))
    const totals = calculateTotals(cart, config.taxes)
    const history = Array.from({ length: 20 }, (_, i) => ({
      id: `history-${i}`,
      timestamp: new Date(Date.UTC(2026, 9, 3, 12, i)).toISOString(),
      lines: cart,
      totals,
      paymentMethod: 'E_TRANSFER',
      tendered: totals.exact,
      change: 0,
      breakdown: [],
    }))
    await page.addInitScript(
      (state) => localStorage.setItem('mucho-cash-helper:v1', JSON.stringify(state)),
      { version: 1, config, cart, history },
    )
    await page.goto('./')
    await expect(page.getByText('PRINCE GEORGE, BC', { exact: true })).toHaveCount(0)
    await expect(page.locator('.location-line')).toHaveCount(0)
    const headerBottom = (await page.locator('.app-header').boundingBox())!
    const navBox = (await page.getByRole('navigation', { name: 'Menu categories' }).boundingBox())!
    expect(navBox.y - (headerBottom.y + headerBottom.height)).toBeLessThanOrEqual(1)
    await expect(page.locator('.cart-dock')).toBeVisible()
    await page.screenshot({ path: `test-results/clean-header-${width}.png` })
    if (width < 768) {
      await page.mouse.move(navBox.x + navBox.width / 2, navBox.y + navBox.height / 2)
      await page.mouse.wheel(500, 0)
      await expect
        .poll(() => page.locator('.category-nav').evaluate((e) => e.scrollLeft))
        .toBeGreaterThan(0)
    }
    await page.getByRole('button', { name: 'Sides', exact: true }).click()
    await page.mouse.move(100, 300)
    await page.mouse.wheel(0, 500)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
    await page.getByRole('button', { name: /VIEW ORDER/ }).click()
    await inspectSheet(page, 'Your order')
    await page.getByRole('button', { name: 'Menu & Prices', exact: true }).click()
    await inspectSheet(page, 'Menu & Prices')
    await page.getByRole('button', { name: 'Order history', exact: true }).click()
    await inspectSheet(page, 'Recent orders')
    if (width < 768) await page.getByRole('button', { name: 'Burritos', exact: true }).click()
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /^Regular Burrito \$/ }).click()
      await inspectSheet(page, 'Regular Burrito')
    }
    await page.getByRole('button', { name: /VIEW ORDER/ }).click()
    await page.getByRole('button', { name: /PAID WITH E-TRANSFER/ }).click()
    await unlocked(page)
    await page.screenshot({ path: `test-results/clean-register-${width}.png`, fullPage: true })
  })
}

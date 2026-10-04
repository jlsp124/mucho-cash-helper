import { test, expect } from '@playwright/test'
import { defaultsV2 } from '../src/defaults-v2'
import { freshDefaults } from '../src/menu'
import { verified } from '../src/model'
import { offlineTestServer } from './offline-server'

for (const [cents, exact, cash] of [
  [1431, '$15.03', '$15.05'],
  [1784, '$18.73', '$18.75'],
] as const) {
  for (const method of ['CASH', 'E_TRANSFER'] as const) {
    test(`${method} keeps ${exact} electronic and ${cash} cash separate`, async ({ page }) => {
      const config = freshDefaults()
      config.products.find((p) => p.id === 'kids-meal')!.price = verified(cents)
      await page.addInitScript(
        (config) =>
          !localStorage.getItem('mucho-cash-helper:v1') &&
          localStorage.setItem(
            'mucho-cash-helper:v1',
            JSON.stringify({ version: 1, config, cart: [], history: [] }),
          ),
        config,
      )
      await page.goto('./')
      await page.getByRole('button', { name: 'More', exact: true }).click()
      await page.getByRole('button', { name: /^Kids Meal \$/ }).click()
      await page.getByRole('button', { name: /VIEW ORDER/ }).click()
      await expect(page.locator('.electronic-total')).toContainText(exact)
      await expect(page.locator('.cash-total')).toContainText(cash)
      if (method === 'E_TRANSFER') {
        await page.getByRole('button', { name: /PAID WITH E-TRANSFER/ }).click()
        await expect(page.locator('dialog[open]')).toHaveCount(0)
        await expect(page.locator('.change-amount')).toHaveCount(0)
      } else {
        await page.getByRole('button', { name: '$20', exact: true }).click()
        await expect(page.locator('.change-amount')).toContainText(cash)
        await page.getByRole('button', { name: 'DONE / NEXT ORDER' }).click()
      }
      await expect(page.locator('.cart-bar')).toContainText('0 items')
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('mucho-cash-helper:v1')!),
      )
      expect(saved.history[0].paymentMethod).toBe(method)
      expect(saved.history[0].tendered).toBe(
        method === 'CASH' ? 2000 : Number(exact.slice(1)) * 100,
      )
      if (method === 'E_TRANSFER') {
        expect(saved.history[0].change).toBe(0)
        expect(saved.history[0].breakdown).toEqual([])
      }
      await page.reload()
      await page.getByRole('button', { name: 'Order history', exact: true }).click()
      await expect(page.locator('.history-row')).toContainText(
        method === 'CASH' ? 'Cash' : 'E-transfer',
      )
      await page.locator('.history-row').click()
      const receipt = page.getByRole('dialog', { name: 'Completed order' })
      await expect(receipt).toContainText(method === 'CASH' ? cash : exact)
      if (method === 'E_TRANSFER') {
        await expect(receipt).not.toContainText('Cash rounding')
        await expect(receipt.locator('.cash-total')).toHaveCount(0)
        await expect(receipt.locator('.history-denom')).toHaveCount(0)
      }
    })
  }
}

test('Combo-Up is a single editable order item with one included can, PST and deposit', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByRole('button', { name: /^Regular Burrito \$/ }).click()
  await page.getByRole('button', { name: 'Grilled Chicken', exact: true }).click()
  const combos = page.getByRole('region', { name: 'Combo-Up' })
  await combos.getByRole('button', { name: /Chips & Salsa/ }).click()
  await expect(page.locator('.builder-price')).toHaveText('$16.90')
  await combos.getByRole('button', { name: /Loaded Nachos/ }).click()
  await expect(page.locator('.builder-price')).toHaveText('$19.40')
  await combos.getByRole('button', { name: /Chips & Salsa/ }).click()
  await page.getByRole('button', { name: /Add to order/ }).click()
  await page.getByRole('button', { name: /VIEW ORDER/ }).click()
  await expect(page.locator('.receipt-line')).toHaveCount(1)
  await expect(page.locator('.receipt-lines')).toContainText('Pop Can included')
  await expect(page.locator('.cash-total')).toContainText('$18.00')
  await expect(page.locator('.electronic-total')).toContainText('$18.01')
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page
    .getByRole('region', { name: 'Combo-Up' })
    .getByRole('button', { name: /Mercado Fries/ })
    .click()
  await page.getByRole('button', { name: /Update item/ }).click()
  await expect(page.locator('.receipt-lines')).toContainText('Mercado Fries Combo-Up')
  await expect(page.locator('.receipt-lines')).not.toContainText('Chips & Salsa')
})

test('guac switches from paid to included without a warning or extra charge', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /^Regular Burrito \$/ }).click()
  await page.getByRole('button', { name: 'Grilled Chicken', exact: true }).click()
  await page.getByRole('button', { name: /Guacamole \+/ }).click()
  await expect(page.locator('.builder-price')).toHaveText('$14.95')
  await page.getByRole('button', { name: 'Fajita Veggies', exact: true }).click()
  await expect(page.getByRole('button', { name: /Guacamole Included/ })).toBeDisabled()
  await expect(page.locator('.builder-price')).toHaveText('$12.45')
  await page.getByRole('button', { name: /Add to order/ }).click()
  await page.getByRole('button', { name: /^MUCHO Burrito \$/ }).click()
  await page.getByRole('button', { name: 'Grilled Chicken', exact: true }).click()
  await expect(page.getByRole('button', { name: /Guacamole Included/ })).toBeDisabled()
  await expect(page.locator('.builder-price')).toHaveText('$15.75')
})

test('fresh food + juice has GST, one deposit and no PST', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /^Regular Burrito \$/ }).click()
  await page.getByRole('button', { name: 'Grilled Chicken', exact: true }).click()
  await page.getByRole('button', { name: /Add to order/ }).click()
  await page.getByRole('button', { name: 'Drinks', exact: true }).click()
  await expect(page.locator('.product-card:visible')).toHaveCount(6)
  await expect(page.getByRole('main')).not.toContainText(/Pepsi|Diet|Ginger|4 Canned|4 Bottled/)
  await page.getByRole('button', { name: /^Juice Bottle \$/ }).click()
  await page.getByRole('button', { name: /VIEW ORDER/ }).click()
  await expect(page.locator('.electronic-total')).toContainText('$17.11')
  await expect(page.locator('.cash-total')).toContainText('$17.10')
  const totals = await page.evaluate(
    () => JSON.parse(localStorage.getItem('mucho-cash-helper:v1')!).cart,
  )
  expect(totals[1].taxClass).toBe('NON_SODA_DRINK')
})

test('currently deployed v2 upgrades physical defaults and preserves intentional store edits', async ({
  page,
}) => {
  const config = structuredClone(defaultsV2)
  config.products.find((p) => p.id === 'small-burrito')!.price = verified(1110)
  config.products.find((p) => p.id === 'taco-trio')!.proteinOverrides.steak.price = verified(250)
  await page.addInitScript((config) => {
    if (!localStorage.getItem('mucho-cash-helper:v1'))
      localStorage.setItem(
        'mucho-cash-helper:v1',
        JSON.stringify({ version: 1, config, cart: [], history: [] }),
      )
  }, config)
  await page.goto('./')
  await expect(page.getByRole('button', { name: /^Small Burrito \$/ })).toContainText('$11.10')
  await expect(page.getByRole('button', { name: /^Regular Burrito \$/ })).toContainText('$12.45')
  await page.getByRole('button', { name: 'Tacos', exact: true }).click()
  await page.getByRole('button', { name: /^Taco Trio \$/ }).click()
  await page.getByRole('button', { name: /^Beef Barbacoa/ }).click()
  await expect(page.locator('.builder-price')).toHaveText('$14.45')
  await page.getByRole('button', { name: /^Steak/ }).click()
  await expect(page.locator('.builder-price')).toHaveText('$14.95')
  await page.getByRole('button', { name: 'Close Taco Trio' }).click()
  await page.reload()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mucho-cash-helper:v1')!))
  expect(saved.config.defaultsVersion).toBe(3)
  expect(
    saved.config.products.find((p: { id: string }) => p.id === 'small-burrito').price.cents,
  ).toBe(1110)
})

for (const width of [320, 375, 390, 430, 767, 768, 820, 1024, 1180, 1440]) {
  test(`responsive menu uses ${width >= 768 ? 'all four entree sections' : 'phone categories'} at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 })
    await page.goto('./')
    for (const name of ['Burritos', 'Bowls / Salads', 'Tacos', 'Quesadilla']) {
      const section = page.getByRole('region', { name, exact: true })
      if (width >= 768 || name === 'Burritos') await expect(section).toBeVisible()
      else await expect(section).toBeHidden()
    }
    await expect(page.getByText(/^(Offline Ready|Offline|Online)$/i)).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/physical-menu-${width}.png`, fullPage: true })
  })
}

test('offline price editing, reload and e-transfer completion work without a status badge', async ({
  page,
  context,
  browserName,
}) => {
  const origin = browserName === 'webkit' ? await offlineTestServer() : null
  try {
    await page.goto(origin?.url ?? './')
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller)
        await new Promise<void>((resolve) =>
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
            once: true,
          }),
        )
    })
    if (origin) await origin.close()
    else await context.setOffline(true)
    await page.reload()
    await page.getByRole('button', { name: 'Menu & Prices', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Regular Burrito \$/ })
      .click()
    await page.getByRole('textbox', { name: 'Base price', exact: true }).fill('12.00')
    await page.getByRole('button', { name: 'Save product', exact: true }).click()
    await page.getByRole('button', { name: 'Close Menu & Prices' }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: /^Regular Burrito \$/ })).toContainText('$12.00')
    await page.getByRole('button', { name: /^Regular Burrito \$/ }).click()
    await page.getByRole('button', { name: 'Grilled Chicken', exact: true }).click()
    await page.getByRole('button', { name: /Add to order/ }).click()
    await page.getByRole('button', { name: /VIEW ORDER/ }).click()
    await page.getByRole('button', { name: /PAID WITH E-TRANSFER/ }).click()
    await page.reload()
    await expect(page.getByText(/^(Offline Ready|Offline|Online)$/i)).toHaveCount(0)
    await page.getByRole('button', { name: 'Order history', exact: true }).click()
    await expect(page.locator('.history-row')).toContainText('E-transfer')
    await expect(page.locator('.history-row')).toContainText('$12.60')
  } finally {
    if (origin) await origin.close()
  }
})

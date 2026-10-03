import { test, expect, type Page } from '@playwright/test'
import { legacyDefaults } from '../src/legacy-defaults'
import { verified } from '../src/model'

async function item(page: Page, category: string, name: string, protein?: string, extra?: string) {
  await page.getByRole('button', { name: category, exact: true }).click()
  await page
    .locator('.product-card')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .click()
  if (protein)
    await page
      .getByRole('dialog')
      .getByRole('button', { name: new RegExp(`^${protein}(?: |$)`) })
      .click()
  if (extra)
    await page
      .getByRole('dialog')
      .getByRole('button', { name: new RegExp(`^${extra} `) })
      .click()
}
async function add(page: Page) {
  await expect(page.getByRole('dialog').getByRole('button', { name: /Add to order/ })).toBeEnabled()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Add to order/ })
    .click()
}

for (const [category, name, protein, extra, price, cash] of [
  ['Burritos', 'Regular Burrito', 'Grilled Chicken', '', '$15.45', '$16.20'],
  ['Burritos', 'Regular Burrito', 'Beef Barbacoa', '', '$18.40', '$19.30'],
  ['Burritos', 'Regular Burrito', 'Steak', 'Guacamole', '$21.40', '$22.45'],
  ['Bowls / Salads', 'Bowl', 'Grilled Chicken', '', '$16.75', '$17.60'],
  ['Tacos', 'Taco Solo', 'Grilled Chicken', '', '$5.45', '$5.70'],
  ['Tacos', 'Taco Solo', 'Beef Barbacoa', '', '$7.45', '$7.80'],
  ['Tacos', 'Taco Trio', 'Steak', '', '$21.35', '$22.40'],
  ['Quesadilla', 'Quesadilla', 'Grilled Chicken', '', '$17.30', '$18.15'],
  ['Quesadilla', 'Quesadilla', 'Veggies', '', '$13.55', '$14.25'],
]) {
  test(`shipped defaults: ${name} + ${protein} ${extra}`, async ({ page }) => {
    await page.goto('./')
    await item(page, category, name, protein, extra)
    await expect(page.locator('.builder-price')).toHaveText(price)
    await expect(page.getByRole('dialog')).not.toContainText(
      /verify|verification|seed|before relying|store register|\+\$0\.00/i,
    )
    await expect(page.locator('.resolve-price')).toHaveCount(0)
    await add(page)
    await page.getByRole('button', { name: /VIEW ORDER/ }).click()
    await expect(page.locator('.cash-total')).toContainText(cash)
    await page.getByRole('button', { name: '$50', exact: true }).click()
    await expect(page.locator('.change-amount h3')).toHaveText(
      `$${(50 - Number(cash.slice(1))).toFixed(2)}`,
    )
    await page.getByRole('button', { name: 'DONE / NEXT ORDER' }).click()
    await expect(page.locator('.cart-bar')).toContainText('0 items')
  })
}

test('fresh defaults: multiple items, soda, cash, persisted history and offline reload', async ({
  page,
  context,
}) => {
  await page.goto('./')
  await item(page, 'Burritos', 'Regular Burrito', 'Grilled Chicken')
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Grilled Chicken', exact: true }),
  ).toBeVisible()
  await add(page)
  await item(page, 'Bowls / Salads', 'Bowl', 'Grilled Chicken')
  await add(page)
  await item(page, 'Drinks', 'Canned Pepsi') // Complete default deposit: immediate add.
  await page.reload()
  await expect(page.locator('.cart-bar')).toContainText('3 items')
  await expect(page.getByText('Offline ready', { exact: true })).toBeVisible({ timeout: 15000 })
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      )
  })
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: /VIEW ORDER/ }).click()
  await expect(page.locator('.cash-total')).toContainText('$37.55')
  await expect(page.locator('.receipt-totals')).toContainText('$0.10')
  await page.getByRole('button', { name: '$50', exact: true }).click()
  await expect(page.locator('.change-amount h3')).toHaveText('$12.45')
  await expect(page.locator('.denomination')).toHaveText(['$10× 1', '$2× 1', '25¢× 1', '10¢× 2'])
  await page.getByRole('button', { name: 'DONE / NEXT ORDER' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Order history', exact: true }).click()
  await expect(page.locator('.history-row')).toHaveCount(1)
  await page.locator('.history-row').click()
  await expect(page.getByRole('dialog', { name: 'Completed order' })).toContainText('$37.55')
})

test('product pricing mode changes preserve its effective protein price', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Menu & Prices', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Quesadilla \$/ })
    .click()
  await page.getByText('Protein prices for this product / size', { exact: true }).click()
  await page.getByRole('combobox', { name: 'Grilled Chicken pricing mode' }).selectOption('total')
  await expect(
    page.getByRole('textbox', { name: 'Grilled Chicken full price', exact: true }),
  ).toHaveValue('17.30')
  await page
    .getByRole('combobox', { name: 'Grilled Chicken pricing mode' })
    .selectOption('adjustment')
  await expect(
    page.getByRole('textbox', { name: 'Grilled Chicken upcharge', exact: true }),
  ).toHaveValue('3.75')
  await page.getByRole('button', { name: 'Save product', exact: true }).click()
  await page.getByRole('button', { name: 'Close Menu & Prices' }).click()
  await page.getByRole('button', { name: 'Quesadilla', exact: true }).click()
  await page.getByRole('button', { name: /^Quesadilla \$/ }).click()
  await page.getByRole('button', { name: /^Grilled Chicken/ }).click()
  await expect(page.locator('.builder-price')).toHaveText('$17.30')
})

test('deployed v1 localStorage upgrades without losing custom prices or history', async ({
  page,
}) => {
  const c = structuredClone(legacyDefaults)
  c.products.find((p) => p.id === 'small-burrito')!.price = verified(1410)
  const old = JSON.parse(JSON.stringify(c))
  delete old.defaultsVersion
  old.products.forEach((p: Record<string, unknown>) => {
    delete p.excludedProteinIds
    delete p.excludedExtraIds
  })
  await page.addInitScript((config) => {
    if (!localStorage.getItem('mucho-cash-helper:v1'))
      localStorage.setItem(
        'mucho-cash-helper:v1',
        JSON.stringify({ version: 1, config, history: [], cart: [] }),
      )
  }, old)
  await page.goto('./')
  await expect(page.locator('.product-card').filter({ hasText: 'Small Burrito' })).toContainText(
    '$14.10',
  )
  await item(page, 'Burritos', 'Regular Burrito', 'Beef Barbacoa', 'Guacamole')
  await expect(page.locator('.builder-price')).toHaveText('$21.40')
  await expect(page.locator('.resolve-price')).toHaveCount(0)
  await add(page)
  await page.getByRole('button', { name: /VIEW ORDER/ }).click()
  await page.getByRole('button', { name: '$50', exact: true }).click()
  await page.getByRole('button', { name: 'DONE / NEXT ORDER' }).click()
  await page.reload()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mucho-cash-helper:v1')!))
  expect(saved.config.defaultsVersion).toBe(2)
  expect(saved.history).toHaveLength(1)
  expect(
    saved.config.products.find((p: { id: string }) => p.id === 'small-burrito').price.cents,
  ).toBe(1410)
  await item(page, 'Quesadilla', 'Quesadilla', 'Grilled Chicken')
  await expect(page.locator('.builder-price')).toHaveText('$17.30')
  await expect(page.locator('.resolve-price')).toHaveCount(0)
})

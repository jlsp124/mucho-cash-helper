import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { freshDefaults } from '../src/menu'
import { unknown, verified, type Config } from '../src/model'

async function setup(page: Page, edit?: (c: Config) => void) {
  const c = freshDefaults()
  c.products.find((p) => p.id === 'regular-burrito')!.price = verified(1545)
  c.products.find((p) => p.id === 'chips-queso')!.price = verified(595)
  c.proteins.find((p) => p.id === 'grilled-chicken')!.price = verified(0)
  c.proteins.find((p) => p.id === 'beef-barbacoa')!.price = verified(250)
  c.proteins.find((p) => p.id === 'steak')!.price = verified(300)
  c.extras.forEach((e) => (e.price = verified(150)))
  c.products
    .filter((p) => p.category === 'Drinks')
    .forEach((p) => {
      p.price = verified(250)
      p.deposit = verified(10)
    })
  edit?.(c)
  await page.addInitScript((config) => {
    if (!localStorage.getItem('mucho-cash-helper:v1'))
      localStorage.setItem(
        'mucho-cash-helper:v1',
        JSON.stringify({ version: 1, config, history: [], cart: [] }),
      )
  }, c)
  await page.goto('./')
}
async function burrito(page: Page, protein = 'Grilled Chicken') {
  await page.getByRole('button', { name: /^Regular Burrito \$/ }).click()
  await page.getByRole('button', { name: new RegExp(`^${protein}(?: |$)`) }).click()
  await page.getByRole('button', { name: /Add to order/ }).click()
}
async function review(page: Page) {
  await page.getByRole('button', { name: /VIEW ORDER/ }).click()
}

test('chicken burrito, $20 tender, done, history and next order', async ({ page }) => {
  await setup(page)
  await burrito(page)
  await review(page)
  await expect(page.locator('.cash-total')).toContainText('$16.20')
  await page.getByRole('button', { name: '$20', exact: true }).click()
  await expect(page.locator('.change-amount h3')).toHaveText('$3.80')
  await expect(page.locator('.denominations')).toContainText('$2')
  await page.getByRole('button', { name: 'DONE / NEXT ORDER' }).click()
  await expect(page.locator('.cart-bar')).toContainText('0 items')
  await page.getByRole('button', { name: 'Order history', exact: true }).click()
  await page.locator('.history-row').click()
  await expect(page.getByRole('dialog', { name: 'Completed order' })).toContainText('$16.20')
  await expect(page.getByRole('dialog', { name: 'Completed order' })).toContainText(
    'Grilled Chicken',
  )
})
test('premium protein, live price, paid extra and product override', async ({ page }) => {
  await setup(page, (c) => {
    c.products.find((p) => p.id === 'regular-burrito')!.proteinOverrides.steak = {
      mode: 'total',
      price: verified(1900),
    }
  })
  await page.getByRole('button', { name: /^Regular Burrito \$/ }).click()
  await page.getByRole('button', { name: /^Beef Barbacoa / }).click()
  await expect(page.locator('.builder-price')).toHaveText('$17.95')
  await page.getByRole('button', { name: /^Steak / }).click()
  await expect(page.locator('.builder-price')).toHaveText('$19.00')
  await page.getByRole('button', { name: /Guacamole \+/ }).click()
  await expect(page.locator('.builder-price')).toHaveText('$20.50')
  await page.getByRole('button', { name: /Add to order/ }).click()
  await review(page)
  await expect(page.locator('.receipt-lines')).toContainText('Guacamole')
})
test('two burritos and chips, quantity and undo', async ({ page }) => {
  await setup(page)
  await burrito(page)
  await burrito(page)
  await page.getByRole('button', { name: 'Sides', exact: true }).click()
  await page.getByRole('button', { name: /^Chips & Queso · Regular \$/ }).click()
  await review(page)
  await expect(page.locator('.cash-total')).toContainText('$38.70')
  await page.getByRole('button', { name: 'Decrease Regular Burrito quantity' }).click()
  await expect(page.locator('.cash-total')).toContainText('$22.45')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('.cash-total')).toContainText('$38.70')
})
test('mixed food and soda, GST PST and separate deposit', async ({ page }) => {
  await setup(page)
  await burrito(page)
  await page.getByRole('button', { name: 'Drinks', exact: true }).click()
  await page
    .locator('.product-card')
    .filter({ has: page.getByRole('heading', { name: 'Pop Can', exact: true }) })
    .click()
  await review(page)
  await expect(page.locator('.receipt-totals')).toContainText('$0.90')
  await expect(page.locator('.receipt-totals')).toContainText('$0.18')
  await expect(page.locator('.receipt-totals')).toContainText('Refundable deposits')
  await expect(page.locator('.cash-total')).toContainText('$19.15')
})
test('multiple soda and non-soda drinks', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: 'Drinks', exact: true }).click()
  await page
    .locator('.product-card')
    .filter({ has: page.getByRole('heading', { name: 'Pop Can', exact: true }) })
    .click()
  await page.getByRole('button', { name: /^Water Bottle \$/ }).click()
  await page
    .locator('.product-card')
    .filter({ has: page.getByRole('heading', { name: 'Jarritos', exact: true }) })
    .click()
  await review(page)
  await expect(page.locator('.cash-total')).toContainText('$8.55')
  await expect(page.locator('.receipt-totals')).toContainText('$0.35')
})
test('custom tender and insufficient cash never completes', async ({ page }) => {
  await setup(page)
  await burrito(page)
  await review(page)
  await page.getByRole('button', { name: '$5', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Still owed $11.20')
  await expect(page.getByRole('button', { name: 'DONE / NEXT ORDER' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Other', exact: true }).click()
  await page.getByRole('textbox', { name: 'Custom cash amount' }).fill('23.75')
  await page.getByRole('button', { name: /Calculate change/ }).click()
  await expect(page.locator('.change-amount h3')).toHaveText('$7.55')
})
test('edit protein and extras; remove and undo; clear confirmation', async ({ page }) => {
  await setup(page)
  await burrito(page)
  await review(page)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByRole('button', { name: /^Beef Barbacoa / }).click()
  await page.getByRole('button', { name: /Guacamole \+/ }).click()
  await page.getByRole('button', { name: /Update item/ }).click()
  await expect(page.locator('.receipt-lines')).toContainText('Beef Barbacoa')
  await page.getByRole('button', { name: 'Remove Regular Burrito' }).click()
  await expect(page.getByRole('heading', { name: 'The order is empty' })).toBeVisible()
  await page.getByRole('button', { name: 'Close Your order' }).click()
  await page.getByRole('button', { name: 'Undo last order action' }).click()
  await review(page)
  await expect(page.locator('.receipt-lines')).toContainText('Beef Barbacoa')
  await page.getByRole('button', { name: 'Clear order', exact: true }).click()
  await page.getByRole('button', { name: 'Keep order', exact: true }).click()
  await expect(page.locator('.receipt-lines')).toContainText('Regular Burrito')
})
test('explicit custom unknowns still require saved prices', async ({ page }) => {
  await setup(page, (c) => {
    c.proteins[0].price = unknown()
    c.extras[0].price = unknown()
    c.products.find((p) => p.id === 'canned-pepsi')!.deposit = unknown()
  })
  await page.getByRole('button', { name: /^Regular Burrito \$/ }).click()
  await page.getByRole('button', { name: /^Grilled Chicken(?: |$)/ }).click()
  await expect(page.getByRole('button', { name: /Add to order/ })).toBeDisabled()
  await page.getByRole('button', { name: 'Included' }).click()
  await page.getByRole('button', { name: /Guacamole Set price/ }).click()
  await page.getByRole('textbox', { name: 'Guacamole extra price', exact: true }).fill('1.75')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.locator('.builder-price')).toHaveText('$17.20')
  await page.getByRole('button', { name: /Add to order/ }).click()
  await page.reload()
  await page.getByRole('button', { name: /^Regular Burrito \$/ }).click()
  await page.getByRole('button', { name: /^Grilled Chicken$/ }).click()
  await expect(page.locator('.builder-price')).toHaveText('$15.45')
  await page.getByRole('button', { name: 'Close Regular Burrito' }).click()
  await page.getByRole('button', { name: 'Drinks', exact: true }).click()
  await page
    .locator('.product-card')
    .filter({ has: page.getByRole('heading', { name: 'Pop Can', exact: true }) })
    .click()
  await expect(page.getByRole('button', { name: /Add to order/ })).toBeDisabled()
  await page.getByRole('button', { name: 'No deposit' }).click()
  await expect(page.getByRole('button', { name: /Add to order/ })).toBeEnabled()
})
test('price editor persists, custom product, import and reset protection', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: 'Menu & Prices', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Regular Burrito \$/ })
    .click()
  await page.getByRole('textbox', { name: 'Base price', exact: true }).fill('16.00')
  await page.getByRole('button', { name: 'Save product', exact: true }).click()
  await page.getByRole('button', { name: 'Add custom product' }).click()
  await page.getByRole('textbox', { name: 'Product name' }).fill('Staff special')
  await page.getByRole('textbox', { name: 'Base price', exact: true }).fill('7.00')
  await page.getByRole('button', { name: 'Save product', exact: true }).click()
  await page.getByRole('tab', { name: 'Transfer' }).click()
  await page.getByRole('button', { name: 'Reset to shipped defaults' }).click()
  await page.getByRole('button', { name: 'Keep current menu' }).click()
  await page.getByRole('textbox', { name: 'Or paste configuration' }).fill('{bad')
  await page.getByRole('button', { name: 'Review pasted configuration' }).click()
  await expect(page.getByRole('alert')).toContainText('Invalid configuration')
  await page.getByRole('button', { name: 'Close Menu & Prices' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: /^Regular Burrito \$/ })).toContainText('$16.00')
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await expect(page.getByRole('button', { name: /Staff special/ })).toBeVisible()
})
test('offline reload, configured checkout and history', async ({ page, context }) => {
  await setup(page)
  await expect(page.getByText(/^(Offline ready|Offline|Online)$/i)).toHaveCount(0)
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
  await expect(page.getByRole('heading', { name: 'Burritos' })).toBeVisible()
  await burrito(page)
  await review(page)
  await page.getByRole('button', { name: '$20', exact: true }).click()
  await page.getByRole('button', { name: 'DONE / NEXT ORDER' }).click()
  await page.getByRole('button', { name: 'Order history', exact: true }).click()
  await expect(page.locator('.history-row')).toHaveCount(1)
})
test('required $13.65 Canadian denomination breakdown', async ({ page }) => {
  await setup(page, (c) => {
    c.products.find((p) => p.id === 'chips-queso')!.price = verified(3462)
  })
  await page.getByRole('button', { name: 'Sides', exact: true }).click()
  await page.getByRole('button', { name: /^Chips & Queso · Regular \$/ }).click()
  await review(page)
  await expect(page.locator('.cash-total')).toContainText('$36.35')
  await page.getByRole('button', { name: '$50', exact: true }).click()
  await expect(page.locator('.change-amount h3')).toHaveText('$13.65')
  await expect(page.locator('.denomination')).toHaveText([
    '$10× 1',
    '$2× 1',
    '$1× 1',
    '25¢× 2',
    '10¢× 1',
    '5¢× 1',
  ])
  await page.screenshot({ path: 'test-results/change-390.png', fullPage: false })
})

test('cash rounding up is visible and custom pennies are rejected', async ({ page }) => {
  await setup(page, (c) => {
    c.products.find((p) => p.id === 'chips-queso')!.price = verified(503)
  })
  await page.getByRole('button', { name: 'Sides', exact: true }).click()
  await page.getByRole('button', { name: /^Chips & Queso · Regular \$/ }).click()
  await review(page)
  await expect(page.locator('.receipt-totals')).toContainText('+$0.02')
  await expect(page.locator('.cash-total')).toContainText('$5.30')
  await page.getByRole('button', { name: 'Other', exact: true }).click()
  await page.getByRole('textbox', { name: 'Custom cash amount' }).fill('10.01')
  await page.getByRole('button', { name: /Calculate change/ }).click()
  await expect(
    page.getByRole('dialog', { name: 'Cash received' }).getByRole('status'),
  ).toContainText('5¢ increments')
  await expect(page.getByRole('button', { name: 'DONE / NEXT ORDER' })).toHaveCount(0)
})

test('export and successful import transfer the exact configuration', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: 'Menu & Prices', exact: true }).click()
  await page.getByRole('tab', { name: 'Transfer' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export configuration JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('mucho-cash-config.json')
  const newConfig = freshDefaults()
  newConfig.products.find((p) => p.id === 'regular-burrito')!.price = verified(1999)
  await page
    .getByRole('textbox', { name: 'Or paste configuration' })
    .fill(JSON.stringify(newConfig))
  await page.getByRole('button', { name: 'Review pasted configuration' }).click()
  await page.getByRole('button', { name: 'Replace configuration', exact: true }).click()
  await page.getByRole('button', { name: 'Close Menu & Prices' }).click()
  await expect(page.getByRole('button', { name: /^Regular Burrito \$/ })).toContainText('$19.99')
  await page.reload()
  await expect(page.getByRole('button', { name: /^Regular Burrito \$/ })).toContainText('$19.99')
})

test('Settings exposes per-size protein prices and rejects malformed money', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: 'Menu & Prices', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Regular Burrito \$/ })
    .click()
  await page.getByText('Protein prices for this product / size', { exact: true }).click()
  await page.getByRole('combobox', { name: 'Beef Barbacoa pricing mode' }).selectOption('total')
  await page.getByRole('textbox', { name: 'Beef Barbacoa full price', exact: true }).fill('19.50')
  await page.getByRole('textbox', { name: 'Base price', exact: true }).fill('1.234')
  await page.getByRole('button', { name: 'Save product', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edit product' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Base price', exact: true }).fill('15.45')
  await page.getByRole('button', { name: 'Save product', exact: true }).click()
  await page.getByRole('button', { name: 'Close Menu & Prices' }).click()
  await page.getByRole('button', { name: /^Regular Burrito \$/ }).click()
  await page.getByRole('button', { name: /^Beef Barbacoa / }).click()
  await expect(page.locator('.builder-price')).toHaveText('$19.50')
})
for (const width of [320, 375, 390, 430, 768, 820, 1024, 1180, 1200]) {
  test(`mobile and desktop layout ${width}px, checkout targets and no overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1200 ? 900 : 844 })
    await setup(page)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    const touchTargets = await page
      .locator('button:visible')
      .evaluateAll((buttons) => buttons.every((b) => b.getBoundingClientRect().height >= 48))
    expect(touchTargets).toBe(true)
    await page.screenshot({ path: `test-results/menu-${width}.png`, fullPage: true })
    await burrito(page)
    await review(page)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.getByRole('button', { name: '$20', exact: true }).click()
    await page.getByRole('button', { name: 'DONE / NEXT ORDER' }).click()
    expect(errors).toEqual([])
  })
}
test('light and dark accessibility, keyboard dialog focus', async ({ page }) => {
  await setup(page)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: /^Regular Burrito \$/ }).click()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await page.emulateMedia({ colorScheme: 'dark' })
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.screenshot({ path: 'test-results/menu-dark.png', fullPage: true })
})

import { test, expect } from '@playwright/test'
import { freshDefaultsV3 } from '../src/defaults-v3'
import { verified } from '../src/model'

test('installed v3 restores six fallback products, keeps physical prices and generic drinks', async ({
  page,
}) => {
  await page.addInitScript((config) => {
    if (!localStorage.getItem('mucho-cash-helper:v1'))
      localStorage.setItem(
        'mucho-cash-helper:v1',
        JSON.stringify({ version: 1, config, cart: [], history: [] }),
      )
  }, freshDefaultsV3())
  await page.goto('./')
  await expect(page.getByRole('button', { name: /^Regular Burrito \$/ })).toContainText('$12.45')
  await page.getByRole('button', { name: 'Sides', exact: true }).click()
  await expect(
    page.getByRole('button', { name: /^Zesty Fresca Fries · Regular \$/ }),
  ).toContainText('$7.20')
  await expect(page.getByRole('button', { name: /^Zesty Fresca Fries · MUCHO \$/ })).toContainText(
    '$10.20',
  )
  await expect(
    page.getByRole('button', { name: /^Signature Mercado Fries · Regular \$/ }),
  ).toContainText('$4.95')
  await page.getByRole('button', { name: 'Desserts', exact: true }).click()
  await expect(page.getByRole('button', { name: /^MUCHO Churro Fries \$/ })).toContainText('$14.95')
  await expect(page.getByRole('button', { name: /^MUCHO Cookies \$/ })).toContainText('$12.95')
  await expect(page.getByRole('button', { name: /^Churro Fries · 6 pieces \$/ })).toContainText(
    '$3.50',
  )
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Mucho’s Way Burrito \$/ })).toContainText(
    '$13.45',
  )
  await expect(page.getByRole('button', { name: /^Mucho’s Way Bowl \$/ })).toContainText('$16.75')
  await page.getByRole('button', { name: 'Drinks', exact: true }).click()
  await expect(page.locator('.product-card:visible')).toHaveCount(6)
  await expect(page.getByRole('main')).not.toContainText(
    /Pepsi|Diet Pepsi|Ginger Ale|4 Canned|Fountain/,
  )
  await page.reload()
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('mucho-cash-helper:v1')!).config.defaultsVersion,
    ),
  ).toBe(4)
  await page.getByRole('button', { name: 'Menu & Prices', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search menu settings' }).fill('MUCHO Churro Fries')
  await page.getByRole('button', { name: /^MUCHO Churro Fries \$/ }).click()
  await page.getByRole('textbox', { name: 'Base price', exact: true }).fill('15.25')
  await page.getByRole('button', { name: 'Save product', exact: true }).click()
  await page.getByRole('button', { name: 'Close Menu & Prices' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Desserts', exact: true }).click()
  await expect(page.getByRole('button', { name: /^MUCHO Churro Fries \$/ })).toContainText('$15.25')
})

test('v3 deliberate product changes survive restoration on a real browser reload', async ({
  page,
}) => {
  const config = freshDefaultsV3()
  config.products.find((p) => p.id === 'mucho-cookies')!.price = verified(1400)
  config.products.find((p) => p.id === 'regular-burrito')!.price = verified(1300)
  config.products.find((p) => p.id === 'bowl')!.enabled = false
  await page.addInitScript((config) => {
    if (!localStorage.getItem('mucho-cash-helper:v1'))
      localStorage.setItem(
        'mucho-cash-helper:v1',
        JSON.stringify({ version: 1, config, cart: [], history: [] }),
      )
  }, config)
  await page.goto('./')
  await expect(page.getByRole('button', { name: /^Regular Burrito \$/ })).toContainText('$13.00')
  await page.getByRole('button', { name: 'Desserts', exact: true }).click()
  await expect(page.getByRole('button', { name: /^MUCHO Cookies \$/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^MUCHO Churro Fries \$/ })).toBeVisible()
  await page.reload()
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('mucho-cash-helper:v1')!).config,
  )
  expect(saved.products.find((p: { id: string }) => p.id === 'mucho-cookies')).toMatchObject({
    enabled: false,
    price: { cents: 1400 },
  })
  expect(saved.products.find((p: { id: string }) => p.id === 'bowl')).toMatchObject({
    enabled: false,
  })
})

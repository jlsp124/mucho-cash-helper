import { expect, it } from 'vitest'
import { freshDefaults } from './menu'
import { itemPrice } from './money'

it.each([
  ['regular-burrito', 'grilled-chicken', [], 1545],
  ['regular-burrito', 'crispy-chicken', [], 1545],
  ['regular-burrito', 'beef-barbacoa', [], 1840],
  ['regular-burrito', 'steak', ['guacamole'], 2140],
  ['small-burrito', 'shiitake-carnitas', ['queso'], 1940],
  ['mucho-burrito', 'pork-carnitas', ['extra-protein', 'salsa-side'], 2565],
  ['bowl', 'grilled-chicken', [], 1675],
  ['bowl', 'beef-barbacoa', [], 1970],
  ['taco-solo', 'grilled-chicken', [], 545],
  ['taco-solo', 'beef-barbacoa', [], 745],
  ['taco-solo', 'shiitake-carnitas', ['honey-chili-sauce'], 1045],
  ['taco-trio', 'steak', [], 2135],
  ['taco-trio', 'shiitake-carnitas', ['honey-chili-sauce'], 3035],
  ['quesadilla', 'grilled-chicken', [], 1730],
  ['quesadilla', 'beef-barbacoa', ['guacamole'], 2030],
  ['quesadilla', 'veggies', [], 1355],
] as const)('%s / %s has the PG configured total', (id, protein, extras, expected) => {
  const config = freshDefaults()
  expect(
    itemPrice(
      config.products.find((p) => p.id === id)!,
      protein,
      [...extras],
      config,
    ),
  ).toBe(expected)
})

it('every enabled standard product and available modifier works without setup', () => {
  const c = freshDefaults()
  for (const product of c.products.filter((p) => p.enabled)) {
    expect(product.price.cents, product.id).not.toBeNull()
    expect(product.deposit.cents, product.id).not.toBeNull()
    if (!product.customizable) {
      expect(itemPrice(product, undefined, [], c), product.id).not.toBeNull()
      continue
    }
    const proteins = c.proteins.filter(
      (p) => p.enabled && !product.excludedProteinIds.includes(p.id),
    )
    const extras = c.extras.filter((e) => e.enabled && !product.excludedExtraIds.includes(e.id))
    for (const protein of proteins) {
      expect(itemPrice(product, protein.id, [], c), `${product.id}/${protein.id}`).not.toBeNull()
      for (const extra of extras)
        expect(
          itemPrice(product, protein.id, [extra.id], c),
          `${product.id}/${protein.id}/${extra.id}`,
        ).not.toBeNull()
    }
  }
})

it('unlisted items stay editable and disabled, and container deposits are complete', () => {
  const c = freshDefaults()
  expect(c.extras.find((e) => e.id === 'extra-cheese')).toMatchObject({
    enabled: false,
    price: { cents: null },
  })
  for (const id of ['chips', 'fountain-soda', 'limited-time'])
    expect(c.products.find((p) => p.id === id)).toMatchObject({
      enabled: false,
      price: { cents: null },
    })
  expect(c.products.find((p) => p.id === 'canned-pepsi')!.deposit.cents).toBe(10)
  expect(c.products.find((p) => p.id === '4-canned-pepsi-drinks')!.deposit.cents).toBe(40)
})
it('signature recipes expose only the proteins and extras actually offered', () => {
  const c = freshDefaults()
  for (const id of ['signature-burrito', 'signature-bowl']) {
    const p = c.products.find((product) => product.id === id)!
    expect(p.excludedExtraIds).toEqual(c.extras.map((e) => e.id))
    expect(itemPrice(p, 'beef-barbacoa', [], c)).toBe(p.price.cents! + 295)
  }
})

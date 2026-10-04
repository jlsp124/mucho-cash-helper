import { expect, it } from 'vitest'
import { freshDefaults } from './menu'
import { calculateTotals, itemPrice, priceLine } from './money'
import { verified } from './model'

it.each([
  ['small-burrito', 'grilled-chicken', [], 1075],
  ['regular-burrito', 'grilled-chicken', [], 1245],
  ['regular-burrito', 'crispy-chicken', [], 1245],
  ['mucho-burrito', 'grilled-chicken', [], 1575],
  ['bowl', 'grilled-chicken', [], 1375],
  ['bowl-double-protein', 'grilled-chicken', ['extra-protein'], 1675],
  ['taco-solo', 'grilled-chicken', [], 445],
  ['taco-trio', 'grilled-chicken', [], 1245],
  ['veggie-quesadilla', 'veggies', [], 1095],
  ['quesadilla', 'grilled-chicken', [], 1395],
  ['quesadilla', 'beef-barbacoa', [], 1595],
  ['regular-burrito', 'beef-barbacoa', [], 1445],
  ['regular-burrito', 'steak', [], 1445],
  ['regular-burrito', 'shiitake-carnitas', [], 1445],
  ['regular-burrito', 'grilled-chicken', ['extra-protein'], 1545],
  ['regular-burrito', 'grilled-chicken', ['guacamole'], 1495],
  ['mucho-burrito', 'grilled-chicken', ['guacamole'], 1575],
  ['regular-burrito', 'veggies', ['guacamole'], 1245],
  ['taco-trio', 'beef-barbacoa', [], 1445],
  ['taco-trio', 'steak', [], 1445],
  ['taco-trio', 'shiitake-carnitas', [], 1445],
  ['honey-chili-small', 'grilled-chicken', [], 1175],
  ['honey-chili-burrito', 'crispy-chicken', [], 1375],
  ['honey-chili-mucho', 'grilled-chicken', [], 1675],
  ['honey-chili-bowl', 'crispy-chicken', [], 1475],
  ['kids-meal', undefined, [], 695],
] as const)('%s / %s uses physical store pricing', (id, protein, extras, expected) => {
  const c = freshDefaults()
  expect(
    itemPrice(
      c.products.find((p) => p.id === id)!,
      protein,
      [...extras],
      c,
    ),
  ).toBe(expected)
})
it.each([
  ['signature-fries-regular', 495],
  ['signature-fries-mucho', 795],
  ['queso-fries-regular', 595],
  ['queso-fries-mucho', 895],
  ['loaded-nachos', 595],
  ['chips-salsa', 345],
  ['chips-salsa-mucho', 595],
  ['chips-guacamole', 445],
  ['chips-guacamole-mucho', 745],
  ['chips-queso', 445],
  ['chips-queso-mucho', 745],
  ['salsa-flight', 695],
  ['churros', 350],
  ['cookie', 250],
])('%s has the physical side/dessert price', (id, expected) => {
  const c = freshDefaults()
  expect(
    itemPrice(
      c.products.find((p) => p.id === id)!,
      undefined,
      [],
      c,
    ),
  ).toBe(expected)
})
it.each(['queso-fries-regular', 'queso-fries-mucho', 'loaded-nachos'])(
  '%s adds any protein for $2',
  (id) => {
    const c = freshDefaults(),
      p = c.products.find((p) => p.id === id)!
    expect(itemPrice(p, 'grilled-chicken', [], c)).toBe(p.price.cents! + 200)
    expect(itemPrice(p, 'steak', [], c)).toBe(p.price.cents! + 200)
  },
)
it('offers six generic drink categories with separate tax classes and single-container deposits', () => {
  const drinks = freshDefaults().products.filter((p) => p.category === 'Drinks' && p.enabled)
  expect(drinks.map((p) => [p.name, p.price.cents, p.taxClass, p.deposit.cents]).sort()).toEqual(
    [
      ['Pop Can', 225, 'SODA', 10],
      ['Pop Bottle', 350, 'SODA', 10],
      ['Jarritos', 375, 'SODA', 10],
      ['Water Bottle', 295, 'NON_SODA_DRINK', 10],
      ['Juice Bottle', 375, 'NON_SODA_DRINK', 10],
      ['Premium Bottle', 375, 'NON_SODA_DRINK', 10],
    ].sort(),
  )
})
it.each([
  ['combo-salsa', 445],
  ['combo-nachos', 695],
  ['combo-fries', 595],
  ['combo-churros', 495],
])('%s includes exactly one can without adding its standalone price', (id, cents) => {
  const c = freshDefaults(),
    product = c.products.find((p) => p.id === 'regular-burrito')!
  const priced = priceLine(product, 'grilled-chicken', [String(id)], c)!
  expect(priced.unitCents).toBe(1245 + Number(cents))
  expect(priced.sodaCents).toBe(225)
  expect(priced.depositCents).toBe(10)
  expect(priced.details).toHaveLength(2)
  const totals = calculateTotals(
    [
      {
        ...priced,
        id: '1',
        productId: product.id,
        name: product.name,
        taxClass: 'FOOD',
        quantity: 1,
      },
    ],
    c.taxes,
  )
  expect(totals.pst).toBe(16)
  expect(totals.deposits).toBe(10)
})
it('prevents multiple combos and charges repeated modifiers only once', () => {
  const c = freshDefaults(),
    p = c.products[0]
  expect(itemPrice(p, 'grilled-chicken', ['combo-salsa', 'combo-nachos'], c)).toBeNull()
  expect(itemPrice(p, 'grilled-chicken', ['guacamole', 'guacamole'], c)).toBe(1325)
})
it('included guac is free even with a full-price override or a stale selected extra', () => {
  const c = freshDefaults(),
    p = c.products.find((p) => p.id === 'mucho-burrito')!
  p.proteinOverrides.steak = { mode: 'total', price: verified(1800) }
  p.extraOverrides.guacamole = verified(400)
  const line = priceLine(p, 'steak', ['guacamole'], c)!
  expect(line.unitCents).toBe(1800)
  expect(line.extraIds).toEqual([])
  expect(line.details).toHaveLength(1)
})
it('every enabled product and available modifier works without setup', () => {
  const c = freshDefaults()
  for (const p of c.products.filter((p) => p.enabled)) {
    expect(p.price.cents, p.id).not.toBeNull()
    expect(p.deposit.cents, p.id).not.toBeNull()
    if (!p.customizable) {
      expect(itemPrice(p, undefined, [], c), p.id).not.toBeNull()
      continue
    }
    for (const protein of c.proteins.filter(
      (protein) => protein.enabled && !p.excludedProteinIds.includes(protein.id),
    )) {
      expect(itemPrice(p, protein.id, [], c), p.id).not.toBeNull()
      for (const extra of c.extras.filter(
        (extra) => extra.enabled && !p.excludedExtraIds.includes(extra.id),
      ))
        expect(
          itemPrice(p, protein.id, [extra.id], c),
          `${p.id}/${protein.id}/${extra.id}`,
        ).not.toBeNull()
    }
  }
})

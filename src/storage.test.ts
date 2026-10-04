import { expect, it } from 'vitest'
import { decodeState, importConfig, initialState, serializeConfig } from './storage'
import { freshDefaults } from './menu'
import { legacyDefaults } from './legacy-defaults'
import { defaultsV2 } from './defaults-v2'
import { unknown, verified } from './model'
it('round-trips unknowns, verified zero, disabled LTOs and overrides', () => {
  const c = freshDefaults()
  c.proteins[0].price = verified(0)
  c.products[0].proteinOverrides.steak = { mode: 'total', price: verified(1900) }
  expect(importConfig(serializeConfig(c))).toEqual(c)
})
it('round-trips versioned saved state', () => {
  const s = initialState()
  expect(decodeState(JSON.stringify(s))).toEqual({ state: s, warning: null })
})
it('does not replace defaults on a first visit', () => expect(decodeState(null).warning).toBeNull())
it('recovers corrupt JSON safely with a visible warning', () => {
  expect(decodeState('{bad').state).toEqual(initialState())
  expect(decodeState('{bad').warning).toBeTruthy()
})
it('recovers independent configuration when old history is invalid', () => {
  const s = initialState()
  s.config.products[0].price = verified(1777)
  const result = decodeState(JSON.stringify({ ...s, history: [{ invalid: true }] }))
  expect(result.state.config.products[0].price.cents).toBe(1777)
  expect(result.state.history).toEqual([])
  expect(result.warning).toBeTruthy()
})
it('falls back safely from unsupported old versions', () =>
  expect(decodeState('{"version":0}').warning).toBeTruthy())
it.each([-1, 1.5, 1000001, '1500'])('rejects invalid price %s in imports', (value) => {
  const c = freshDefaults()
  const raw = JSON.stringify(c).replace('"cents":1075', `"cents":${JSON.stringify(value)}`)
  expect(() => importConfig(raw)).toThrow()
})
it('rejects duplicate IDs', () => {
  const c = freshDefaults()
  c.products.push(c.products[0])
  expect(() => importConfig(JSON.stringify(c))).toThrow()
})
it('rejects unknown tax classes and unsupported import versions', () => {
  expect(() =>
    importConfig(JSON.stringify(freshDefaults()).replace('"FOOD"', '"GLOBAL12"')),
  ).toThrow()
  expect(() => importConfig(JSON.stringify({ ...freshDefaults(), version: 2 }))).toThrow()
})
it('rejects oversized files', () => expect(() => importConfig(' '.repeat(2_000_001))).toThrow())

function legacyJSON(
  config = structuredClone(legacyDefaults),
  history: unknown[] = [],
  cart: unknown[] = [],
) {
  // Exact original deployed shape: no data revision or product exclusions.
  const raw = JSON.parse(JSON.stringify(config))
  delete raw.defaultsVersion
  raw.products.forEach((p: Record<string, unknown>) => {
    delete p.excludedProteinIds
    delete p.excludedExtraIds
  })
  return JSON.stringify({ version: 1, config: raw, history, cart })
}
it('upgrades untouched deployed v1 unknowns to the complete current defaults', () => {
  const result = decodeState(legacyJSON())
  expect(result.warning).toBeNull()
  expect(result.state.config).toEqual(freshDefaults())
})
it('preserves intentional pricing, flags, tax classes, global zero and per-product overrides', () => {
  const old = structuredClone(legacyDefaults)
  old.products[0].price = { cents: 1777, verified: false, source: 'store' }
  old.products[0].enabled = false
  old.products[0].lto = true
  old.products[0].taxClass = 'EXEMPT'
  old.products[0].proteinOverrides.steak = { mode: 'total', price: verified(2300) }
  old.products[0].extraOverrides.queso = verified(200)
  old.proteins[0].price = verified(0)
  old.proteins[1].enabled = false
  old.extras[0].price = verified(125)
  old.extras[3].price = verified(75) // Intentionally priced Extra Cheese stays enabled.
  old.products.find((p) => p.id === 'canned-pepsi')!.deposit = verified(0)
  old.products.find((p) => p.id === 'regular-burrito')!.price.cents = 1818
  old.taxes.gstBasisPoints = 600
  const custom = { ...structuredClone(old.products[0]), id: 'staff-special', name: 'Staff Special' }
  old.products.push(custom)
  const c = decodeState(legacyJSON(old)).state.config
  expect(c.defaultsVersion).toBe(3)
  expect(c.products[0]).toMatchObject({
    price: old.products[0].price,
    enabled: false,
    lto: true,
    taxClass: 'EXEMPT',
    proteinOverrides: { steak: old.products[0].proteinOverrides.steak },
    extraOverrides: { queso: verified(200) },
  })
  expect(c.proteins[0].price).toEqual(verified(0))
  expect(c.proteins[1].enabled).toBe(false)
  expect(c.extras.find((e) => e.id === 'extra-cheese')).toMatchObject({
    price: verified(75),
    enabled: true,
  })
  expect(c.products.find((p) => p.id === 'canned-pepsi')!.deposit).toEqual(verified(0))
  expect(c.products.find((p) => p.id === 'regular-burrito')!.price.cents).toBe(1818)
  expect(c.products.find((p) => p.id === custom.id)).toEqual(custom)
  expect(c.taxes.gstBasisPoints).toBe(600)
})
it('preserves active snapshots with unresolved legacy prices and all paid receipt amounts', () => {
  const line = {
    id: 'line',
    productId: 'regular-burrito',
    name: 'Regular Burrito',
    proteinId: 'grilled-chicken',
    extraIds: [],
    details: [{ name: 'Grilled Chicken', cents: 0 }],
    unitCents: 1545,
    depositCents: 0,
    taxClass: 'FOOD',
    quantity: 1,
  }
  const receipt = {
    id: 'receipt',
    timestamp: '2026-10-03T12:00:00.000Z',
    lines: [line],
    totals: { subtotal: 1545, gst: 77, pst: 0, deposits: 0, rounding: -2, cash: 1620 },
    tendered: 2000,
    change: 380,
    breakdown: [
      { cents: 200, count: 1, label: '$2 coin' },
      { cents: 100, count: 1, label: '$1 coin' },
      { cents: 25, count: 3, label: '25¢' },
      { cents: 5, count: 1, label: '5¢' },
    ],
  }
  const result = decodeState(legacyJSON(structuredClone(legacyDefaults), [receipt], [line]))
  expect(result.warning).toBeNull()
  expect(result.state.cart[0].unitCents).toBe(1545)
  expect(result.state.history).toEqual([
    {
      ...receipt,
      paymentMethod: 'CASH',
      lines: [{ ...line, sodaCents: 0 }],
      totals: { ...receipt.totals, exact: 1622 },
    },
  ])
  expect(decodeState(JSON.stringify(result.state))).toEqual(result)
})
it('migrates v1 imports, respects omitted products, and adds new extras only once', () => {
  const old = structuredClone(legacyDefaults)
  old.products = old.products.filter((p) => p.id !== 'salad')
  const c = importConfig(JSON.stringify(old))
  expect(c.products.some((p) => p.id === 'salad')).toBe(false)
  expect(c.extras.filter((e) => e.id === 'honey-chili-sauce')).toHaveLength(1)
  expect(importConfig(serializeConfig(c))).toEqual(c)
})
it('never overwrites explicit unknowns in a current configuration on reload', () => {
  const state = initialState()
  state.config.proteins[0].price = unknown()
  expect(decodeState(JSON.stringify(state)).state.config).toEqual(state.config)
})
it('rejects a future defaults revision rather than silently downgrading it', () => {
  expect(() => importConfig(JSON.stringify({ ...freshDefaults(), defaultsVersion: 4 }))).toThrow()
})
it('preserves a full custom modifier list without exceeding schema limits during migration', () => {
  const old = structuredClone(legacyDefaults)
  while (old.extras.length < 50)
    old.extras.push({
      id: `custom-${old.extras.length}`,
      name: 'Custom extra',
      price: verified(25),
      enabled: true,
      includedExtraIds: [],
    })
  const result = decodeState(legacyJSON(old))
  expect(result.warning).toBeNull()
  expect(result.state.config.defaultsVersion).toBe(3)
  expect(result.state.config.extras).toHaveLength(50)
  expect(result.state.config.extras.at(-1)).toEqual(old.extras.at(-1))
})

it('upgrades the exact currently deployed v2 defaults, including nested taco/quesadilla overrides', () => {
  const result = decodeState(
    JSON.stringify({ version: 1, config: defaultsV2, cart: [], history: [] }),
  )
  expect(result.warning).toBeNull()
  expect(result.state.config).toEqual(freshDefaults())
  expect(decodeState(JSON.stringify(result.state))).toEqual(result)
})
it('v2 deliberate changes survive, including nested overrides at the same old numeric amount', () => {
  const config = structuredClone(defaultsV2)
  config.products[1].price = verified(1545) // Deliberate store value, not untouched online seed.
  const trio = config.products.find((p) => p.id === 'taco-trio')!
  trio.proteinOverrides.steak.price = verified(600)
  trio.proteinOverrides['beef-barbacoa'].price.cents = 275
  trio.extraOverrides.queso = verified(125)
  config.extras[0].price = verified(300)
  const migrated = importConfig(JSON.stringify(config))
  expect(migrated.products[1].price).toEqual(verified(1545))
  expect(migrated.extras[0].price).toEqual(verified(300))
  const updated = migrated.products.find((p) => p.id === 'taco-trio')!
  expect(updated.proteinOverrides.steak.price).toEqual(verified(600))
  expect(updated.proteinOverrides['beef-barbacoa'].price.cents).toBe(275)
  expect(updated.proteinOverrides['shiitake-carnitas']).toBeUndefined()
  expect(updated.extraOverrides.queso).toEqual(verified(125))
})
it('v2 open cart adopts physical defaults; paid cash receipts retain original money and gain method/exact total', () => {
  const line = {
    id: 'line',
    productId: 'regular-burrito',
    name: 'Regular Burrito',
    proteinId: 'grilled-chicken',
    extraIds: [],
    details: [{ name: 'Grilled Chicken', cents: 0 }],
    unitCents: 1545,
    depositCents: 0,
    taxClass: 'FOOD',
    quantity: 1,
  }
  const receipt = {
    id: 'receipt',
    timestamp: '2026-10-03T12:00:00.000Z',
    lines: [line],
    totals: { subtotal: 1545, gst: 77, pst: 0, deposits: 0, rounding: -2, cash: 1620 },
    tendered: 2000,
    change: 380,
    breakdown: [],
  }
  const result = decodeState(
    JSON.stringify({ version: 1, config: defaultsV2, cart: [line], history: [receipt] }),
  )
  expect(result.warning).toBeNull()
  expect(result.state.cart[0].unitCents).toBe(1245)
  expect(result.state.history[0]).toMatchObject({
    paymentMethod: 'CASH',
    tendered: 2000,
    change: 380,
    totals: { cash: 1620, exact: 1622 },
    lines: [{ unitCents: 1545 }],
  })
})

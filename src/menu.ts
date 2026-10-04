import { configSchema, verified, type Config, type Product } from './model'
import { defaultsV2 } from './defaults-v2'

// Physical PG boards supplied 2026-10-03; handwritten kids/guac reference.
// Unsupplied prices retain v2 fallback values. See docs/pricing-seeds.md.
export const DEFAULTS_VERSION = 3
export const defaults = structuredClone(defaultsV2)
defaults.defaultsVersion = DEFAULTS_VERSION
const find = (id: string) => defaults.products.find((p) => p.id === id)!
const prices: Record<string, number> = {
  'small-burrito': 1075,
  'regular-burrito': 1245,
  'mucho-burrito': 1575,
  bowl: 1375,
  'taco-solo': 445,
  'taco-trio': 1245,
  quesadilla: 1395,
  'signature-fries-regular': 495,
  'signature-fries-mucho': 795,
  'queso-fries-regular': 595,
  'queso-fries-mucho': 895,
  'loaded-nachos': 595,
  'chips-salsa': 345,
  'chips-guacamole': 445,
  'chips-queso': 445,
  'salsa-flight': 695,
  churros: 350,
  cookie: 250,
  'honey-chili-burrito': 1375,
  'honey-chili-bowl': 1475,
}
for (const [id, cents] of Object.entries(prices)) find(id).price = verified(cents)
find('mucho-burrito').name = 'MUCHO Burrito'
find('taco-solo').name = 'Single Taco'
find('quesadilla').name = 'Protein Quesadilla'
find('churros').name = 'Churro Fries · 6 pieces'
find('cookie').name = 'Chocolate Chunk Cookies · 2 cookies'
for (const id of ['taco-solo', 'taco-trio', 'quesadilla']) {
  Object.assign(find(id), {
    proteinOverrides: {},
    extraOverrides: {},
    excludedProteinIds: [],
    excludedExtraIds: ['salsa-side', 'honey-chili-sauce'],
  })
}
find('quesadilla').excludedProteinIds = ['veggies']
find('mucho-burrito').includedExtraIds = ['guacamole']
find('mucho-burrito').excludedExtraIds = ['salsa-side']
const add = (
  id: string,
  name: string,
  cents: number,
  template: Product,
  patch: Partial<Product> = {},
) => {
  defaults.products.push({
    ...structuredClone(template),
    id,
    name,
    price: verified(cents),
    ...patch,
  })
}
add('veggie-quesadilla', 'Veggie Quesadilla', 1095, find('quesadilla'), {
  excludedProteinIds: defaults.proteins.filter((p) => p.id !== 'veggies').map((p) => p.id),
})
add('bowl-double-protein', 'Bowl · 2× Protein', 1675, find('bowl'), {
  includedExtraIds: ['extra-protein'],
})
for (const [id, name, cents] of [
  ['chips-salsa-mucho', 'Chips & Salsa · MUCHO', 595],
  ['chips-guacamole-mucho', 'Chips & Guac · MUCHO', 745],
  ['chips-queso-mucho', 'Chips & Queso · MUCHO', 745],
] as const)
  add(id, name, cents, find('chips-salsa'))
find('chips-salsa').name = 'Chips & Salsa · Regular'
find('chips-guacamole').name = 'Chips & Guac · Regular'
find('chips-queso').name = 'Chips & Queso · Regular'
for (const id of ['queso-fries-regular', 'queso-fries-mucho', 'loaded-nachos']) {
  const p = find(id)
  p.customizable = true
  p.proteinOptional = true
  p.excludedProteinIds = ['veggies']
  p.excludedExtraIds = defaults.extras.map((e) => e.id)
  p.proteinOverrides = Object.fromEntries(
    defaults.proteins.map((protein) => [protein.id, { mode: 'adjustment', price: verified(200) }]),
  )
}
for (const p of defaults.products.filter((p) => p.id.startsWith('honey-chili-'))) {
  p.customizable = true
  p.excludedProteinIds = defaults.proteins
    .filter((protein) => !['grilled-chicken', 'crispy-chicken'].includes(protein.id))
    .map((protein) => protein.id)
}
find('honey-chili-burrito').name = 'Honey Chili Chicken · Regular'
find('honey-chili-bowl').name = 'Honey Chili Chicken · Bowl'
add('honey-chili-small', 'Honey Chili Chicken · Small', 1175, find('honey-chili-burrito'))
add('honey-chili-mucho', 'Honey Chili Chicken · MUCHO', 1675, find('honey-chili-burrito'), {
  includedExtraIds: ['guacamole'],
})
add('kids-meal', 'Kids Meal', 695, find('chips-salsa'), { category: 'More' })
// Stable IDs preserve deliberate edits/deposits on installed devices.
for (const p of defaults.products.filter((p) => p.category === 'Drinks')) p.enabled = false
for (const [id, name, cents, taxClass] of [
  ['canned-pepsi', 'Pop Can', 225, 'SODA'],
  ['bottled-water', 'Water Bottle', 295, 'NON_SODA_DRINK'],
  ['bottled-pepsi', 'Pop Bottle', 350, 'SODA'],
  ['juice', 'Juice Bottle', 375, 'NON_SODA_DRINK'],
  ['iced-tea', 'Premium Bottle', 375, 'NON_SODA_DRINK'],
  ['jarritos', 'Jarritos', 375, 'SODA'],
] as const)
  Object.assign(find(id), { name, price: verified(cents), taxClass, enabled: true })
for (const id of [
  'zesty-fries-regular',
  'zesty-fries-mucho',
  'mucho-churros',
  'mucho-cookies',
  'signature-burrito',
  'signature-bowl',
])
  find(id).enabled = false
for (const p of defaults.proteins) {
  p.price = verified(['steak', 'beef-barbacoa', 'shiitake-carnitas'].includes(p.id) ? 200 : 0)
  if (p.id === 'veggies') {
    p.name = 'Fajita Veggies'
    p.includedExtraIds = ['guacamole']
  }
}
defaults.extras.find((e) => e.id === 'guacamole')!.price = verified(250)
defaults.extras.find((e) => e.id === 'extra-protein')!.price = verified(300)
// Can price is included; configurable soda allocation/deposit are counted once.
for (const [id, name, cents] of [
  ['combo-salsa', 'Chips & Salsa', 445],
  ['combo-nachos', 'Loaded Nachos', 695],
  ['combo-fries', 'Mercado Fries', 595],
  ['combo-churros', 'Churro Fries', 495],
] as const)
  defaults.extras.push({
    id,
    name,
    price: verified(cents),
    enabled: true,
    includedExtraIds: [],
    bundle: { sodaCents: 225, deposit: verified(10) },
  })
for (const p of defaults.products.filter((p) => p.category === 'Sides'))
  p.excludedExtraIds.push(...defaults.extras.filter((e) => e.bundle).map((e) => e.id))
export const freshDefaults = (): Config => configSchema.parse(structuredClone(defaults))

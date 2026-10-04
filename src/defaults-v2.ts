import { configSchema, type Product, type Category, type Price, unknown, verified } from './model'

// Frozen deployed defaults from main d3552a8. Monetary/menu values are migration
// evidence only; never update this baseline when changing the current menu.

const seed = (cents: number): Price => ({ cents, verified: false, source: 'online' })
// Actual PG Uber Eats item configurators inspected 2026-10-03, including nested taco groups;
// regular burrito modifiers cross-checked in the PG DoorDash configurator.
// Delivery prices may differ from the physical register; provenance belongs here/README only.
// https://www.ubereats.com/ca/store/mucho-burrito-1600-15th-ave-unit-145/3J5voFnUUfG2JOdE4Erf_w
const product = (
  id: string,
  name: string,
  category: Category,
  amount: number | null,
  customizable = false,
  description = '',
): Product => ({
  id,
  name,
  category,
  price: amount === null ? unknown() : seed(amount),
  customizable,
  description,
  taxClass: 'FOOD',
  deposit: verified(0),
  enabled: true,
  lto: false,
  proteinOverrides: {},
  extraOverrides: {},
  includedExtraIds: [],
  proteinOptional: false,
  excludedProteinIds: [],
  excludedExtraIds: ['salsa-side'],
})
export const DEFAULTS_VERSION = 2
export const defaultsV2 = configSchema.parse({
  version: 1,
  defaultsVersion: DEFAULTS_VERSION,
  taxes: { gstBasisPoints: 500, pstBasisPoints: 700 },
  products: [
    product(
      'small-burrito',
      'Small Burrito',
      'Burritos',
      1345,
      true,
      'A little lighter. All the flavour.',
    ),
    product(
      'regular-burrito',
      'Regular Burrito',
      'Burritos',
      1545,
      true,
      'The go-to, made your way.',
    ),
    product(
      'mucho-burrito',
      'Mucho Burrito',
      'Burritos',
      1915,
      true,
      'Big appetite. Bigger burrito.',
    ),
    product('bowl', 'Bowl', 'Bowls / Salads', 1675, true, 'All the good stuff, in a bowl.'),
    product('salad', 'Salad', 'Bowls / Salads', 1675, true, 'Fresh, crisp and made your way.'),
    product('taco-solo', 'Taco Solo', 'Tacos', 545, true, 'One taco, your choice of protein.'),
    product('taco-trio', 'Taco Trio', 'Tacos', 1535, true, 'Three tacos. One great choice.'),
    product(
      'quesadilla',
      'Quesadilla',
      'Quesadilla',
      1355,
      true,
      'Toasted tortilla, melted cheese.',
    ),
    ...[
      ['salsa-flight', 'Salsa Flight', 795],
      ['signature-fries-regular', 'Signature Mercado Fries · Regular', 599],
      ['signature-fries-mucho', 'Signature Mercado Fries · Mucho', 962],
      ['zesty-fries-regular', 'Zesty Fresca Fries · Regular', 720],
      ['zesty-fries-mucho', 'Zesty Fresca Fries · Mucho', 1020],
      ['queso-fries-regular', 'Creamy Queso Fries · Regular', 720],
      ['queso-fries-mucho', 'Creamy Queso Fries · Mucho', 1020],
      ['loaded-nachos', 'Loaded Nachos', 840],
      ['chips-queso', 'Chips + Queso', 595],
      ['chips-guacamole', 'Chips + Guacamole', 595],
      ['chips-salsa', 'Chips + Salsa', 495],
      ['salsa', 'Salsa · 4oz', 275],
      ['queso', 'Queso · 4oz', 375],
      ['guacamole', 'Guacamole · 4oz', 375],
      ['extra-tortilla', '10-inch Tortilla', 55],
    ].map(([id, name, amount]) => product(String(id), String(name), 'Sides', Number(amount))),
    // Plain chips has no current PG public listing. Do not invent a price.
    { ...product('chips', 'Chips', 'Sides', null), enabled: false },
    ...[
      // Named variants share the PG canned/bottled menu price.
      ['Canned Pepsi', 'SODA', 325],
      ['Canned Diet Pepsi', 'SODA', 325],
      ['Canned Ginger Ale', 'SODA', 325],
      ['Bottled Pepsi', 'SODA', 425],
      ['Jarritos', 'SODA', 425],
      ['Bottled Water', 'NON_SODA_DRINK', 325],
      ['Iced Tea', 'NON_SODA_DRINK', 425],
      ['Juice', 'NON_SODA_DRINK', 425],
      ['Montellier Sparkling Water', 'NON_SODA_DRINK', 395],
      ['Fountain Soda', 'SODA', null],
      ['4 Canned Pepsi Drinks', 'SODA', 895],
      ['4 Bottled Pepsi Drinks', 'SODA', 1395],
      ['4 Jarritos', 'SODA', 1395],
    ].map(([name, taxClass, amount]) => ({
      ...product(
        String(name).toLowerCase().replaceAll(' ', '-'),
        String(name),
        'Drinks',
        amount === null ? null : Number(amount),
      ),
      taxClass: taxClass as Product['taxClass'],
      // BC Return-It: 10 cents per ready-to-drink container, 40 cents per four-pack.
      // https://www.return-it.ca/beverage/recycling/recycling-plastic-bottles/
      deposit: seed(name === 'Fountain Soda' ? 0 : String(name).startsWith('4 ') ? 40 : 10),
      enabled: name !== 'Fountain Soda', // Unlisted PG fountain price remains editable.
    })),
    {
      ...product(
        'corona-cero',
        'Corona Cero',
        'Drinks',
        695,
        false,
        'Check local availability & beverage tax class before enabling.',
      ),
      taxClass: 'NON_SODA_DRINK',
      deposit: seed(10),
      enabled: false,
    },
    product('churros', 'Churro Fries', 'Desserts', 395),
    product('cookie', 'Chocolate Chunk Cookies', 'Desserts', 295),
    product('mucho-churros', 'Mucho Churro Fries', 'Desserts', 1495),
    product('mucho-cookies', 'Mucho Cookies', 'Desserts', 1295),
    product(
      'signature-burrito',
      'Mucho’s Way Burrito',
      'More',
      1345,
      true,
      'Signature recipe. Choose your protein.',
    ),
    product('signature-bowl', 'Mucho’s Way Bowl', 'More', 1675, true),
    product('shiitake-burrito', 'Signature Shiitake Carnitas Burrito', 'More', 1075),
    product('shiitake-bowl', 'Signature Shiitake Carnitas Bowl', 'More', 1375),
    ...[
      ['burrito-bundle-4', 'Burrito Bundle · 4 pcs', 4995],
      ['burrito-bundle-6', 'Burrito Bundle · 6 pcs', 6995],
      ['burrito-bundle-10', 'Burrito Bundle · 10 pcs', 9495],
      ['bowl-bar', 'BYO Bowl Bar · Serves 4–6', 8400],
      ['taco-kit-4', 'Take Home Taco Kit · Serves 4', 5999],
      ['taco-kit-6', 'Take Home Taco Kit · Serves 6', 8499],
      ['taco-kit-8', 'Take Home Taco Kit · Serves 8', 10999],
    ].map(([id, name, amount]) => ({
      ...product(
        String(id),
        String(name),
        'More',
        Number(amount),
        false,
        'Standard bundle. Configure any premium variant as its own product.',
      ),
      enabled: false,
    })),
    {
      ...product('honey-chili-burrito', 'Honey Chili Pepper Chicken Burrito', 'More', 1670),
      lto: true,
    },
    { ...product('honey-chili-bowl', 'Honey Chili Pepper Chicken Bowl', 'More', 1800), lto: true },
    { ...product('limited-time', 'Limited-time Special', 'More', null), enabled: false, lto: true },
  ],
  proteins: [
    'Grilled Chicken',
    'Crispy Chicken',
    'Chorizo',
    'Ancho Ground Beef',
    'Pork Carnitas',
    'Veggies',
    'Steak',
    'Beef Barbacoa',
    'Shiitake Carnitas',
  ].map((name) => ({
    id: name.toLowerCase().replaceAll(' ', '-'),
    name,
    // Veggies corresponds to Fajita Veggies + No Protein, both included.
    price: seed(['Steak', 'Beef Barbacoa', 'Shiitake Carnitas'].includes(name) ? 295 : 0),
    enabled: true,
  })),
  extras: [
    { id: 'guacamole', name: 'Guacamole', price: seed(300), enabled: true },
    { id: 'queso', name: 'Queso', price: seed(300), enabled: true },
    // PG extra-protein group charges the same 375 cents for all eight proteins.
    { id: 'extra-protein', name: 'Extra Protein', price: seed(375), enabled: true },
    // Not offered as a paid modifier in either inspected PG delivery configurator.
    // Leave unknown and disabled rather than borrowing an unrelated cheese/queso price.
    { id: 'extra-cheese', name: 'Extra Cheese', price: unknown(), enabled: false },
    { id: 'honey-chili-sauce', name: 'Honey Chili Pepper Sauce', price: seed(125), enabled: true },
    { id: 'salsa-side', name: 'Salsa Side', price: seed(275), enabled: true },
  ],
})

// Quesadilla includes cheese/veggies, but its primary meat/shiitake costs 375 cents.
// Crispy Chicken is only listed as an extra protein, so omit it as a primary choice.
const quesadilla = defaultsV2.products.find((p) => p.id === 'quesadilla')!
quesadilla.proteinOverrides = Object.fromEntries(
  defaultsV2.proteins
    .filter((p) => p.id !== 'veggies' && p.id !== 'crispy-chicken')
    .map((p) => [p.id, { mode: 'adjustment', price: seed(375) }]),
)
quesadilla.excludedProteinIds = ['crispy-chicken']
quesadilla.excludedExtraIds = ['honey-chili-sauce', 'salsa-side']
for (const id of ['taco-solo', 'taco-trio']) {
  const taco = defaultsV2.products.find((p) => p.id === id)!
  const quantity = id === 'taco-trio' ? 3 : 1
  // The trio builder applies one protein to all three tacos; each nested PG group
  // charges 200 for steak/barbacoa or 375 for shiitake. Base: 545 + 990 = 1535.
  taco.proteinOverrides = {
    steak: { mode: 'adjustment', price: seed(200 * quantity) },
    'beef-barbacoa': { mode: 'adjustment', price: seed(200 * quantity) },
    'shiitake-carnitas': { mode: 'adjustment', price: seed(375 * quantity) },
  }
  taco.extraOverrides = { 'honey-chili-sauce': seed(125 * quantity) }
  taco.excludedProteinIds = ['crispy-chicken']
  taco.excludedExtraIds = ['guacamole', 'queso', 'extra-protein', 'extra-cheese', 'salsa-side']
}
defaultsV2.products.find((p) => p.id === 'mucho-burrito')!.excludedExtraIds = []
// MUCHO's Way builders expose the same proteins, but no standalone paid extras.
// The 1345-cent signature burrito is Small (Regular +200, Mucho +570).
for (const id of ['signature-burrito', 'signature-bowl'])
  defaultsV2.products.find((p) => p.id === id)!.excludedExtraIds = defaultsV2.extras.map(
    (e) => e.id,
  )
// Descriptions are retained in the schema for old/custom imports, never checkout copy.
defaultsV2.products.forEach((p) => {
  p.description = ''
})

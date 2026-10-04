import { z } from 'zod'

export const categories = [
  'Burritos',
  'Bowls / Salads',
  'Tacos',
  'Quesadilla',
  'Sides',
  'Drinks',
  'Desserts',
  'More',
] as const
export const taxClasses = ['FOOD', 'NON_SODA_DRINK', 'SODA', 'EXEMPT'] as const
export const MAX_CENTS = 1_000_000
const cents = z.number().int().min(0).max(MAX_CENTS)
const priceSchema = z
  .object({
    cents: cents.nullable(),
    verified: z.boolean(),
    source: z.enum(['online', 'unknown', 'store']),
  })
  .refine((p) => p.cents !== null || !p.verified, {
    message: 'An unknown price cannot be store verified',
  })
const modifierSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  price: priceSchema,
  enabled: z.boolean(),
  includedExtraIds: z.array(z.string()).max(50).default([]),
  bundle: z.object({ sodaCents: cents, deposit: priceSchema }).optional(),
})
export const productSchema = modifierSchema.extend({
  category: z.enum(categories),
  taxClass: z.enum(taxClasses),
  deposit: priceSchema,
  customizable: z.boolean(),
  lto: z.boolean(),
  description: z.string().max(160),
  proteinOverrides: z.record(
    z.string(),
    z.object({ mode: z.enum(['adjustment', 'total']), price: priceSchema }),
  ),
  extraOverrides: z.record(z.string(), priceSchema),
  excludedProteinIds: z.array(z.string()).max(50).default([]),
  excludedExtraIds: z.array(z.string()).max(50).default([]),
  proteinOptional: z.boolean().default(false),
})
export const configSchema = z
  .object({
    version: z.literal(1),
    // Default data has its own revision; v1 exports remain readable.
    defaultsVersion: z.number().int().min(1).max(4).default(1),
    products: z.array(productSchema).max(500),
    proteins: z.array(modifierSchema).max(50),
    extras: z.array(modifierSchema).max(50),
    taxes: z.object({
      gstBasisPoints: z.number().int().min(0).max(10000),
      pstBasisPoints: z.number().int().min(0).max(10000),
    }),
  })
  .superRefine((c, ctx) => {
    for (const key of ['products', 'proteins', 'extras'] as const) {
      if (new Set(c[key].map((p) => p.id)).size !== c[key].length)
        ctx.addIssue({ code: 'custom', message: `Duplicate ${key} IDs` })
    }
  })
export type Price = z.infer<typeof priceSchema>
export type Product = z.infer<typeof productSchema>
export type Modifier = z.infer<typeof modifierSchema>
export type Config = z.infer<typeof configSchema>
export type Category = (typeof categories)[number]
export const lineSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  proteinId: z.string().optional(),
  extraIds: z.array(z.string()),
  details: z.array(z.object({ name: z.string(), cents: cents })),
  unitCents: cents,
  depositCents: cents,
  sodaCents: cents.default(0),
  taxClass: z.enum(taxClasses),
  quantity: z.number().int().min(1).max(99),
})
export type Line = z.input<typeof lineSchema>
export const totalsSchema = z
  .object({
    subtotal: cents,
    gst: cents,
    pst: cents,
    deposits: cents,
    rounding: z.number().int().min(-2).max(2),
    cash: cents,
    exact: cents.optional(),
  })
  .transform((t) => ({ ...t, exact: t.exact ?? t.cash - t.rounding }))
export type Totals = z.infer<typeof totalsSchema>
export const denominationSchema = z.object({
  cents: cents.positive(),
  count: z.number().int().positive(),
  label: z.string(),
})
export const historySchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  lines: z.array(lineSchema).max(100),
  totals: totalsSchema,
  tendered: cents,
  change: cents,
  breakdown: z.array(denominationSchema),
  paymentMethod: z.enum(['CASH', 'E_TRANSFER']).default('CASH'),
})
export type CompletedOrder = z.infer<typeof historySchema>
export function unknown(): Price {
  return { cents: null, verified: false, source: 'unknown' }
}
export function verified(cents: number): Price {
  return { cents, verified: true, source: 'store' }
}

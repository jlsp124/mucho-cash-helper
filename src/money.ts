import type { Config, Line, Product, Totals } from './model'
import { MAX_CENTS, unknown } from './model'

export const money = (cents: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100)
export function parseMoney(input: string): number | null {
  const text = input.trim()
  if (!/^(?:\d{1,5}(?:\.\d{0,2})?|\.\d{1,2})$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return value <= MAX_CENTS ? value : null
}
export function roundTax(cents: number, basisPoints: number) {
  if (
    !Number.isSafeInteger(cents) ||
    cents < 0 ||
    !Number.isInteger(basisPoints) ||
    basisPoints < 0 ||
    basisPoints > 10000
  )
    throw new Error('Invalid tax amount')
  return Math.floor((cents * basisPoints + 5000) / 10000)
}
export function cashRound(cents: number) {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Invalid cash amount')
  return Math.floor((cents + 2) / 5) * 5
}
export function calculateTotals(lines: Line[], taxes: Config['taxes']): Totals {
  let subtotal = 0,
    gstBase = 0,
    pstBase = 0,
    deposits = 0
  for (const line of lines) {
    const value = line.unitCents * line.quantity
    subtotal += value
    deposits += line.depositCents * line.quantity
    if (line.taxClass !== 'EXEMPT') gstBase += value
    if (line.taxClass === 'SODA') pstBase += value
  }
  const gst = roundTax(gstBase, taxes.gstBasisPoints),
    pst = roundTax(pstBase, taxes.pstBasisPoints)
  const exact = subtotal + gst + pst + deposits,
    cash = cashRound(exact)
  if (cash > MAX_CENTS) throw new Error('Order exceeds $10,000 limit. Split this order.')
  return { subtotal, gst, pst, deposits, cash, rounding: cash - exact }
}
export const denominations = [
  { cents: 10000, label: '$100 bill' },
  { cents: 5000, label: '$50 bill' },
  { cents: 2000, label: '$20 bill' },
  { cents: 1000, label: '$10 bill' },
  { cents: 500, label: '$5 bill' },
  { cents: 200, label: '$2 coin' },
  { cents: 100, label: '$1 coin' },
  { cents: 25, label: '25¢' },
  { cents: 10, label: '10¢' },
  { cents: 5, label: '5¢' },
]
export function changeBreakdown(cents: number) {
  if (!Number.isSafeInteger(cents) || cents < 0 || cents % 5 !== 0)
    throw new Error('Cash change must be a nonnegative multiple of 5¢')
  let remaining = cents
  return denominations.flatMap((d) => {
    const count = Math.floor(remaining / d.cents)
    remaining %= d.cents
    return count ? [{ ...d, count }] : []
  })
}
export function getProteinPrice(product: Product, id: string, config: Config) {
  return (
    product.proteinOverrides[id] ?? {
      mode: 'adjustment' as const,
      price: config.proteins.find((p) => p.id === id)?.price ?? unknown(),
    }
  )
}
export function getExtraPrice(product: Product, id: string, config: Config) {
  return product.extraOverrides[id] ?? config.extras.find((e) => e.id === id)?.price ?? unknown()
}
export function itemPrice(
  product: Product,
  proteinId: string | undefined,
  extraIds: string[],
  config: Config,
): number | null {
  const protein = proteinId ? getProteinPrice(product, proteinId, config) : null
  let result = protein?.mode === 'total' ? protein.price.cents : product.price.cents
  if (
    result === null ||
    (product.customizable && !protein) ||
    protein?.price.cents === null ||
    product.deposit.cents === null
  )
    return null
  if (protein?.mode === 'adjustment') result += protein.price.cents!
  for (const id of extraIds) {
    const amount = getExtraPrice(product, id, config).cents
    if (amount === null) return null
    result += amount
  }
  return result <= MAX_CENTS ? result : null
}

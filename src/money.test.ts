import { describe, expect, it } from 'vitest'
import {
  calculateTotals,
  cashRound,
  changeBreakdown,
  getProteinPrice,
  itemPrice,
  parseMoney,
  roundTax,
} from './money'
import { freshDefaults } from './menu'
import { type Line, unknown, verified } from './model'

const taxes = { gstBasisPoints: 500, pstBasisPoints: 700 }
const line = (
  unitCents: number,
  taxClass: Line['taxClass'] = 'FOOD',
  depositCents = 0,
  quantity = 1,
): Line => ({
  id: 'test',
  productId: 'test',
  name: 'Test',
  extraIds: [],
  details: [],
  quantity,
  unitCents,
  taxClass,
  depositCents,
})
describe('Canadian cash rounding', () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 5],
    [4, 5],
    [5, 5],
    [6, 5],
    [7, 5],
    [8, 10],
    [9, 10],
    [10, 10],
    [99, 100],
    [98, 100],
    [101, 100],
    [102, 100],
    [103, 105],
    [10099, 10100],
  ])('%i cents rounds to %i', (amount, expected) => expect(cashRound(amount)).toBe(expected))
  it('rejects fractional and negative cents', () => {
    expect(() => cashRound(-1)).toThrow()
    expect(() => cashRound(1.5)).toThrow()
  })
})
describe('change', () => {
  it('returns the exact requested $13.65 breakdown', () => {
    expect(changeBreakdown(5000 - 3635).map((d) => [d.cents, d.count])).toEqual([
      [1000, 1],
      [200, 1],
      [100, 1],
      [25, 2],
      [10, 1],
      [5, 1],
    ])
  })
  it('handles exact cash', () => expect(changeBreakdown(0)).toEqual([]))
  it('rejects pennies and insufficient tender differences', () => {
    expect(() => changeBreakdown(1)).toThrow()
    expect(() => changeBreakdown(-5)).toThrow()
  })
  it('uses minimal pieces for every nickel up to $100', () => {
    const denoms = [10000, 5000, 2000, 1000, 500, 200, 100, 25, 10, 5]
    const optimal = Array(2001).fill(Infinity)
    optimal[0] = 0
    for (let i = 1; i <= 2000; i++) {
      optimal[i] = Math.min(...denoms.filter((d) => d / 5 <= i).map((d) => optimal[i - d / 5] + 1))
      const result = changeBreakdown(i * 5)
      expect(result.reduce((n, d) => n + d.count, 0)).toBe(optimal[i])
      expect(result.reduce((n, d) => n + d.cents * d.count, 0)).toBe(i * 5)
    }
  })
})
describe('taxes and refundable deposits', () => {
  it('exposes the exact electronic total independently of nickel-rounded cash', () => {
    expect(calculateTotals([line(1784)], taxes)).toMatchObject({
      exact: 1873,
      cash: 1875,
      rounding: 2,
    })
    expect(calculateTotals([line(1431)], taxes)).toMatchObject({
      exact: 1503,
      cash: 1505,
      rounding: 2,
    })
  })
  it('food only: GST, no PST', () =>
    expect(calculateTotals([line(1545)], taxes)).toEqual({
      subtotal: 1545,
      gst: 77,
      pst: 0,
      deposits: 0,
      rounding: -2,
      exact: 1622,
      cash: 1620,
    }))
  it('soda only: GST and PST', () =>
    expect(calculateTotals([line(250, 'SODA')], taxes)).toEqual({
      subtotal: 250,
      gst: 13,
      pst: 18,
      deposits: 0,
      rounding: -1,
      exact: 281,
      cash: 280,
    }))
  it('mixed food + soda: PST only on soda', () =>
    expect(calculateTotals([line(1545), line(250, 'SODA')], taxes)).toEqual({
      subtotal: 1795,
      gst: 90,
      pst: 18,
      deposits: 0,
      rounding: 2,
      exact: 1903,
      cash: 1905,
    }))
  it('non-soda beverage: no PST', () =>
    expect(calculateTotals([line(250, 'NON_SODA_DRINK')], taxes)).toEqual({
      subtotal: 250,
      gst: 13,
      pst: 0,
      deposits: 0,
      rounding: 2,
      exact: 263,
      cash: 265,
    }))
  it('deposits are separate and untaxed', () =>
    expect(calculateTotals([line(250, 'SODA', 10, 2)], taxes)).toEqual({
      subtotal: 500,
      gst: 25,
      pst: 35,
      deposits: 20,
      rounding: 0,
      exact: 580,
      cash: 580,
    }))
  it('exempt class and configured tax rates', () => {
    expect(calculateTotals([line(1000, 'EXEMPT')], taxes).gst).toBe(0)
    expect(calculateTotals([line(1000)], { ...taxes, gstBasisPoints: 600 }).gst).toBe(60)
  })
  it('rounds half cents up explicitly', () => {
    expect(roundTax(10, 500)).toBe(1)
    expect(roundTax(9, 500)).toBe(0)
    expect(roundTax(250, 700)).toBe(18)
  })
  it('rounds aggregate taxable bases, not individual products', () =>
    expect(calculateTotals([line(9), line(9)], taxes)).toEqual({
      subtotal: 18,
      gst: 1,
      pst: 0,
      deposits: 0,
      rounding: 1,
      exact: 19,
      cash: 20,
    }))
  it('does not nickel-round each tax line', () =>
    expect(calculateTotals([line(125, 'SODA')], taxes)).toEqual({
      subtotal: 125,
      gst: 6,
      pst: 9,
      deposits: 0,
      rounding: 0,
      exact: 140,
      cash: 140,
    }))
  it('limits excessive orders without overflow', () =>
    expect(() => calculateTotals([line(1000000)], taxes)).toThrow('limit'))
})
describe('decimal parsing', () => {
  it.each([
    ['15.45', 1545],
    ['0', 0],
    ['.50', 50],
    ['5.1', 510],
    ['50.00', 5000],
    ['10000', 1000000],
    ['10000.01', null],
    ['1.234', null],
    ['1e3', null],
    ['-1', null],
    ['NaN', null],
    ['', null],
  ])('%s → %s', (input, expected) => expect(parseMoney(input)).toBe(expected))
})
describe('flexible item pricing', () => {
  it('never assumes an unknown protein is included', () => {
    const c = freshDefaults(),
      p = c.products.find((p) => p.id === 'regular-burrito')!
    c.proteins.find((p) => p.id === 'grilled-chicken')!.price = unknown()
    expect(itemPrice(p, 'grilled-chicken', [], c)).toBeNull()
    expect(itemPrice(p, undefined, [], c)).toBeNull()
  })
  it('prices proteins independently and applies extras', () => {
    const c = freshDefaults(),
      p = c.products.find((p) => p.id === 'regular-burrito')!
    c.proteins.find((p) => p.id === 'grilled-chicken')!.price = verified(0)
    c.proteins.find((p) => p.id === 'beef-barbacoa')!.price = verified(275)
    c.proteins.find((p) => p.id === 'steak')!.price = verified(325)
    c.extras[0].price = verified(150)
    c.extras[1].price = unknown()
    expect(itemPrice(p, 'grilled-chicken', [], c)).toBe(1245)
    expect(itemPrice(p, 'beef-barbacoa', [], c)).toBe(1520)
    expect(itemPrice(p, 'steak', [c.extras[0].id], c)).toBe(1720)
    expect(itemPrice(p, 'steak', [c.extras[1].id], c)).toBeNull()
  })
  it('product/size upcharge overrides global, including explicit unknown', () => {
    const c = freshDefaults(),
      p = c.products.find((p) => p.id === 'mucho-burrito')!
    c.proteins[0].price = verified(100)
    p.proteinOverrides[c.proteins[0].id] = { mode: 'adjustment', price: verified(350) }
    expect(itemPrice(p, c.proteins[0].id, [], c)).toBe(1925)
    p.proteinOverrides[c.proteins[0].id].price.cents = null
    expect(itemPrice(p, c.proteins[0].id, [], c)).toBeNull()
    expect(getProteinPrice(p, c.proteins[0].id, c).price.cents).toBeNull()
  })
  it('full protein price replaces the base, even if base is unknown', () => {
    const c = freshDefaults(),
      p = c.products[0]
    p.price.cents = null
    p.proteinOverrides[c.proteins[0].id] = { mode: 'total', price: verified(2000) }
    p.extraOverrides[c.extras[0].id] = verified(175)
    expect(itemPrice(p, c.proteins[0].id, [c.extras[0].id], c)).toBe(2175)
  })
  it('blocks unknown deposits rather than silently dropping them', () => {
    const c = freshDefaults(),
      p = c.products.find((p) => p.id === 'canned-pepsi')!
    p.price = verified(250)
    p.deposit = unknown()
    expect(itemPrice(p, undefined, [], c)).toBeNull()
    p.deposit = verified(0)
    expect(itemPrice(p, undefined, [], c)).toBe(250)
  })
})

import { expect, it } from 'vitest'
import { decodeState, importConfig, initialState, serializeConfig } from './storage'
import { freshDefaults } from './menu'
import { verified } from './model'
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
  const raw = JSON.stringify(c).replace('"cents":1345', `"cents":${JSON.stringify(value)}`)
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

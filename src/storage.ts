import { z } from 'zod'
import {
  configSchema,
  historySchema,
  lineSchema,
  type Config,
  type CompletedOrder,
  type Line,
} from './model'
import { freshDefaults } from './menu'

export const STORAGE_KEY = 'mucho-cash-helper:v1'
const stateSchema = z.object({
  version: z.literal(1),
  config: configSchema,
  history: z.array(historySchema).max(20),
  cart: z.array(lineSchema).max(100),
})
export type SavedState = { version: 1; config: Config; history: CompletedOrder[]; cart: Line[] }
export function initialState(): SavedState {
  return { version: 1, config: freshDefaults(), history: [], cart: [] }
}
export function decodeState(raw: string | null): { state: SavedState; warning: string | null } {
  if (!raw) return { state: initialState(), warning: null }
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = stateSchema.safeParse(parsed)
    if (result.success) return { state: result.data, warning: null }
    // Recover valid independent sections of a damaged/older record; never guess prices.
    const record = z
      .object({
        config: z.unknown().optional(),
        history: z.unknown().optional(),
        cart: z.unknown().optional(),
      })
      .safeParse(parsed)
    const fallback = initialState()
    if (record.success) {
      const config = configSchema.safeParse(record.data.config)
      const history = z.array(historySchema).safeParse(record.data.history)
      const cart = z.array(lineSchema).max(100).safeParse(record.data.cart)
      if (config.success) fallback.config = config.data
      if (history.success) fallback.history = history.data.slice(0, 20)
      if (cart.success) fallback.cart = cart.data
    }
    return {
      state: fallback,
      warning: 'Some saved data could not be read. Check Settings before checkout.',
    }
  } catch {
    return {
      state: initialState(),
      warning: 'Saved data could not be read. Shipped defaults restored; verify your prices.',
    }
  }
}
export function loadState() {
  try {
    return decodeState(localStorage.getItem(STORAGE_KEY))
  } catch {
    return {
      state: initialState(),
      warning: 'Device storage is unavailable. Changes will last only this session.',
    }
  }
}
export function serializeConfig(config: Config) {
  return JSON.stringify(configSchema.parse(config), null, 2)
}
export function importConfig(raw: string): Config {
  if (raw.length > 2_000_000) throw new Error('Configuration file is too large')
  return configSchema.parse(JSON.parse(raw))
}

import { z } from 'zod'
import {
  configSchema,
  historySchema,
  lineSchema,
  type Config,
  type CompletedOrder,
  type Line,
} from './model'
import { DEFAULTS_VERSION, freshDefaults } from './menu'
import { legacyDefaults } from './legacy-defaults'

export function migrateConfig(config: Config): Config {
  if (config.defaultsVersion >= DEFAULTS_VERSION) return config
  const next = freshDefaults()
  const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  // Compare each field with the frozen v1 baseline. Untouched shipped fields get
  // current data; explicit prices (including store zero), flags, overrides and
  // custom entries survive. Omitted old items in an imported menu stay omitted.
  for (const key of ['products', 'proteins', 'extras'] as const) {
    const oldItems = legacyDefaults[key]
    const currentItems = next[key]
    const migrated = config[key].map((saved) => {
      const old = oldItems.find((item) => item.id === saved.id)
      const current = currentItems.find((item) => item.id === saved.id)
      if (!old || !current) return saved
      const fields = { ...saved } as Record<string, unknown>
      for (const field of Object.keys(current)) {
        const before = (old as unknown as Record<string, unknown>)[field]
        const value = (saved as unknown as Record<string, unknown>)[field]
        const updated = (current as unknown as Record<string, unknown>)[field]
        if (field === 'proteinOverrides' || field === 'extraOverrides') {
          fields[field] = { ...(updated as object), ...(value as object) }
        } else if (equal(value, before)) {
          // Do not hide a formerly unpriced item the user intentionally priced.
          if (field === 'enabled' && saved.price.cents !== null && saved.price.source === 'store')
            continue
          fields[field] = updated
        }
      }
      return fields
    })
    for (const item of currentItems) {
      if (
        migrated.length < (key === 'products' ? 500 : 50) &&
        !oldItems.some((old) => old.id === item.id) &&
        !migrated.some((saved) => saved.id === item.id)
      )
        migrated.push(item)
    }
    // Parse again below rather than trusting an unchecked merge.
    Object.assign(next, { [key]: migrated })
  }
  next.taxes = config.taxes
  return configSchema.parse(next)
}

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
    if (result.success)
      return { state: { ...result.data, config: migrateConfig(result.data.config) }, warning: null }
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
      if (config.success) fallback.config = migrateConfig(config.data)
      if (history.success) fallback.history = history.data.slice(0, 20)
      if (cart.success) fallback.cart = cart.data
    }
    return {
      state: fallback,
      warning: 'Some saved data could not be restored.',
    }
  } catch {
    return {
      state: initialState(),
      warning: 'Saved data could not be read. Menu defaults restored.',
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
  return migrateConfig(configSchema.parse(JSON.parse(raw)))
}

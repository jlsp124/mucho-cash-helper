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
import { defaultsV2 } from './defaults-v2'
import { defaultsV3 } from './defaults-v3'
import { priceLine } from './money'

export function migrateConfig(config: Config): Config {
  if (config.defaultsVersion >= DEFAULTS_VERSION) return config
  const next = freshDefaults()
  const baseline =
    config.defaultsVersion === 1
      ? legacyDefaults
      : config.defaultsVersion === 2
        ? defaultsV2
        : defaultsV3
  const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  // Compare each field with the appropriate frozen baseline. Untouched fields get
  // current data; explicit prices (including store zero), flags, overrides and
  // custom entries survive. Omitted old items in an imported menu stay omitted.
  for (const key of ['products', 'proteins', 'extras'] as const) {
    const oldItems = baseline[key]
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
          const previous = before as Record<string, unknown>
          const savedMap = value as Record<string, unknown>
          const currentMap = updated as Record<string, unknown>
          const merged: Record<string, unknown> = {}
          for (const id of new Set([...Object.keys(savedMap), ...Object.keys(currentMap)])) {
            if (id in savedMap) {
              if (!equal(savedMap[id], previous[id])) merged[id] = savedMap[id]
              else if (id in currentMap) merged[id] = currentMap[id]
            } else if (!(id in previous)) merged[id] = currentMap[id]
          }
          fields[field] = merged
        } else if (equal(value, before)) {
          // V3 shipped these items disabled. Restore only untouched records:
          // edits to the product are evidence its availability may be deliberate.
          // V3 had no flag distinguishing a manual false from the shipped false.
          if (
            field === 'enabled' &&
            config.defaultsVersion === 3 &&
            !old.enabled &&
            current.enabled &&
            !equal(saved, old)
          )
            continue
          // Do not hide a formerly unpriced item the user intentionally priced.
          if (
            field === 'enabled' &&
            old.price.cents === null &&
            saved.price.cents !== null &&
            saved.price.source === 'store'
          )
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
function upgradeState(state: SavedState): SavedState {
  const config = migrateConfig(state.config)
  if (config === state.config) return state
  // V4 changes availability only; preserve existing v3 cart snapshots verbatim.
  if (state.config.defaultsVersion >= 3) return { ...state, config }
  // Refresh only active lines that still match the saved menu. Historical paid
  // receipts and manually altered snapshots retain their original amounts.
  const cart = state.cart.map((line) => {
    const before = state.config.products.find((p) => p.id === line.productId)
    const afterId =
      line.productId === 'quesadilla' && line.proteinId === 'veggies'
        ? 'veggie-quesadilla'
        : line.productId
    const after = config.products.find((p) => p.id === afterId)
    if (!before || !after) return line
    const previous = priceLine(before, line.proteinId, line.extraIds, state.config)
    if (
      !previous ||
      previous.unitCents !== line.unitCents ||
      previous.depositCents !== line.depositCents
    )
      return line
    const updated = priceLine(after, line.proteinId, line.extraIds, config)
    return updated
      ? { ...line, ...updated, name: after.name, productId: afterId, taxClass: after.taxClass }
      : line
  })
  return { ...state, config, cart }
}
export function initialState(): SavedState {
  return { version: 1, config: freshDefaults(), history: [], cart: [] }
}
export function decodeState(raw: string | null): { state: SavedState; warning: string | null } {
  if (!raw) return { state: initialState(), warning: null }
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = stateSchema.safeParse(parsed)
    if (result.success) return { state: upgradeState(result.data), warning: null }
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
      state: upgradeState(fallback),
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

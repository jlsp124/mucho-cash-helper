import { useRef, useState } from 'react'
import { ArrowLeft, ChevronRight, Copy, Download, Plus, Search, Upload } from 'lucide-react'
import {
  categories,
  taxClasses,
  unknown,
  verified,
  configSchema,
  type Config,
  type Product,
  type Modifier,
} from './model'
import { freshDefaults } from './menu'
import { importConfig, serializeConfig } from './storage'
import { money, parseMoney } from './money'
import { PriceEditor, PriceStatus, Sheet } from './ui'

type Tab = 'Products' | 'Proteins' | 'Extras' | 'Transfer' | 'About'
export function Settings({
  config,
  onChange,
  onClose,
  clearHistory,
  notify,
}: {
  config: Config
  onChange: (c: Config) => void
  onClose: () => void
  clearHistory: () => void
  notify: (text: string) => void
}) {
  const [tab, setTab] = useState<Tab>('Products')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [modifier, setModifier] = useState<Modifier | null>(null)
  const [confirm, setConfirm] = useState<'reset' | 'history' | 'import' | null>(null)
  const [pendingImport, setPendingImport] = useState<Config | null>(null)
  const [error, setError] = useState('')
  const [taxText, setTaxText] = useState({
    gst: (config.taxes.gstBasisPoints / 100).toFixed(2),
    pst: (config.taxes.pstBasisPoints / 100).toFixed(2),
  })
  const fileRef = useRef<HTMLInputElement>(null)
  const rawRef = useRef<HTMLTextAreaElement>(null)
  const [paste, setPaste] = useState('')
  const [fallback, setFallback] = useState(false)
  function saveConfig(next: Config) {
    onChange(next)
    setTaxText({
      gst: (next.taxes.gstBasisPoints / 100).toFixed(2),
      pst: (next.taxes.pstBasisPoints / 100).toFixed(2),
    })
  }
  function stageImport(raw: string) {
    try {
      setPendingImport(importConfig(raw))
      setConfirm('import')
      setError('')
    } catch {
      setError(
        'Invalid configuration. Use an exported v1 menu JSON with valid prices and unique IDs. Nothing was changed.',
      )
    }
  }
  function saveProduct() {
    if (!editing) return
    const next = {
      ...config,
      products: config.products.some((p) => p.id === editing.id)
        ? config.products.map((p) => (p.id === editing.id ? editing : p))
        : [...config.products, editing],
    }
    if (!configSchema.safeParse(next).success) {
      setError('Check the product name and prices. Nothing was saved.')
      return
    }
    saveConfig(next)
    setEditing(null)
    notify('Product saved on this phone')
  }
  function updateProduct(p: Partial<Product>) {
    setEditing((previous) => (previous ? { ...previous, ...p } : null))
  }
  const unknownCount = [
    ...config.products
      .filter((p) => p.enabled)
      .flatMap((p) => [
        p.price,
        p.deposit,
        ...Object.values(p.proteinOverrides).map((o) => o.price),
        ...Object.values(p.extraOverrides),
      ]),
    ...config.proteins.filter((p) => p.enabled).map((p) => p.price),
    ...config.extras.filter((p) => p.enabled).map((p) => p.price),
  ].filter((p) => !p.verified).length
  return (
    <Sheet
      title={editing ? 'Edit product' : modifier ? 'Edit modifier' : 'Settings'}
      onClose={onClose}
      wide
    >
      <div className="sheet-content settings">
        {(editing || modifier) && (
          <button
            className="text-button"
            onClick={() => {
              setEditing(null)
              setModifier(null)
              setError('')
            }}
          >
            <ArrowLeft size={18} />
            Menu & pricing
          </button>
        )}
        {!editing && !modifier && (
          <>
            <div className="settings-intro">
              <span className="eyebrow">YOUR STORE. YOUR PRICES.</span>
              <h3>Menu & pricing</h3>
              <p>Online seeds need a store check. Unknown values are never treated as free.</p>
              <span className="verification-note">{unknownCount} entries need verification</span>
            </div>
            <div className="settings-tabs" role="tablist" aria-label="Settings sections">
              {(['Products', 'Proteins', 'Extras', 'Transfer', 'About'] as Tab[]).map((t) => (
                <button
                  role="tab"
                  aria-selected={tab === t}
                  key={t}
                  className={tab === t ? 'active' : ''}
                  onClick={() => {
                    setTab(t)
                    setSearch('')
                    setError('')
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveProduct()
            }}
          >
            <label className="field">
              Product name
              <input
                required
                maxLength={100}
                value={editing.name}
                onChange={(e) => updateProduct({ name: e.target.value })}
              />
            </label>
            <div className="field-grid">
              <label className="field">
                Category
                <select
                  value={editing.category}
                  onChange={(e) =>
                    updateProduct({ category: e.target.value as Product['category'] })
                  }
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Tax class
                <select
                  value={editing.taxClass}
                  onChange={(e) =>
                    updateProduct({ taxClass: e.target.value as Product['taxClass'] })
                  }
                >
                  {taxClasses.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <PriceEditor
              key={`${editing.id}-base`}
              label="Base price"
              value={editing.price}
              onChange={(price) => updateProduct({ price })}
            />
            <PriceEditor
              key={`${editing.id}-deposit`}
              label="Refundable deposit"
              value={editing.deposit}
              onChange={(deposit) => updateProduct({ deposit })}
            />
            <label className="check-label">
              <input
                type="checkbox"
                checked={editing.enabled}
                onChange={(e) => updateProduct({ enabled: e.target.checked })}
              />
              Enabled on menu
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={editing.lto}
                onChange={(e) => updateProduct({ lto: e.target.checked })}
              />
              Limited-time offer
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={editing.customizable}
                onChange={(e) => updateProduct({ customizable: e.target.checked })}
              />
              Choose protein & paid extras
            </label>
            {editing.customizable && (
              <details className="advanced">
                <summary>Protein prices for this product / size</summary>
                <p className="muted">
                  Global upcharges are used unless overridden. “Full price” replaces the base plus
                  protein.
                </p>
                {config.proteins.map((p) => {
                  const override = editing.proteinOverrides[p.id]
                  return (
                    <div className="override" key={p.id}>
                      <label className="field">
                        {p.name}
                        <select
                          aria-label={`${p.name} pricing mode`}
                          value={override?.mode ?? 'inherit'}
                          onChange={(e) => {
                            const proteinOverrides = { ...editing.proteinOverrides }
                            if (e.target.value === 'inherit') delete proteinOverrides[p.id]
                            else
                              proteinOverrides[p.id] = {
                                mode: e.target.value as 'adjustment' | 'total',
                                price: unknown(),
                              }
                            updateProduct({ proteinOverrides })
                          }}
                        >
                          <option value="inherit">Use global upcharge</option>
                          <option value="adjustment">Product upcharge</option>
                          <option value="total">Full entrée price</option>
                        </select>
                      </label>
                      {override && (
                        <PriceEditor
                          key={`${p.id}-${override.mode}`}
                          label={`${p.name} ${override.mode === 'total' ? 'full price' : 'upcharge'}`}
                          value={override.price}
                          onChange={(price) =>
                            updateProduct({
                              proteinOverrides: {
                                ...editing.proteinOverrides,
                                [p.id]: { ...override, price },
                              },
                            })
                          }
                        />
                      )}
                    </div>
                  )
                })}
              </details>
            )}
            {editing.customizable && (
              <details className="advanced">
                <summary>Paid extras for this product / size</summary>
                {config.extras.map((extra) => {
                  const override = editing.extraOverrides[extra.id]
                  return (
                    <div className="override" key={extra.id}>
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={!!override}
                          onChange={(e) => {
                            const extraOverrides = { ...editing.extraOverrides }
                            if (e.target.checked) extraOverrides[extra.id] = unknown()
                            else delete extraOverrides[extra.id]
                            updateProduct({ extraOverrides })
                          }}
                        />
                        Override {extra.name}
                      </label>
                      {override && (
                        <PriceEditor
                          label={`${extra.name} product price`}
                          value={override}
                          onChange={(price) =>
                            updateProduct({
                              extraOverrides: { ...editing.extraOverrides, [extra.id]: price },
                            })
                          }
                        />
                      )}
                    </div>
                  )
                })}
              </details>
            )}
            <button className="button primary full" type="submit">
              Save product
            </button>
          </form>
        ) : modifier ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const key = tab === 'Proteins' ? 'proteins' : 'extras'
              const next = {
                ...config,
                [key]: config[key].some((p) => p.id === modifier.id)
                  ? config[key].map((p) => (p.id === modifier.id ? modifier : p))
                  : [...config[key], modifier],
              }
              if (!configSchema.safeParse(next).success) {
                setError('Check the name and price.')
                return
              }
              saveConfig(next)
              setModifier(null)
              notify('Modifier saved')
            }}
          >
            <label className="field">
              Name
              <input
                required
                maxLength={100}
                value={modifier.name}
                onChange={(e) => setModifier({ ...modifier, name: e.target.value })}
              />
            </label>
            <PriceEditor
              label={tab === 'Proteins' ? 'Global protein upcharge' : 'Extra price'}
              value={modifier.price}
              onChange={(price) => setModifier({ ...modifier, price })}
            />
            <p className="muted">
              Enter 0 only if included at the store. Product-specific overrides take priority.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={modifier.enabled}
                onChange={(e) => setModifier({ ...modifier, enabled: e.target.checked })}
              />
              Enabled
            </label>
            <button className="button primary full">Save modifier</button>
          </form>
        ) : (
          <>
            {['Products', 'Proteins', 'Extras'].includes(tab) && (
              <>
                <label className="search-field">
                  <Search size={19} />
                  <input
                    aria-label="Search menu settings"
                    placeholder={`Search ${tab.toLowerCase()}…`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <div className="editor-list">
                  {(tab === 'Products'
                    ? config.products
                    : tab === 'Proteins'
                      ? config.proteins
                      : config.extras
                  )
                    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
                    .map((p) => (
                      <button
                        className="editor-row"
                        key={p.id}
                        onClick={() => {
                          setError('')
                          if (tab === 'Products') setEditing(structuredClone(p as Product))
                          else setModifier(structuredClone(p))
                        }}
                      >
                        <div>
                          <strong>{p.name}</strong>
                          <PriceStatus price={p.price} />
                          {!p.enabled && <span className="muted">Disabled</span>}
                          {'lto' in p && Boolean(p.lto) && <span className="tag">LTO</span>}
                        </div>
                        <span className="editor-price">
                          {p.price.cents === null ? 'Set price' : money(p.price.cents)}
                          <ChevronRight size={17} />
                        </span>
                      </button>
                    ))}
                </div>
                <button
                  className="button secondary full"
                  onClick={() => {
                    const id = crypto.randomUUID()
                    setError('')
                    if (tab === 'Products')
                      setEditing({
                        id,
                        name: '',
                        price: unknown(),
                        enabled: true,
                        category: 'More',
                        taxClass: 'FOOD',
                        deposit: verified(0),
                        customizable: false,
                        lto: false,
                        description: '',
                        proteinOverrides: {},
                        extraOverrides: {},
                      })
                    else setModifier({ id, name: '', price: unknown(), enabled: true })
                  }}
                >
                  <Plus size={20} />
                  Add{' '}
                  {tab === 'Products'
                    ? 'custom product'
                    : tab === 'Proteins'
                      ? 'protein'
                      : 'paid extra'}
                </button>
              </>
            )}
            {tab === 'Transfer' && (
              <div className="transfer">
                <h3>Same setup, another phone.</h3>
                <p>
                  Transfer the menu, modifiers, deposits and tax settings. Orders and history stay
                  on this device.
                </p>
                <button
                  className="button secondary full"
                  onClick={() => {
                    const blob = new Blob([serializeConfig(config)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = 'mucho-cash-config.json'
                    link.click()
                    setTimeout(() => URL.revokeObjectURL(url), 1000)
                  }}
                >
                  <Download size={20} />
                  Export configuration JSON
                </button>
                <button
                  className="button secondary full"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(serializeConfig(config))
                      notify('Configuration copied')
                    } catch {
                      setFallback(true)
                      setTimeout(() => {
                        rawRef.current?.focus()
                        rawRef.current?.select()
                      }, 0)
                    }
                  }}
                >
                  <Copy size={20} />
                  Copy configuration
                </button>
                {fallback && (
                  <label className="field">
                    Copy this configuration
                    <textarea ref={rawRef} readOnly value={serializeConfig(config)} />
                  </label>
                )}
                <button className="button secondary full" onClick={() => fileRef.current?.click()}>
                  <Upload size={20} />
                  Import configuration JSON
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > 2_000_000) setError('File is too large.')
                      else {
                        try {
                          stageImport(await file.text())
                        } catch {
                          setError(
                            'Could not read the file. Try pasting the exported configuration.',
                          )
                        }
                      }
                    }
                    e.target.value = ''
                  }}
                />
                <label className="field">
                  Or paste configuration
                  <textarea
                    value={paste}
                    placeholder="Paste exported JSON"
                    onChange={(e) => setPaste(e.target.value)}
                  />
                </label>
                <button
                  className="button secondary full"
                  disabled={!paste.trim()}
                  onClick={() => stageImport(paste)}
                >
                  Review pasted configuration
                </button>
                <div className="danger-zone">
                  <button className="button danger full" onClick={() => setConfirm('reset')}>
                    Reset to shipped defaults
                  </button>
                  <button className="button danger full" onClick={() => setConfirm('history')}>
                    Clear local history
                  </button>
                </div>
              </div>
            )}
            {tab === 'About' && (
              <div className="about">
                <span className="brand-mark">
                  m<span>+</span>
                </span>
                <h3>Mucho Cash Helper</h3>
                <p>
                  Unofficial internal cash-calculation helper for Prince George, BC. Not an official
                  Mucho Burrito POS.
                </p>
                <p>
                  No accounts, customer data, card payments or cash-drawer connection. Menu, active
                  order and the last 20 receipts stay on this phone.
                </p>
                <h4>Before relying on these prices</h4>
                <p>
                  Public online menu prices are initial seeds only. Compare them with the actual
                  store register. Unlisted prices, protein upcharges, extras and bottle deposits
                  must be entered explicitly.
                </p>
                <h4>Cash & tax</h4>
                <p>
                  Food and non-soda drinks: 5% GST. Soda: 5% GST + 7% PST. Refundable deposits are
                  separate and untaxed. Taxes round to cents on each order’s taxable bases; only the
                  final payable amount rounds to the nearest nickel.
                </p>
                <details className="advanced">
                  <summary>Tax rate configuration</summary>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const gst = parseMoney(taxText.gst),
                        pst = parseMoney(taxText.pst)
                      if (gst === null || pst === null || gst > 10000 || pst > 10000) {
                        setError('Enter rates between 0 and 100%.')
                        return
                      }
                      saveConfig({ ...config, taxes: { gstBasisPoints: gst, pstBasisPoints: pst } })
                      notify('Tax rates saved')
                    }}
                  >
                    <label className="field">
                      GST %
                      <input
                        inputMode="decimal"
                        value={taxText.gst}
                        onChange={(e) => setTaxText({ ...taxText, gst: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      PST %
                      <input
                        inputMode="decimal"
                        value={taxText.pst}
                        onChange={(e) => setTaxText({ ...taxText, pst: e.target.value })}
                      />
                    </label>
                    <button className="button secondary full">Save tax rates</button>
                  </form>
                </details>
                <h4>Install & use offline</h4>
                <p>
                  iPhone: Safari → Share → Add to Home Screen. Android: browser menu → Install app.
                  Wait for “Offline ready” after the first load. An update appears when a new
                  version is ready; finish the current order before updating.
                </p>
                <small>Version 1.0 · Prices stored in Canadian cents.</small>
              </div>
            )}
          </>
        )}
      </div>
      {confirm && (
        <Sheet
          title={
            confirm === 'import'
              ? 'Replace menu configuration?'
              : confirm === 'reset'
                ? 'Reset menu & pricing?'
                : 'Clear order history?'
          }
          onClose={() => setConfirm(null)}
        >
          <div className="sheet-content">
            <p>
              {confirm === 'import'
                ? `Replace the current setup with ${pendingImport?.products.length} products from this file? Your active order and history are preserved.`
                : confirm === 'reset'
                  ? 'This removes your price corrections and custom menu entries. Export a backup first. Your active order and history are preserved.'
                  : 'Remove all completed receipts from this phone? This cannot be undone.'}
            </p>
            <button
              className="button danger full"
              onClick={() => {
                if (confirm === 'reset') saveConfig(freshDefaults())
                else if (confirm === 'history') clearHistory()
                else if (pendingImport) saveConfig(pendingImport)
                setConfirm(null)
                notify(confirm === 'history' ? 'History cleared' : 'Configuration saved')
              }}
            >
              {confirm === 'import'
                ? 'Replace configuration'
                : confirm === 'reset'
                  ? 'Reset pricing'
                  : 'Clear history'}
            </button>
            <button className="button secondary full" onClick={() => setConfirm(null)}>
              Keep current setup
            </button>
          </div>
        </Sheet>
      )}
    </Sheet>
  )
}

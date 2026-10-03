import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Minus,
  Plus,
  Settings2,
  ShoppingBag,
  Trash2,
  Undo2,
  WifiOff,
} from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {
  categories,
  type Category,
  type CompletedOrder,
  type Line,
  type Price,
  type Product,
} from './model'
import {
  calculateTotals,
  changeBreakdown,
  getExtraPrice,
  getProteinPrice,
  itemPrice,
  money,
  parseMoney,
} from './money'
import { loadState, STORAGE_KEY } from './storage'
import { Settings } from './Settings'
import { ReceiptTotals, ResolvePrice, Sheet } from './ui'
import { ToastContext } from './context'

const completionTimestamp = () => new Date().toISOString()

type Selection = { productId: string; proteinId?: string; extraIds: string[]; editingId?: string }
export default function App() {
  const [loaded] = useState(loadState)
  const [config, setConfig] = useState(loaded.state.config)
  const [cart, setCart] = useState(loaded.state.cart)
  const [history, setHistory] = useState(loaded.state.history)
  const [warning, setWarning] = useState(loaded.warning)
  const [category, setCategory] = useState<Category>('Burritos')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [screen, setScreen] = useState<'menu' | 'cart' | 'history' | 'settings' | 'change'>('menu')
  const [undo, setUndo] = useState<Line[][]>([])
  const [toast, setToast] = useState('')
  const [tendered, setTendered] = useState<number | null>(null)
  const [other, setOther] = useState(false)
  const [otherText, setOtherText] = useState('')
  const [viewOrder, setViewOrder] = useState<CompletedOrder | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  function notify(message: string) {
    setToast(message)
  }
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, config, cart, history }))
    } catch {
      queueMicrotask(() =>
        setWarning(
          'Device storage is full or unavailable. Export your configuration; this session is not saved.',
        ),
      )
    }
  }, [config, cart, history])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(id)
  }, [toast])
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  let totals = { subtotal: 0, gst: 0, pst: 0, deposits: 0, rounding: 0, cash: 0 }
  let totalError = ''
  try {
    totals = calculateTotals(cart, config.taxes)
  } catch (e) {
    totalError = (e as Error).message
  }
  const count = cart.reduce((n, line) => n + line.quantity, 0)
  const selectedProduct = selection
    ? config.products.find((p) => p.id === selection.productId)
    : undefined
  const configuredPrice =
    selection && selectedProduct
      ? itemPrice(selectedProduct, selection.proteinId, selection.extraIds, config)
      : null
  const products = config.products.filter((p) => p.enabled && p.category === category)
  function mutateCart(next: Line[]) {
    try {
      calculateTotals(next, config.taxes)
    } catch (e) {
      notify((e as Error).message)
      return
    }
    if (next.length > 100) {
      notify('Maximum 100 order lines. Finish or split this order.')
      return
    }
    setUndo((previous) => [...previous.slice(-19), structuredClone(cart)])
    setCart(next)
    setTendered(null)
  }
  function undoAction() {
    const last = undo.at(-1)
    if (last) {
      setCart(last)
      setUndo(undo.slice(0, -1))
      setTendered(null)
      notify('Last action undone')
    }
  }
  function selectProduct(product: Product) {
    if (!product.customizable && product.price.cents !== null && product.deposit.cents !== null) {
      addLine(product, undefined, [])
      return
    }
    setSelection({ productId: product.id, extraIds: [] })
  }
  function addLine(
    product: Product,
    proteinId: string | undefined,
    extraIds: string[],
    editingId?: string,
  ) {
    const unitCents = itemPrice(product, proteinId, extraIds, config)
    if (unitCents === null) return
    const protein = proteinId ? getProteinPrice(product, proteinId, config) : undefined
    const details = [
      ...(proteinId
        ? [
            {
              name: config.proteins.find((p) => p.id === proteinId)!.name,
              cents: protein?.mode === 'adjustment' ? protein.price.cents! : 0,
            },
          ]
        : []),
      ...extraIds.map((id) => ({
        name: config.extras.find((p) => p.id === id)!.name,
        cents: getExtraPrice(product, id, config).cents!,
      })),
    ]
    const previous = cart.find((l) => l.id === editingId)
    const line: Line = {
      id: editingId ?? crypto.randomUUID(),
      productId: product.id,
      name: product.name,
      proteinId,
      extraIds,
      unitCents,
      details,
      taxClass: product.taxClass,
      depositCents: product.deposit.cents!,
      quantity: previous?.quantity ?? 1,
    }
    const identical =
      !editingId &&
      cart.find(
        (l) =>
          l.productId === product.id &&
          l.proteinId === proteinId &&
          JSON.stringify([...l.extraIds].sort()) === JSON.stringify([...extraIds].sort()) &&
          l.unitCents === unitCents &&
          l.depositCents === line.depositCents &&
          l.taxClass === line.taxClass &&
          l.quantity < 99,
      )
    const next = editingId
      ? cart.map((l) => (l.id === editingId ? line : l))
      : identical
        ? cart.map((l) => (l.id === identical.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...cart, line]
    try {
      calculateTotals(next, config.taxes)
    } catch (e) {
      notify((e as Error).message)
      return
    }
    if (next.length > 100) {
      notify('Order line limit reached. Split this order.')
      return
    }
    mutateCart(next)
    setSelection(null)
    notify(editingId ? 'Item updated' : `${product.name} added`)
  }
  function setProductPrice(price: Price, field: 'price' | 'deposit') {
    if (!selectedProduct) return
    setConfig((c) => ({
      ...c,
      products: c.products.map((p) => (p.id === selectedProduct.id ? { ...p, [field]: price } : p)),
    }))
  }
  function setProteinPrice(id: string, price: Price) {
    if (!selectedProduct) return
    const override = selectedProduct.proteinOverrides[id]
    if (override)
      setConfig((c) => ({
        ...c,
        products: c.products.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, proteinOverrides: { ...p.proteinOverrides, [id]: { ...override, price } } }
            : p,
        ),
      }))
    else
      setConfig((c) => ({
        ...c,
        proteins: c.proteins.map((p) => (p.id === id ? { ...p, price } : p)),
      }))
  }
  function setExtraPrice(id: string, price: Price) {
    if (!selectedProduct) return
    if (selectedProduct.extraOverrides[id])
      setConfig((c) => ({
        ...c,
        products: c.products.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, extraOverrides: { ...p.extraOverrides, [id]: price } }
            : p,
        ),
      }))
    else
      setConfig((c) => ({ ...c, extras: c.extras.map((p) => (p.id === id ? { ...p, price } : p)) }))
  }
  function tender(amount: number) {
    if (amount % 5 !== 0) {
      notify('Enter cash in 5¢ increments. Canada has no pennies.')
      return
    }
    setTendered(amount)
    setOther(false)
    setToast('')
    if (amount >= totals.cash && cart.length && !totalError) setScreen('change')
  }
  function done() {
    if (tendered === null || tendered < totals.cash || !cart.length || totalError) return
    const change = tendered - totals.cash
    const order: CompletedOrder = {
      id: crypto.randomUUID(),
      timestamp: completionTimestamp(),
      lines: structuredClone(cart),
      totals,
      tendered,
      change,
      breakdown: changeBreakdown(change),
    }
    setHistory((h) => [order, ...h].slice(0, 20))
    setCart([])
    setUndo([])
    setTendered(null)
    setScreen('menu')
    notify('Order completed · ready for the next one')
  }
  function renderLines(lines: Line[], editable = false) {
    return (
      <div className="receipt-lines">
        {lines.map((line) => (
          <div className="receipt-line" key={line.id}>
            <div className="receipt-line-top">
              <div>
                <strong>
                  {line.quantity > 1 && `${line.quantity} × `}
                  {line.name}
                </strong>
                {line.details.map((d, i) => (
                  <div className="line-detail" key={`${d.name}-${i}`}>
                    <span>{d.name}</span>
                    {d.cents > 0 && <span>+{money(d.cents)}</span>}
                  </div>
                ))}
                {line.depositCents > 0 && (
                  <div className="line-detail">
                    <span>Deposit per item</span>
                    <span>{money(line.depositCents)}</span>
                  </div>
                )}
              </div>
              <strong>{money(line.unitCents * line.quantity)}</strong>
            </div>
            {editable && (
              <div className="line-actions">
                <div className="quantity">
                  <button
                    aria-label={`Decrease ${line.name} quantity`}
                    onClick={() =>
                      mutateCart(
                        line.quantity === 1
                          ? cart.filter((l) => l.id !== line.id)
                          : cart.map((l) =>
                              l.id === line.id ? { ...l, quantity: l.quantity - 1 } : l,
                            ),
                      )
                    }
                  >
                    <Minus size={18} />
                  </button>
                  <span aria-label="Quantity">{line.quantity}</span>
                  <button
                    disabled={line.quantity === 99}
                    aria-label={`Increase ${line.name} quantity`}
                    onClick={() =>
                      mutateCart(
                        cart.map((l) =>
                          l.id === line.id ? { ...l, quantity: l.quantity + 1 } : l,
                        ),
                      )
                    }
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    const product = config.products.find((p) => p.id === line.productId)
                    if (!product) {
                      notify(
                        'This product was removed from Settings. Remove it and add a current product.',
                      )
                      return
                    }
                    const proteinId = config.proteins.some(
                      (p) => p.id === line.proteinId && p.enabled,
                    )
                      ? line.proteinId
                      : undefined
                    setSelection({
                      productId: line.productId,
                      proteinId,
                      extraIds: line.extraIds.filter((id) =>
                        config.extras.some((p) => p.id === id && p.enabled),
                      ),
                      editingId: line.id,
                    })
                  }}
                >
                  Edit
                </button>
                <button
                  className="icon-button"
                  aria-label={`Remove ${line.name}`}
                  onClick={() => {
                    mutateCart(cart.filter((l) => l.id !== line.id))
                    notify('Item removed · Undo available')
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }
  const change = tendered === null ? 0 : Math.max(0, tendered - totals.cash)
  return (
    <ToastContext.Provider value={toast}>
      <div className="app-shell">
        <header className="app-header">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setScreen('menu')
            }}
            aria-label="Mucho Cash Helper home"
          >
            <span className="brand-mark">
              m<span>+</span>
            </span>
            <span>
              <strong>
                mucho<span className="brand-dot">.</span>
              </strong>
              <span className="brand-sub">CASH HELPER</span>
            </span>
          </a>
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label="Order history"
              onClick={() => setScreen('history')}
            >
              <Clock3 size={22} />
            </button>
            <button
              className="icon-button"
              aria-label="Menu & Prices"
              onClick={() => setScreen('settings')}
            >
              <Settings2 size={22} />
            </button>
          </div>
        </header>
        <main>
          <div className="location-line">
            <span className="eyebrow">PRINCE GEORGE, BC</span>
            <span className="local-status">
              {!online ? <WifiOff size={13} /> : <span className="status-dot" />}
              {!online
                ? 'Offline'
                : offlineReady || Boolean(navigator.serviceWorker?.controller)
                  ? 'Offline ready'
                  : 'Online'}
            </span>
          </div>
          {warning && (
            <div className="warning" role="alert">
              {warning}
              <button className="text-button" onClick={() => setWarning(null)}>
                Dismiss
              </button>
            </div>
          )}
          {needRefresh && (
            <div className="update-banner">
              <span>A fresh version is ready.</span>
              <button
                className="text-button"
                disabled={cart.length > 0 || screen === 'change'}
                onClick={() => updateServiceWorker(true)}
              >
                {cart.length ? 'Finish order to update' : 'Update app'}
              </button>
            </div>
          )}
          <nav className="category-nav" aria-label="Menu categories">
            {categories.map((c) => (
              <button
                key={c}
                aria-pressed={category === c}
                className={category === c ? 'active' : ''}
                onClick={(e) => {
                  setCategory(c)
                  e.currentTarget.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest',
                  })
                }}
              >
                {c}
              </button>
            ))}
          </nav>
          <section className="menu-section" aria-labelledby="category-title">
            <div className="section-heading">
              <h1 id="category-title">{category}</h1>
            </div>
            <div className="product-grid">
              {products.map((p) => (
                <button className="product-card" key={p.id} onClick={() => selectProduct(p)}>
                  <h2>{p.name}</h2>
                  <strong>{p.price.cents === null ? '—' : money(p.price.cents)}</strong>
                </button>
              ))}
            </div>
            {products.length === 0 && (
              <div className="empty">
                <ShoppingBag size={30} />
                <h3>No items here yet</h3>
                <button className="button secondary" onClick={() => setScreen('settings')}>
                  Edit menu
                </button>
              </div>
            )}
          </section>
        </main>
        <div className="cart-dock">
          <div className="cart-dock-inner">
            {undo.length > 0 && (
              <button
                className="dock-undo icon-button"
                aria-label="Undo last order action"
                onClick={undoAction}
              >
                <Undo2 size={20} />
              </button>
            )}
            <button
              className="cart-bar"
              disabled={!cart.length}
              onClick={() => {
                setScreen('cart')
                setTendered(null)
              }}
            >
              <span className="cart-item-count">
                <ShoppingBag size={21} />
                <span>
                  {count} {count === 1 ? 'item' : 'items'}
                </span>
              </span>
              <strong>{totalError ? 'Check order' : money(totals.cash)}</strong>
              <span className="view-order">
                VIEW ORDER
                <ArrowRight size={18} />
              </span>
            </button>
          </div>
        </div>
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
        {selection && selectedProduct && (
          <Sheet
            title={selection.editingId ? 'Edit order item' : selectedProduct.name}
            onClose={() => setSelection(null)}
          >
            <div className="sheet-content builder">
              <strong className="builder-price" aria-live="polite">
                {configuredPrice === null
                  ? selectedProduct.price.cents === null
                    ? '—'
                    : money(selectedProduct.price.cents)
                  : money(configuredPrice)}
              </strong>
              {selectedProduct.price.cents === null &&
                (!selection.proteinId ||
                  getProteinPrice(selectedProduct, selection.proteinId, config).mode !==
                    'total') && (
                  <ResolvePrice
                    key="base"
                    label={`${selectedProduct.name} base price`}
                    onSave={(p) => setProductPrice(p, 'price')}
                  />
                )}
              {selectedProduct.customizable && (
                <>
                  <div className="step-heading">
                    <h3>Choose protein</h3>
                  </div>
                  <div className="protein-grid">
                    {config.proteins
                      .filter(
                        (p) =>
                          (p.enabled && !selectedProduct.excludedProteinIds.includes(p.id)) ||
                          p.id === selection.proteinId,
                      )
                      .map((p) => {
                        const pricing = getProteinPrice(selectedProduct, p.id, config)
                        return (
                          <button
                            key={p.id}
                            className={`choice ${selection.proteinId === p.id ? 'selected' : ''}`}
                            aria-pressed={selection.proteinId === p.id}
                            onClick={() => setSelection({ ...selection, proteinId: p.id })}
                          >
                            <strong>{p.name}</strong>
                            {(pricing.price.cents !== 0 || pricing.mode === 'total') && (
                              <span>
                                {pricing.price.cents === null
                                  ? pricing.mode === 'total'
                                    ? 'Set full price'
                                    : 'Set upcharge'
                                  : pricing.mode === 'total'
                                    ? `${money(pricing.price.cents)} full price`
                                    : pricing.price.cents === 0
                                      ? ''
                                      : `+${money(pricing.price.cents)}`}
                              </span>
                            )}
                            {selection.proteinId === p.id && <Check size={16} />}
                          </button>
                        )
                      })}
                  </div>
                  {selection.proteinId &&
                    getProteinPrice(selectedProduct, selection.proteinId, config).price.cents ===
                      null && (
                      <ResolvePrice
                        key={selection.proteinId}
                        label={`${config.proteins.find((p) => p.id === selection.proteinId)!.name} ${getProteinPrice(selectedProduct, selection.proteinId, config).mode === 'total' ? 'full entrée price' : 'upcharge'}`}
                        onSave={(p) => setProteinPrice(selection.proteinId!, p)}
                      />
                    )}
                  <div className="step-heading">
                    <h3>Extras</h3>
                  </div>
                  <div className="extras-grid">
                    {config.extras
                      .filter(
                        (e) =>
                          (e.enabled && !selectedProduct.excludedExtraIds.includes(e.id)) ||
                          selection.extraIds.includes(e.id),
                      )
                      .map((extra) => {
                        const pricing = getExtraPrice(selectedProduct, extra.id, config),
                          checked = selection.extraIds.includes(extra.id)
                        return (
                          <button
                            key={extra.id}
                            className={`choice extra-choice ${checked ? 'selected' : ''}`}
                            aria-pressed={checked}
                            onClick={() =>
                              setSelection({
                                ...selection,
                                extraIds: checked
                                  ? selection.extraIds.filter((id) => id !== extra.id)
                                  : [...selection.extraIds, extra.id],
                              })
                            }
                          >
                            <span className="choice-check">
                              {checked ? <Check size={15} /> : <Plus size={15} />}
                            </span>
                            <strong>{extra.name}</strong>
                            <span>
                              {pricing.cents === null
                                ? 'Set price'
                                : pricing.cents === 0
                                  ? ''
                                  : `+${money(pricing.cents)}`}
                            </span>
                          </button>
                        )
                      })}
                  </div>
                  {selection.extraIds
                    .filter((id) => getExtraPrice(selectedProduct, id, config).cents === null)
                    .map((id) => (
                      <ResolvePrice
                        key={id}
                        label={`${config.extras.find((e) => e.id === id)!.name} extra price`}
                        onSave={(p) => setExtraPrice(id, p)}
                      />
                    ))}
                </>
              )}
              {selectedProduct.deposit.cents === null && (
                <ResolvePrice
                  key="deposit"
                  label={`${selectedProduct.name} deposit`}
                  deposit
                  onSave={(p) => setProductPrice(p, 'deposit')}
                />
              )}
            </div>
            <footer className="sheet-footer">
              <button
                className="button primary full add-order"
                disabled={configuredPrice === null}
                onClick={() =>
                  addLine(
                    selectedProduct,
                    selection.proteinId,
                    selection.extraIds,
                    selection.editingId,
                  )
                }
              >
                <span>{selection.editingId ? 'Update item' : 'Add to order'}</span>
                <span>
                  {configuredPrice === null ? '—' : money(configuredPrice)}
                  <Plus size={20} />
                </span>
              </button>
            </footer>
          </Sheet>
        )}
        {screen === 'cart' && (
          <Sheet title="Your order" onClose={() => setScreen('menu')}>
            <div className="sheet-content cart-content">
              <div className="receipt-heading">
                <span className="eyebrow">MUCHO CASH HELPER</span>
                <span>
                  {count} {count === 1 ? 'item' : 'items'} · Cash only
                </span>
              </div>
              {cart.length ? (
                <>
                  {renderLines(cart, true)}
                  <div className="cart-tools">
                    <button className="text-button" disabled={!undo.length} onClick={undoAction}>
                      <Undo2 size={17} />
                      Undo
                    </button>
                    <button className="text-button" onClick={() => setConfirmClear(true)}>
                      <Trash2 size={17} />
                      Clear order
                    </button>
                  </div>
                  {totalError ? (
                    <p className="error" role="alert">
                      {totalError}
                    </p>
                  ) : (
                    <ReceiptTotals totals={totals} />
                  )}
                  <div className="tender-heading">
                    <h3>Cash received</h3>
                  </div>
                  <div className="tender-grid">
                    {[500, 1000, 2000, 5000, 10000].map((amount) => (
                      <button
                        key={amount}
                        className="tender-button"
                        onClick={() => tender(amount)}
                        disabled={!!totalError}
                      >
                        {money(amount).replace('.00', '')}
                      </button>
                    ))}
                    <button
                      className="tender-button other"
                      onClick={() => {
                        setOther(true)
                        setOtherText('')
                      }}
                      disabled={!!totalError}
                    >
                      Other
                    </button>
                  </div>
                  {tendered !== null && tendered < totals.cash && (
                    <div className="remaining" role="alert">
                      <span>Received {money(tendered)}</span>
                      <strong>Still owed {money(totals.cash - tendered)}</strong>
                    </div>
                  )}
                  <button className="text-button full" onClick={() => setScreen('menu')}>
                    <ArrowLeft size={17} />
                    Add more items
                  </button>
                </>
              ) : (
                <div className="empty">
                  <ShoppingBag size={32} />
                  <h3>The order is empty</h3>
                  <button className="button primary full" onClick={() => setScreen('menu')}>
                    Back to menu
                  </button>
                </div>
              )}
            </div>
          </Sheet>
        )}
        {other && (
          <Sheet title="Cash received" onClose={() => setOther(false)}>
            <form
              className="sheet-content"
              onSubmit={(e) => {
                e.preventDefault()
                const amount = parseMoney(otherText)
                if (amount !== null) tender(amount)
              }}
            >
              <span className="eyebrow">CASH TOTAL {money(totals.cash)}</span>
              <label className="field cash-entry-label">
                Total cash handed to you
                <div className="money-input big-input">
                  <span>$</span>
                  <input
                    autoFocus
                    inputMode="decimal"
                    aria-label="Custom cash amount"
                    value={otherText}
                    placeholder="0.00"
                    onChange={(e) => setOtherText(e.target.value)}
                  />
                </div>
              </label>
              <button className="button primary full" disabled={parseMoney(otherText) === null}>
                Calculate change
                <ArrowRight size={20} />
              </button>
            </form>
          </Sheet>
        )}
        {screen === 'change' && tendered !== null && (
          <Sheet title="Change" onClose={() => setScreen('cart')}>
            <div className="sheet-content change-content">
              <div className="change-amount">
                <span className="eyebrow">CHANGE</span>
                <h3>{money(change)}</h3>
                <div>
                  <span>Cash total {money(totals.cash)}</span>
                  <span>Received {money(tendered)}</span>
                </div>
              </div>
              <div className="give-back-heading">
                <h4>GIVE BACK</h4>
                <span>{changeBreakdown(change).reduce((n, d) => n + d.count, 0)} pieces</span>
              </div>
              {change > 0 ? (
                <div className="denominations">
                  {changeBreakdown(change).map((d) => (
                    <div
                      key={d.cents}
                      className={`denomination ${d.cents >= 500 ? 'bill' : 'coin'}`}
                    >
                      <span className="denom-symbol">
                        {d.cents >= 500 ? (
                          <span className="bill-symbol" />
                        ) : (
                          <span className="coin-symbol" />
                        )}
                      </span>
                      <strong>{d.label.replace(/ (bill|coin)$/, '')}</strong>
                      <span className="denom-count">
                        × <b>{d.count}</b>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="exact-cash">
                  <Check size={32} />
                  <strong>Exact cash</strong>
                </div>
              )}
            </div>
            <footer className="sheet-footer">
              <button className="button primary full done-button" onClick={done}>
                DONE / NEXT ORDER
                <ArrowRight size={23} />
              </button>
              <button className="text-button full" onClick={() => setScreen('cart')}>
                Change cash received
              </button>
            </footer>
          </Sheet>
        )}
        {screen === 'settings' && (
          <Settings
            config={config}
            onChange={setConfig}
            onClose={() => setScreen('menu')}
            clearHistory={() => setHistory([])}
            notify={notify}
          />
        )}
        {screen === 'history' && (
          <Sheet title="Recent orders" onClose={() => setScreen('menu')}>
            <div className="sheet-content">
              {history.length ? (
                <div className="history-list">
                  {history.map((order) => (
                    <button
                      className="history-row"
                      key={order.id}
                      onClick={() => setViewOrder(order)}
                    >
                      <span className="history-icon">
                        <Clock3 size={20} />
                      </span>
                      <div>
                        <strong>
                          {new Date(order.timestamp).toLocaleTimeString('en-CA', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </strong>
                        <span>
                          {new Date(order.timestamp).toLocaleDateString('en-CA', {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          · {order.lines.reduce((n, l) => n + l.quantity, 0)} items
                        </span>
                      </div>
                      <strong>{money(order.totals.cash)}</strong>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <Clock3 size={32} />
                  <h3>No completed orders</h3>
                </div>
              )}
            </div>
          </Sheet>
        )}
        {viewOrder && (
          <Sheet title="Completed order" onClose={() => setViewOrder(null)}>
            <div className="sheet-content">
              <p className="muted">{new Date(viewOrder.timestamp).toLocaleString('en-CA')}</p>
              {renderLines(viewOrder.lines)}
              <ReceiptTotals totals={viewOrder.totals} />
              <div className="history-payment">
                <div>
                  <span>Cash received</span>
                  <strong>{money(viewOrder.tendered)}</strong>
                </div>
                <div>
                  <span>Change returned</span>
                  <strong>{money(viewOrder.change)}</strong>
                </div>
              </div>
              {viewOrder.breakdown.map((d) => (
                <div className="history-denom" key={d.cents}>
                  <span>{d.label}</span>
                  <strong>× {d.count}</strong>
                </div>
              ))}
            </div>
          </Sheet>
        )}
        {confirmClear && (
          <Sheet title="Clear this order?" onClose={() => setConfirmClear(false)}>
            <div className="sheet-content">
              <p>Remove all {count} items? You can undo this from the menu or order screen.</p>
              <button
                className="button danger full"
                onClick={() => {
                  mutateCart([])
                  setConfirmClear(false)
                  setScreen('menu')
                  notify('Order cleared · Undo available')
                }}
              >
                Clear order
              </button>
              <button className="button secondary full" onClick={() => setConfirmClear(false)}>
                Keep order
              </button>
            </div>
          </Sheet>
        )}
      </div>
    </ToastContext.Provider>
  )
}

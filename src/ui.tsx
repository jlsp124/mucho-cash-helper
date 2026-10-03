import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'
import { type Price, verified } from './model'
import { money, parseMoney } from './money'
import { ToastContext } from './context'

export function Sheet({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const toast = useContext(ToastContext)
  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement as HTMLElement | null
    dialog.showModal()
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = old
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={`sheet ${wide ? 'wide' : ''}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet-shell">
        <header className="sheet-header">
          <h2>{title}</h2>
          <button className="icon-button" aria-label={`Close ${title}`} onClick={onClose}>
            <X size={22} />
          </button>
        </header>
        {children}
        {toast && (
          <div className="sheet-toast" role="status">
            {toast}
          </div>
        )}
      </div>
    </dialog>
  )
}
export function PriceStatus({ price }: { price: Price }) {
  return (
    <span className={`price-status ${price.verified ? 'verified' : 'unverified'}`}>
      {price.verified ? <Check size={13} /> : <AlertCircle size={13} />}
      {price.cents === null
        ? 'Unknown · set price'
        : price.verified
          ? 'Store verified'
          : price.source === 'online'
            ? 'Unverified online seed'
            : 'Unverified · check register'}
    </span>
  )
}
export function PriceEditor({
  label,
  value,
  onChange,
}: {
  label: string
  value: Price
  onChange: (p: Price) => void
}) {
  const [text, setText] = useState(value.cents === null ? '' : (value.cents / 100).toFixed(2))
  const amount = text === '' ? null : parseMoney(text)
  return (
    <div className="price-editor">
      <label>
        <span>{label}</span>
        <div className="money-input">
          <span>$</span>
          <input
            inputMode="decimal"
            value={text}
            placeholder="Unknown"
            aria-label={label}
            onChange={(e) => {
              setText(e.target.value)
              e.currentTarget.setCustomValidity(
                e.target.value === '' || parseMoney(e.target.value) !== null
                  ? ''
                  : 'Enter a valid price up to $10,000, with at most two decimal places.',
              )
              const next = e.target.value === '' ? null : parseMoney(e.target.value)
              if (e.target.value === '' || next !== null)
                onChange(
                  next === null
                    ? { cents: null, verified: false, source: 'unknown' }
                    : next === value.cents
                      ? value
                      : { cents: next, verified: false, source: 'store' },
                )
            }}
          />
        </div>
      </label>
      {text !== '' && amount === null && (
        <p role="alert" className="error">
          Enter a valid price, up to $10,000.
        </p>
      )}
      <label className="check-label">
        <input
          type="checkbox"
          checked={value.verified}
          disabled={value.cents === null}
          onChange={(e) =>
            onChange({
              ...value,
              verified: e.target.checked,
              source: e.target.checked ? 'store' : value.source,
            })
          }
        />
        Verified against store register
      </label>
      <PriceStatus price={value} />
    </div>
  )
}
export function ResolvePrice({
  label,
  onSave,
  deposit = false,
}: {
  label: string
  onSave: (p: Price) => void
  deposit?: boolean
}) {
  const [text, setText] = useState('')
  const amount = parseMoney(text)
  return (
    <form
      className="resolve-price"
      onSubmit={(e) => {
        e.preventDefault()
        if (amount !== null) onSave(verified(amount))
      }}
    >
      <label>
        <strong>{label}</strong>
        <span className="muted">
          {deposit
            ? 'Enter the refundable deposit, or confirm none.'
            : 'Enter the store price once. Saved on this phone.'}
        </span>
        <div className="resolve-row">
          <div className="money-input">
            <span>$</span>
            <input
              aria-label={label}
              inputMode="decimal"
              placeholder="0.00"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <button className="button primary" disabled={amount === null} type="submit">
            Save
          </button>
        </div>
      </label>
      {deposit && (
        <button type="button" className="text-button" onClick={() => onSave(verified(0))}>
          No deposit · $0
        </button>
      )}
      {!deposit && /upcharge|extra/i.test(label) && (
        <button type="button" className="text-button" onClick={() => onSave(verified(0))}>
          Confirm included · $0
        </button>
      )}
    </form>
  )
}
export function ReceiptTotals({
  totals,
}: {
  totals: {
    subtotal: number
    gst: number
    pst: number
    deposits: number
    rounding: number
    cash: number
  }
}) {
  return (
    <div className="receipt-totals">
      <div>
        <span>Subtotal</span>
        <span>{money(totals.subtotal)}</span>
      </div>
      <div>
        <span>GST</span>
        <span>{money(totals.gst)}</span>
      </div>
      <div>
        <span>PST</span>
        <span>{money(totals.pst)}</span>
      </div>
      {totals.deposits > 0 && (
        <div>
          <span>Refundable deposits</span>
          <span>{money(totals.deposits)}</span>
        </div>
      )}
      {totals.rounding !== 0 && (
        <div className="muted">
          <span>Cash rounding</span>
          <span>
            {totals.rounding > 0 ? '+' : '−'}
            {money(Math.abs(totals.rounding))}
          </span>
        </div>
      )}
      <div className="cash-total">
        <span>CASH TOTAL</span>
        <strong>{money(totals.cash)}</strong>
      </div>
    </div>
  )
}

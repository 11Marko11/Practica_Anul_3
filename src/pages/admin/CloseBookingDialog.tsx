import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import { ApiError } from '../../lib/api'
import { adminCancelBooking, CANCEL_REASONS, type Booking, type CancelReason } from '../../lib/bookings'
import { fmt } from '../../lib/rental'

// The admin cancels a confirmed booking: picks a reason, explains it to the customer and
// chooses how much of the charged money goes back (all, part or nothing).
export function CancelBookingDialog({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n()
  const a = t.adminBookings
  const dialog = useRef<HTMLDialogElement>(null)
  const refundable = booking.total - booking.refundedAmount
  const [reason, setReason] = useState<CancelReason>('car-unavailable')
  const [note, setNote] = useState('')
  const [refundMode, setRefundMode] = useState<'full' | 'partial' | 'none'>('full')
  const [partial, setPartial] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const refund = refundMode === 'full' ? refundable : refundMode === 'none' ? 0 : Number(partial)
    if (refundMode === 'partial' && (!/^\d+$/.test(partial) || refund > refundable)) return setError(a.refundInvalid(fmt(refundable)))
    if (reason === 'other' && !note.trim()) return setError(a.noteRequired)
    setBusy(true)
    setError('')
    try {
      await adminCancelBooking(booking.id, { reason, note: note.trim() || undefined, refund })
      onDone()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown'
      setError(code in a.errors ? a.errors[code as keyof typeof a.errors] : a.errors.unknown)
      setBusy(false)
    }
  }

  // margin: auto centres the dialog (the site's CSS reset sets every margin to 0).
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={e => e.target === dialog.current && dialog.current?.close()}
      style={{ margin: 'auto', width: 'min(520px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', border: 'none', borderRadius: 20, padding: 0, boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}
    >
      <form onSubmit={submit} style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: '0 0 6px' }}>{a.cancelTitle}</h2>
          <p style={{ fontSize: 14, color: '#424245', margin: 0, lineHeight: 1.5 }}>
            {booking.car.brand} {booking.car.model} · {booking.customer?.name}
            <br />
            {a.cancelIntro(fmt(booking.total))}
          </p>
        </div>

        <label style={label}>
          {a.reasonLabel}
          <select value={reason} onChange={e => setReason(e.target.value as CancelReason)} style={input}>
            {CANCEL_REASONS.map(r => <option key={r} value={r}>{t.cancelReasons[r]}</option>)}
          </select>
        </label>

        <label style={label}>
          {a.noteLabel}
          <textarea rows={3} maxLength={1000} value={note} onChange={e => { setNote(e.target.value); setError('') }} required={reason === 'other'} style={{ ...input, resize: 'vertical' }} />
        </label>

        <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <legend style={{ ...label, padding: 0, marginBottom: 8 }}>{a.refundLabel}</legend>
          {([['full', a.refundFull(fmt(refundable))], ['partial', a.refundPartial], ['none', a.refundNone]] as const).map(([mode, text]) => (
            <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#1d1d1f', cursor: 'pointer' }}>
              <input type="radio" name="refund" checked={refundMode === mode} onChange={() => { setRefundMode(mode); setError('') }} style={{ accentColor: '#1d1d1f' }} />
              {text}
            </label>
          ))}
          {refundMode === 'partial' && (
            <label style={{ ...label, marginLeft: 26 }}>
              {a.refundAmount}
              <input inputMode="numeric" value={partial} onChange={e => { setPartial(e.target.value.replace(/[^\d]/g, '')); setError('') }} placeholder={`0 – ${refundable}`} style={{ ...input, maxWidth: 200 }} autoFocus />
            </label>
          )}
        </fieldset>

        {error && <p role="alert" style={{ fontSize: 13, color: '#d70015', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
          <button type="button" onClick={() => dialog.current?.close()} style={{ ...button, background: '#f5f5f7', color: '#1d1d1f' }}>{a.keep}</button>
          <button type="submit" disabled={busy} style={{ ...button, background: '#d70015', color: '#fff', opacity: busy ? 0.6 : 1 }}>
            {busy ? a.cancelSubmitting : a.cancelSubmit}
          </button>
        </div>
      </form>
    </dialog>
  )
}

const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73' }
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid #d2d2d7', borderRadius: 12, background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none' }
const button: React.CSSProperties = { fontSize: 14, fontWeight: 500, padding: '11px 20px', borderRadius: 980, border: 'none', cursor: 'pointer' }

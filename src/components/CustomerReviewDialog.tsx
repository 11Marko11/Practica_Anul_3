import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { api } from '../lib/api'

// After a finished trip the host rates the customer: stars and a comment, once per trip.
// Only admins and hosts see it, on the customer's profile.
export function CustomerReviewDialog({ booking, onClose, onDone }: {
  booking: { id: string; car: { brand: string; model: string }; customer: { name: string } }
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useI18n()
  const c = t.customerReviews
  const dialog = useRef<HTMLDialogElement>(null)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) return setError(c.pickStars)
    if (text.trim().length < 3) return setError(c.writeComment)
    setBusy(true)
    try {
      await api(`/host/bookings/${booking.id}/customer-review`, { body: { rating, text: text.trim() } })
      onDone()
    } catch {
      setError(c.saveError)
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={e => e.target === dialog.current && dialog.current?.close()}
      style={{ margin: 'auto', width: 'min(480px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', border: 'none', borderRadius: 20, padding: 0, boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}
    >
      <form onSubmit={submit} style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: '0 0 6px' }}>{c.title(booking.customer.name)}</h2>
          <p style={{ fontSize: 14, color: '#424245', margin: 0, lineHeight: 1.5 }}>{booking.car.brand} {booking.car.model} · {c.intro}</p>
        </div>

        <div role="radiogroup" aria-label={c.stars} style={{ display: 'flex', gap: 2 }} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={t.reviews.stars(star)}
              onClick={() => { setRating(star); setError('') }}
              onMouseEnter={() => setHover(star)}
              style={{ fontSize: 30, lineHeight: 1, padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: star <= (hover || rating) ? '#1c1c1e' : '#c7c7cc', transition: 'color 0.1s' }}
            >
              ★
            </button>
          ))}
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73' }}>
          {c.comment}
          <textarea
            rows={4}
            maxLength={1000}
            value={text}
            onChange={e => { setText(e.target.value); setError('') }}
            placeholder={c.placeholder}
            style={{ fontSize: 15, padding: '10px 12px', border: '1px solid #d2d2d7', borderRadius: 12, fontFamily: 'inherit', resize: 'vertical', color: '#1d1d1f' }}
          />
        </label>
        <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>{c.privacy}</p>

        {error && <p role="alert" style={{ fontSize: 13, color: '#d70015', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => dialog.current?.close()} className="btn-action btn-action--neutral">{c.cancel}</button>
          <button type="submit" disabled={busy} className="btn-action btn-action--primary">{busy ? c.saving : c.submit}</button>
        </div>
      </form>
    </dialog>
  )
}

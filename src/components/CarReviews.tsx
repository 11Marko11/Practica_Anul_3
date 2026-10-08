import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { formatDate } from '../lib/rental'
import { ApiError } from '../lib/api'
import type { useReviews } from '../lib/useReviews'

const MIN_LENGTH = 10
const COLLAPSED_COUNT = 4

// Reviews and comments for one car: rating summary, the review list, and a form for customers
// who completed a trip with it.
export function CarReviews({ data }: { data: ReturnType<typeof useReviews> }) {
  const { reviews, average, canReview, add, remove } = data
  const { user } = useAuth()
  const { lang, t } = useI18n()
  const location = useLocation()
  const [expanded, setExpanded] = useState(false)

  const shown = expanded ? reviews : reviews.slice(0, COLLAPSED_COUNT)

  return (
    <div>
      {reviews.length > 0 ? (
        <div className="review-summary" style={{ background: '#f5f5f7', borderRadius: 18, padding: '22px 24px' }}>
          <div>
            <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.04em', color: '#1d1d1f', lineHeight: 1 }}>{average.toFixed(1)}</div>
            <Stars rating={average} size={16} />
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 6 }}>{t.reviews.count(reviews.length)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            {[5, 4, 3, 2, 1].map(star => {
              const n = reviews.filter(r => r.rating === star).length
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#6e6e73' }}>
                  <span style={{ width: 22 }}>{star} ★</span>
                  <span style={{ flex: 1, height: 6, borderRadius: 3, background: '#e1e1e6', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${(n / reviews.length) * 100}%`, background: '#1c1c1e', borderRadius: 3 }} />
                  </span>
                  <span style={{ width: 16, textAlign: 'right' }}>{n}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 15, color: '#6e6e73', margin: 0 }}>{t.reviews.none}</p>
      )}

      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
        {shown.map(r => (
          <li key={r.id} style={{ padding: '20px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#1c1c1e', color: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                {r.name.charAt(0).toUpperCase()}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>
                  {r.name}
                  {r.mine && <span style={{ fontSize: 12, fontWeight: 500, color: '#6e6e73', marginLeft: 8 }}>{t.reviews.you}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6e6e73' }}>
                  <Stars rating={r.rating} size={13} />
                  {formatDate(r.date, lang)}
                </div>
              </div>
              {(r.mine || user?.role === 'ADMIN') && (
                <button onClick={() => confirm(t.reviews.deleteConfirm) && remove(r.id).catch(() => alert(t.reviews.error))} style={{ fontSize: 13, color: '#d70015', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {t.reviews.delete}
                </button>
              )}
            </div>
            <p style={{ fontSize: 15, color: '#424245', lineHeight: 1.65, fontWeight: 300, margin: '10px 0 0', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{r.text}</p>
          </li>
        ))}
      </ul>

      {reviews.length > COLLAPSED_COUNT && (
        <button onClick={() => setExpanded(e => !e)} style={{ marginTop: 16, fontSize: 14, fontWeight: 500, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          {expanded ? t.reviews.showLess : t.reviews.showAll(reviews.length)}
        </button>
      )}

      <div style={{ marginTop: 28 }}>
        {!user ? (
          <p style={{ fontSize: 15, color: '#6e6e73', margin: 0 }}>
            <Link to="/login" state={{ from: location.pathname + location.search }} style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>
              {t.reviews.signIn}
            </Link>
            {t.reviews.signInPrompt}
          </p>
        ) : canReview ? (
          <ReviewForm onSubmit={add} />
        ) : reviews.some(r => r.mine) ? null : (
          <p style={{ fontSize: 15, color: '#6e6e73', margin: 0 }}>{t.reviews.needTrip}</p>
        )}
      </div>
    </div>
  )
}

function ReviewForm({ onSubmit }: { onSubmit: (rating: number, text: string) => Promise<void> }) {
  const { t } = useI18n()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) return setError(t.reviews.chooseRating)
    if (text.trim().length < MIN_LENGTH) return setError(t.reviews.tooShort(MIN_LENGTH))
    setBusy(true)
    try {
      await onSubmit(rating, text.trim())
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'review-needs-trip' ? t.reviews.needTrip : t.reviews.error)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ background: '#f5f5f7', borderRadius: 18, padding: '22px 24px' }}>
      <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: '0 0 14px' }}>{t.reviews.write}</h3>

      <div role="radiogroup" aria-label={t.reviews.yourRating} style={{ display: 'flex', gap: 4 }} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={t.reviews.stars(star)}
            onClick={() => { setRating(star); setError('') }}
            onMouseEnter={() => setHover(star)}
            style={{ fontSize: 28, lineHeight: 1, padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: star <= (hover || rating) ? '#1c1c1e' : '#c7c7cc', transition: 'color 0.1s' }}
          >
            ★
          </button>
        ))}
      </div>

      <label style={{ display: 'block', fontSize: 13, color: '#6e6e73', margin: '14px 0 6px' }}>
        {t.reviews.comment}
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setError('') }}
          placeholder={t.reviews.placeholder}
          rows={4}
          maxLength={1000}
          style={{ display: 'block', width: '100%', marginTop: 6, padding: '12px 14px', fontSize: 15, lineHeight: 1.6, border: '1px solid #d2d2d7', borderRadius: 12, background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
        />
      </label>

      {error && <p role="alert" style={{ fontSize: 13, color: '#d70015', margin: '4px 0 0' }}>{error}</p>}

      <button type="submit" disabled={busy} style={{ opacity: busy ? 0.6 : 1, marginTop: 14, padding: '12px 26px', fontSize: 15, fontWeight: 500, background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 980, cursor: 'pointer' }}>
        {t.reviews.submit}
      </button>
    </form>
  )
}

// Five stars, filled up to `rating` (rounded to the nearest half star).
function Stars({ rating, size }: { rating: number; size: number }) {
  const filled = Math.round(rating * 2) / 2
  return (
    <span aria-hidden style={{ display: 'inline-flex', fontSize: size, letterSpacing: 1, lineHeight: 1.4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ position: 'relative', color: '#c7c7cc' }}>
          ★
          {filled >= i - 0.5 && (
            <span style={{ position: 'absolute', inset: 0, width: filled >= i ? '100%' : '50%', overflow: 'hidden', color: '#1c1c1e' }}>★</span>
          )}
        </span>
      ))}
    </span>
  )
}

import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { BookingCard } from '../components/BookingCard'
import { useI18n } from '../i18n/I18nContext'
import { ApiError } from '../lib/api'
import { cancelBooking, completeBooking, getBooking, payBooking, type Booking } from '../lib/bookings'
import { fmt, formatDate } from '../lib/rental'

// One of the customer's bookings. Stripe sends the customer back here after paying
// (?payment=success) or giving up (?payment=cancelled).
export function BookingDetails() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const payment = params.get('payment')
  const { user, loading } = useAuth()
  const { lang, t } = useI18n()
  const location = useLocation()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<keyof typeof t.bookings.errors | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load(attempt: number) {
      try {
        const b = await getBooking(id)
        if (cancelled) return
        setBooking(b)
        // Right after paying, Stripe may need a moment to report the card hold.
        if (payment === 'success' && b.status === 'PENDING_PAYMENT' && attempt < 5) setTimeout(() => load(attempt + 1), 2000)
      } catch {
        if (!cancelled) setNotFound(true)
      }
    }
    load(0)
    return () => {
      cancelled = true
    }
  }, [id, user, payment])

  if (loading) return <div style={{ minHeight: '80vh' }} />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />

  function fail(err: unknown) {
    const code = err instanceof ApiError ? err.code : 'unknown'
    setError(code in t.bookings.errors ? (code as keyof typeof t.bookings.errors) : 'unknown')
    setBusy(false)
  }

  async function pay() {
    setBusy(true)
    setError(null)
    try {
      window.location.assign((await payBooking(id)).checkoutUrl)
    } catch (err) {
      fail(err)
      getBooking(id).then(setBooking).catch(() => {})
    }
  }

  // Cancel (only before confirmation, nothing is charged) or end the booking (car returned).
  async function run(question: string, action: () => Promise<Booking>) {
    if (!confirm(question)) return
    setBusy(true)
    setError(null)
    try {
      setBooking(await action())
      setBusy(false)
    } catch (err) {
      fail(err)
      getBooking(id).then(setBooking).catch(() => {})
    }
  }

  const time = (iso: string) => new Date(iso).toLocaleString(lang, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ paddingTop: 52 }}>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 96px' }}>
        <Link to="/bookings" style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none' }}>{t.bookings.back}</Link>

        {notFound && <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1d1d1f', margin: '24px 0' }}>{t.bookings.notFound}</h1>}
        {!booking && !notFound && <p style={{ fontSize: 15, color: '#6e6e73', margin: '24px 0' }}>{t.bookings.loading}</p>}

        {booking && (
          <>
            {payment === 'success' && booking.status !== 'PENDING_PAYMENT' && <Banner tone="ok">{t.bookings.paymentSuccess}</Banner>}
            {payment === 'cancelled' && booking.status === 'PENDING_PAYMENT' && <Banner tone="warn">{t.bookings.paymentCancelled}</Banner>}

            <h1 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '20px 0 6px' }}>
              {booking.car.brand} {booking.car.model}
            </h1>
            <p style={{ fontSize: 15, color: '#424245', margin: '0 0 20px', lineHeight: 1.6 }}>{t.bookings.statusText[booking.status]}</p>

            <BookingCard booking={booking}>
              <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 14, margin: '14px 0 0' }}>
                <dt style={{ color: '#6e6e73' }}>{t.bookings.rental(t.common.days(booking.days))}</dt>
                <dd style={{ margin: 0, color: '#1d1d1f' }}>{fmt(booking.rentalPrice)}</dd>
                {booking.deliveryKm !== null && (
                  <>
                    <dt style={{ color: '#6e6e73' }}>{t.bookings.deliveryFee(booking.deliveryKm)}</dt>
                    <dd style={{ margin: 0, color: '#1d1d1f' }}>{fmt(booking.deliveryFee)}</dd>
                  </>
                )}
                <dt style={{ color: '#6e6e73' }}>{t.bookings.phone2}</dt>
                <dd style={{ margin: 0, color: '#1d1d1f' }}>{booking.phone}</dd>
                {booking.note && (
                  <>
                    <dt style={{ color: '#6e6e73' }}>{t.bookings.note2}</dt>
                    <dd style={{ margin: 0, color: '#1d1d1f', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{booking.note}</dd>
                  </>
                )}
              </dl>
              <p style={{ fontSize: 12, color: '#86868b', margin: '12px 0 0' }}>
                {t.bookings.bookedOn(time(booking.createdAt))}
                {booking.status === 'PENDING_PAYMENT' && booking.paymentExpiresAt && ` · ${t.bookings.payBy(time(booking.paymentExpiresAt))}`}
              </p>
            </BookingCard>

            {booking.cancelled && (
              <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 14, background: '#f5f5f7', fontSize: 14, lineHeight: 1.6, color: '#1d1d1f' }}>
                <strong style={{ fontWeight: 600 }}>{booking.cancelled.by === 'ADMIN' ? t.bookings.cancelledByUs : t.bookings.cancelledByYou}</strong>
                {booking.cancelled.at && <span style={{ color: '#6e6e73' }}> · {time(booking.cancelled.at)}</span>}
                {booking.cancelled.reason && <div>{t.bookings.reason}: {t.cancelReasons[booking.cancelled.reason]}</div>}
                {booking.cancelled.note && <div style={{ color: '#424245', whiteSpace: 'pre-line' }}>{booking.cancelled.note}</div>}
                {booking.refundedAmount > 0 && <div>{t.bookings.refunded}: {fmt(booking.refundedAmount)}</div>}
              </div>
            )}

            {booking.status === 'CONFIRMED' && (
              <p style={{ fontSize: 14, color: '#424245', lineHeight: 1.6, margin: '16px 0 0' }}>
                {booking.canComplete ? null : <>{t.bookings.completeFrom(formatDate(booking.pickupDate, lang))} </>}
                {t.bookings.confirmedNote} <Link to="/contact" style={{ color: '#0071e3', textDecoration: 'none' }}>{t.bookings.contactUs}</Link>
              </p>
            )}

            {error && <p role="alert" style={{ fontSize: 14, color: '#d70015', margin: '16px 0 0' }}>{t.bookings.errors[error]}</p>}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
              {booking.status === 'PENDING_PAYMENT' && (
                <button onClick={pay} disabled={busy} style={{ ...button, background: '#1d1d1f', color: '#fff', opacity: busy ? 0.6 : 1 }}>
                  {busy ? t.bookings.redirecting : t.bookings.pay}
                </button>
              )}
              {booking.canComplete && (
                <button onClick={() => run(t.bookings.completeAsk, () => completeBooking(id))} disabled={busy} style={{ ...button, background: '#1d1d1f', color: '#fff', opacity: busy ? 0.6 : 1 }}>
                  {t.bookings.complete}
                </button>
              )}
              {booking.canCancel && (
                <button onClick={() => run(t.bookings.cancelFree, () => cancelBooking(id))} disabled={busy} style={{ ...button, background: 'none', color: '#d70015', border: '1px solid #f0c4c4', opacity: busy ? 0.6 : 1 }}>
                  {t.bookings.cancel}
                </button>
              )}
              {booking.status === 'COMPLETED' && (
                <Link to={`/cars/${booking.car.slug}#reviews`} style={{ ...button, background: '#1d1d1f', color: '#fff', textDecoration: 'none' }}>
                  {t.bookings.reviewCar}
                </Link>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

const button: React.CSSProperties = { fontSize: 15, fontWeight: 500, padding: '12px 24px', borderRadius: 980, border: 'none', cursor: 'pointer' }

function Banner({ tone, children }: { tone: 'ok' | 'warn'; children: React.ReactNode }) {
  return (
    <div role="status" style={{ marginTop: 20, padding: '14px 18px', borderRadius: 14, fontSize: 14, lineHeight: 1.5, background: tone === 'ok' ? '#e3f6e8' : '#fff4e0', color: tone === 'ok' ? '#1b5e2c' : '#7a4a00' }}>
      {children}
    </div>
  )
}

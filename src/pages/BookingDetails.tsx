import { useEffect, useState } from 'react'
import { formatPhone } from '../lib/phone'
import { same, useLivePoll } from '../lib/livePoll'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { StatusBadge } from '../components/BookingCard'
import { ReturnLocation } from '../components/ReturnLocation'
import { photoUrl } from '../data/cars'
import { useI18n } from '../i18n/I18nContext'
import { ApiError } from '../lib/api'
import { cancelBooking, completeBooking, getBooking, payBooking, type Booking, type BookingStatus } from '../lib/bookings'
import { ReturnLocationDialog } from '../components/ReturnLocationDialog'
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
  const [ending, setEnding] = useState(false)
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
  // Confirmation, completion or a refund by the admin show without a refresh.
  useLivePoll(() => { getBooking(id).then(next => setBooking(prev => (same(prev, next) ? prev : next))).catch(() => {}) }, 30_000, !!user && !!booking && !busy)

  if (loading) return <div style={{ minHeight: '80vh' }} />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  if (user.host) return <Navigate to="/host" replace />

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
  // "23 nov. 2026": short enough for the two dates to stay on one line each.
  const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={{ paddingTop: 64 }}>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 96px' }}>
        <Link to="/bookings" className="btn-action btn-action--neutral btn-back">{t.bookings.back}</Link>

        {notFound && <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1d1d1f', margin: '24px 0' }}>{t.bookings.notFound}</h1>}
        {!booking && !notFound && <p style={{ fontSize: 15, color: '#6e6e73', margin: '24px 0' }}>{t.bookings.loading}</p>}

        {booking && (
          <>
            {payment === 'success' && booking.status !== 'PENDING_PAYMENT' && <Banner tone="ok">{t.bookings.paymentSuccess}</Banner>}
            {payment === 'cancelled' && booking.status === 'PENDING_PAYMENT' && <Banner tone="warn">{t.bookings.paymentCancelled}</Banner>}

            <div className="booking-detail">
              {/* Left: the car large, where the booking stands and what happened to it. */}
              <div style={{ minWidth: 0 }}>
                <Link to={`/cars/${booking.car.slug}`} className="booking-detail__photo">
                  {booking.car.photo && <img src={photoUrl(booking.car.photo, 1200, 750)} alt={`${booking.car.brand} ${booking.car.model}`} />}
                </Link>
                <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '20px 0 6px' }}>
                  {booking.car.brand} {booking.car.model}
                </h1>
                <p style={{ fontSize: 16, color: '#424245', margin: 0, lineHeight: 1.6 }}>{t.bookings.statusText[booking.status]}</p>

                <Progress status={booking.status} />

                {booking.cancelled && (
                  <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 14, background: '#f5f5f7', fontSize: 14, lineHeight: 1.6, color: '#1d1d1f' }}>
                    <strong style={{ fontWeight: 600 }}>
                      {booking.status === 'REJECTED' ? t.bookings.rejectedByUs : booking.cancelled.by === 'ADMIN' ? t.bookings.cancelledByUs : t.bookings.cancelledByYou}
                    </strong>
                    {booking.cancelled.at && <span style={{ color: '#6e6e73' }}> · {time(booking.cancelled.at)}</span>}
                    {booking.cancelled.reason && <div>{t.bookings.reason}: {t.cancelReasons[booking.cancelled.reason]}</div>}
                    {booking.cancelled.note && <div style={{ color: '#424245', whiteSpace: 'pre-line' }}>{booking.cancelled.note}</div>}
                    {booking.refundedAmount > 0 && <div>{t.bookings.refunded}: {fmt(booking.refundedAmount)}</div>}
                  </div>
                )}

                {booking.status === 'CONFIRMED' && (
                  <p style={{ fontSize: 14, color: '#424245', lineHeight: 1.6, margin: '20px 0 0' }}>
                    {booking.canComplete ? null : <>{t.bookings.completeFrom(formatDate(booking.pickupDate, lang))} </>}
                    {t.bookings.confirmedNote} <Link to="/contact" style={{ color: '#0071e3', textDecoration: 'none' }}>{t.bookings.contactUs}</Link>
                  </p>
                )}
                {booking.returnLocation && <div style={{ marginTop: 16 }}><ReturnLocation location={booking.returnLocation} /></div>}
              </div>

              {/* Right: the booking itself, in a dark card like the one on the car's page. */}
              <aside className="booking-detail__card">
                <StatusBadge status={booking.status} />
                <div className="booking-detail__dates">
                  <div>
                    <span>{t.car.pickup}</span>
                    <strong>{shortDate(booking.pickupDate)}</strong>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 14 14" aria-hidden><path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <div>
                    <span>{t.car.return}</span>
                    <strong>{shortDate(booking.returnDate)}</strong>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 18px', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                  {t.common.days(booking.days)} · {booking.handover === 'DELIVERY' ? `${t.bookings.deliveryTo}: ${booking.deliveryAddress}` : t.bookings.pickupAt}
                </p>

                <div className="booking-detail__lines">
                  <div><span>{t.bookings.rental(t.common.days(booking.days))}</span><span>{fmt(booking.rentalPrice)}</span></div>
                  {booking.deliveryKm !== null && <div><span>{t.bookings.deliveryFee(booking.deliveryKm)}</span><span>{fmt(booking.deliveryFee)}</span></div>}
                  <div className="booking-detail__total"><span>{t.car.total}</span><span>{fmt(booking.total)}</span></div>
                  {booking.refundedAmount > 0 && <div><span>{t.bookings.refunded}</span><span>−{fmt(booking.refundedAmount)}</span></div>}
                </div>

                <div className="booking-detail__lines" style={{ marginTop: 14 }}>
                  <div><span>{t.bookings.phone2}</span><span>{formatPhone(booking.phone)}</span></div>
                  {booking.note && <div style={{ display: 'block' }}><span>{t.bookings.note2}</span><p style={{ margin: '4px 0 0', color: '#f5f5f7', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{booking.note}</p></div>}
                </div>

                {error && <p role="alert" style={{ fontSize: 14, color: '#ff6961', margin: '16px 0 0' }}>{t.bookings.errors[error]}</p>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
                  {booking.status === 'PENDING_PAYMENT' && (
                    <button onClick={pay} disabled={busy} className="booking-detail__btn booking-detail__btn--main">{busy ? t.bookings.redirecting : t.bookings.pay}</button>
                  )}
                  {booking.canComplete && (
                    <button onClick={() => setEnding(true)} disabled={busy} className="booking-detail__btn booking-detail__btn--main">{t.bookings.complete}</button>
                  )}
                  {booking.status === 'COMPLETED' && (
                    <Link to={`/cars/${booking.car.slug}#reviews`} className="booking-detail__btn booking-detail__btn--main">{t.bookings.reviewCar}</Link>
                  )}
                  {booking.canCancel && (
                    <button onClick={() => run(t.bookings.cancelFree, () => cancelBooking(id))} disabled={busy} className="booking-detail__btn booking-detail__btn--cancel">{t.bookings.cancel}</button>
                  )}
                </div>

                <p style={{ fontSize: 12, color: '#86868b', margin: '16px 0 0' }}>
                  {t.bookings.bookedOn(time(booking.createdAt))}
                  {booking.status === 'PENDING_PAYMENT' && booking.paymentExpiresAt && ` · ${t.bookings.payBy(time(booking.paymentExpiresAt))}`}
                </p>
              </aside>
            </div>
          </>
        )}
        {ending && (
          <ReturnLocationDialog
            fixedAddress={booking?.car.freeReturn === false ? booking.car.pickupAddress : undefined}
            onClose={() => setEnding(false)}
            onSubmit={async place => {
              setBooking(await completeBooking(id, place))
              setEnding(false)
            }}
          />
        )}
      </main>
    </div>
  )
}

// Paid → confirmed by the host → trip ended. Not shown for bookings that were cancelled, rejected or never paid in time.
function Progress({ status }: { status: BookingStatus }) {
  const { t } = useI18n()
  const steps = t.bookings.steps
  const reached = { PENDING_PAYMENT: 0, AWAITING_CONFIRMATION: 1, CONFIRMED: 2, COMPLETED: 3 }[status as 'CONFIRMED']
  if (reached === undefined) return null
  return (
    <ol className="booking-progress">
      {[steps.paid, steps.confirmed, steps.done].map((label, i) => (
        <li key={label} className={i < reached ? 'is-done' : i === reached ? 'is-current' : undefined}>
          <span className="booking-progress__dot" aria-hidden>{i < reached ? '✓' : i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  )
}

function Banner({ tone, children }: { tone: 'ok' | 'warn'; children: React.ReactNode }) {
  return (
    <div role="status" style={{ marginTop: 20, padding: '14px 18px', borderRadius: 14, fontSize: 14, lineHeight: 1.5, background: tone === 'ok' ? '#e3f6e8' : '#fff4e0', color: tone === 'ok' ? '#1b5e2c' : '#7a4a00' }}>
      {children}
    </div>
  )
}

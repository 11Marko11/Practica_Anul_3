import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { BookingCard } from '../components/BookingCard'
import { useI18n } from '../i18n/I18nContext'
import { myBookings, type Booking } from '../lib/bookings'
import { SimilarCars } from '../components/SimilarCars'
import { useCars } from '../lib/carStore'
import { recommendCars, useUnavailableCars } from '../lib/carFilters'
import { useRentalDates } from '../lib/useRentalDates'

export function MyBookings() {
  const { user, loading } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [failed, setFailed] = useState(false)
  const cars = useCars()
  // "Free right now" uses the same default period as the car list (today, 3 days), so the
  // links open the car with those dates already filled in.
  const { pickup, dropoff, query } = useRentalDates()
  const unavailable = useUnavailableCars(pickup, dropoff)

  useEffect(() => {
    if (user) myBookings().then(setBookings).catch(() => setFailed(true))
  }, [user])

  // Recommendations wait for both the bookings and today's availability, so a booked car never flashes in.
  const history = (bookings ?? []).map(b => cars.find(c => c.slug === b.car.slug)).filter(c => !!c)
  const recommended = bookings && unavailable ? recommendCars(cars.filter(c => !unavailable.includes(c.id)), history) : []

  if (loading) return <div style={{ minHeight: '80vh' }} />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '56px 24px 36px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 8px' }}>{t.bookings.eyebrow}</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{t.bookings.title}</h1>
        </div>
      </div>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 96px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {failed && <p style={{ fontSize: 15, color: '#d70015' }}>{t.bookings.errors.network}</p>}
        {!bookings && !failed && <p style={{ fontSize: 15, color: '#6e6e73' }}>{t.bookings.loading}</p>}
        {bookings?.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={{ fontSize: 18, color: '#1d1d1f', margin: '0 0 20px' }}>{t.bookings.empty}</p>
            <Link to="/marketplace" style={{ fontSize: 15, fontWeight: 500, padding: '12px 28px', borderRadius: 980, background: '#1d1d1f', color: '#fff', textDecoration: 'none' }}>
              {t.bookings.browse}
            </Link>
          </div>
        )}
        {bookings?.map(b => (
          <BookingCard key={b.id} booking={b} to={`/bookings/${b.id}`}>
            <Link to={`/bookings/${b.id}`} style={{ display: 'inline-block', marginTop: 10, fontSize: 14, color: '#0071e3', textDecoration: 'none' }}>
              {b.status === 'PENDING_PAYMENT' ? t.bookings.pay : t.admin.view} →
            </Link>
          </BookingCard>
        ))}
        {recommended.length > 0 && (
          <SimilarCars
            cars={recommended}
            query={query}
            title={t.bookings.recommended}
            subtitle={history.length ? t.bookings.recommendedText : t.bookings.recommendedNew}
          />
        )}
      </main>
    </div>
  )
}

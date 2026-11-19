import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { isAdmin } from '../auth/admin'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { StatusBadge } from '../components/BookingCard'
import { Stars } from '../components/CarReviews'
import { photoUrl } from '../data/cars'
import { useI18n } from '../i18n/I18nContext'
import { api } from '../lib/api'
import type { BookingStatus } from '../lib/bookings'
import { formatPhone } from '../lib/phone'
import { formatDate } from '../lib/rental'

type ReviewBit = { rating: number; text: string; date: string }
type CustomerProfileData = {
  customer: {
    id: string; name: string; avatarUrl: string | null; memberSince: string
    verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
    deleted: boolean; isHost: boolean
    email: string | null; phone: string | null // admins only
  }
  stats: { trips: number; rating: number | null; hostReviews: number; reviewsLeft: number }
  rentals: {
    id: string; status: BookingStatus; pickupDate: string; returnDate: string; days: number
    car: { slug: string | null; name: string; photo: string | null; host: { id: number; name: string } }
    review: ReviewBit | null // what the customer wrote about the car
    hostReview: (ReviewBit & { host: { id: number; name: string } }) | null // what the host wrote about the customer
  }[]
}

// /customers/:id: a customer's profile, for admins and hosts only. The cars they rented, the
// reviews they left and what the hosts wrote about them after each trip.
export function CustomerProfile() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div style={{ minHeight: '80vh' }} />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!isAdmin(user) && !user.host) return <Navigate to="/" replace />
  return <ProfileContent />
}

function ProfileContent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { lang, t } = useI18n()
  const c = t.customerProfile
  const [data, setData] = useState<CustomerProfileData | null | undefined>(undefined)

  useEffect(() => {
    setData(undefined)
    api<CustomerProfileData>(`/customers/${id}`).then(setData).catch(() => setData(null))
  }, [id])

  const back = <button onClick={() => navigate(-1)} className="btn-action btn-action--neutral btn-back" style={{ background: '#2c2c2e', color: '#f5f5f7', borderColor: '#3a3a3d' }}>{c.back}</button>
  if (data === undefined) return <div style={{ minHeight: '80vh' }} />
  if (data === null) {
    return (
      <div style={{ paddingTop: 64, textAlign: 'center', padding: '140px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1d1d1f', margin: '0 0 20px' }}>{c.notFound}</h1>
        <button onClick={() => navigate(-1)} className="btn-action btn-action--neutral btn-back">{c.back}</button>
      </div>
    )
  }

  const { customer, stats, rentals } = data
  const date = (iso: string) => formatDate(iso, lang)
  const verified = customer.verificationStatus === 'VERIFIED'

  return (
    <div style={{ paddingTop: 64 }}>
      <div style={{ padding: '48px 24px 40px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {back}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 28, flexWrap: 'wrap' }}>
            <Avatar name={customer.name} url={customer.avatarUrl} size={80} background="#3a3a3d" color="#f5f5f7" />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 6px' }}>{customer.isHost ? c.eyebrowHost : c.eyebrow}</p>
              <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05, overflowWrap: 'anywhere' }}>{customer.name}</h1>
              <p style={{ fontSize: 14, color: '#a1a1a6', margin: '8px 0 0' }}>
                <span style={{ color: verified ? '#30d158' : '#ffb340' }}>{t.profile.status[customer.verificationStatus]}</span>
                {' · '}{c.since(date(customer.memberSince))}
                {customer.deleted && <> · <span style={{ color: '#ff6961' }}>{c.deleted}</span></>}
              </p>
              {(customer.email || customer.phone) && (
                <p style={{ fontSize: 14, color: '#a1a1a6', margin: '4px 0 0', overflowWrap: 'anywhere' }}>
                  {customer.email}{customer.email && customer.phone && ' · '}{customer.phone && formatPhone(customer.phone)}
                </p>
              )}
            </div>
          </div>

          <div className="host-stats">
            <Stat label={c.rating} value={stats.rating !== null ? `★ ${stats.rating.toFixed(1)}` : '—'} sub={c.hostReviews(stats.hostReviews)} />
            <Stat label={c.trips} value={String(stats.trips)} />
            <Stat label={c.rentals} value={String(rentals.length)} />
            <Stat label={c.reviewsLeft} value={String(stats.reviewsLeft)} />
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px 96px' }}>
        <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '0 0 8px' }}>{c.rentalsTitle}</h2>
        <p style={{ fontSize: 14, color: '#6e6e73', margin: '0 0 24px', lineHeight: 1.5 }}>{c.rentalsIntro}</p>
        {rentals.length === 0 && <p style={{ fontSize: 15, color: '#6e6e73' }}>{c.noRentals}</p>}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rentals.map(r => (
            <li key={r.id} style={{ padding: 18, borderRadius: 18, border: '1px solid #e5e5ea', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {r.car.slug ? (
                  <Link to={`/cars/${r.car.slug}`} className="booking-thumb">
                    {r.car.photo && <img src={photoUrl(r.car.photo, 240, 150)} alt={r.car.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </Link>
                ) : (
                  <div className="booking-thumb">
                    {r.car.photo && <img src={photoUrl(r.car.photo, 240, 150)} alt={r.car.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>{r.car.name}</strong>
                    <StatusBadge status={r.status} />
                  </div>
                  <div style={{ fontSize: 14, color: '#424245', marginTop: 4 }}>{date(r.pickupDate)} – {date(r.returnDate)} · {t.common.days(r.days)}</div>
                  <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>
                    {c.host} <Link to={`/hosts/${r.car.host.id}`} style={{ color: '#0071e3', textDecoration: 'none' }}>{r.car.host.name}</Link>
                  </div>
                </div>
              </div>
              {r.status === 'COMPLETED' && (
                <div className="customer-review-pair">
                  <ReviewBox title={c.customerReview} review={r.review} empty={c.noCustomerReview} date={date} />
                  <ReviewBox title={r.hostReview ? c.hostReviewBy(r.hostReview.host.name) : c.hostReview} review={r.hostReview} empty={c.noHostReview} date={date} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

function ReviewBox({ title, review, empty, date }: { title: string; review: ReviewBit | null; empty: string; date: (iso: string) => string }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 14, background: '#f5f5f7', minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</div>
      {review ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#86868b', marginTop: 6 }}>
            <Stars rating={review.rating} size={13} /> {date(review.date)}
          </div>
          <p style={{ fontSize: 14, color: '#1d1d1f', margin: '6px 0 0', lineHeight: 1.5, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{review.text}</p>
        </>
      ) : (
        <p style={{ fontSize: 13, color: '#86868b', margin: '6px 0 0' }}>{empty}</p>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: '16px 18px', borderRadius: 16, background: '#2c2c2e' }}>
      <div style={{ fontSize: 13, color: '#a1a1a6' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f7', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#a1a1a6', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

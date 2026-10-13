import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Money } from '../components/Money'
import { photoUrl } from '../data/cars'
import { useI18n } from '../i18n/I18nContext'
import { api } from '../lib/api'
import type { BookingStatus } from '../lib/bookings'
import { formatDate } from '../lib/rental'
import { useUrlParams } from '../lib/useUrlParams'

type CarRef = { id: number; slug: string; brand: string; model: string }
type Period = { pickupDate: string; returnDate: string }
type HostData = {
  host: { id: number; name: string; phone: string | null; rating: number | null; reviews: number; trips: number; earned: number; upcoming: number }
  cars: (CarRef & {
    year: number
    photo: string | null
    pricePerDay: number
    city: string
    status: 'ACTIVE' | 'HIDDEN'
    rating: number | null
    reviews: number
    trips: number
    earned: number
    rentedNow: Period | null
    nextBooking: Period | null
  })[]
  bookings: (Period & {
    id: string
    car: CarRef
    days: number
    handover: 'PICKUP' | 'DELIVERY'
    deliveryAddress: string | null
    status: BookingStatus
    total: number
    earned: number
    customer: { name: string; phone: string } | null // only once the booking is confirmed
    createdAt: string
  })[]
  reviews: { id: string; car: CarRef; name: string; rating: number; text: string; date: string }[]
}

const TABS = ['cars', 'bookings', 'reviews'] as const
type Tab = (typeof TABS)[number]

// /host: what a user with the host role follows about their cars. Read-only: bookings are
// confirmed by the admin.
export function HostPanel() {
  const { user, loading } = useAuth()
  const { t } = useI18n()
  const location = useLocation()

  if (loading) return <div style={{ minHeight: '70vh' }} />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!user.host) {
    return (
      <div style={{ paddingTop: 52, textAlign: 'center', padding: '140px 24px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '0 0 8px' }}>{t.hostPortal.notHost}</h1>
        <p style={{ fontSize: 16, color: '#6e6e73', margin: '0 0 24px' }}>{t.hostPortal.notHostText}</p>
        <Link to="/" style={{ fontSize: 15, fontWeight: 500, padding: '12px 28px', borderRadius: 980, background: '#1d1d1f', color: '#fff', textDecoration: 'none' }}>{t.admin.backHome}</Link>
      </div>
    )
  }
  return <HostPanelContent />
}

function HostPanelContent() {
  const { lang, t } = useI18n()
  const h = t.hostPortal
  const [data, setData] = useState<HostData | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    api<HostData>('/host').then(setData).catch(() => setFailed(true))
  }, [])

  const { params, edit } = useUrlParams()
  const tab: Tab = TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'cars'
  const carId = params.get('car') ?? ''
  const setParam = (key: string, value: string, fallback: string) => edit(p => (value && value !== fallback ? p.set(key, value) : p.delete(key)))
  const date = (iso: string) => formatDate(iso, lang)

  const bookings = (data?.bookings ?? []).filter(b => !carId || String(b.car.id) === carId)
  const reviews = (data?.reviews ?? []).filter(r => !carId || String(r.car.id) === carId)
  const counts: Record<Tab, number> = { cars: data?.cars.length ?? 0, bookings: data?.bookings.length ?? 0, reviews: data?.reviews.length ?? 0 }

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '48px 24px 36px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 8px' }}>{h.eyebrow}</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{data?.host.name ?? '…'}</h1>
          <p style={{ fontSize: 14, color: '#a1a1a6', margin: '12px 0 0', maxWidth: 620, lineHeight: 1.5 }}>{h.intro}</p>
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 96px' }}>
        {failed && <p style={{ fontSize: 15, color: '#d70015' }}>{t.marketplace.loadError}</p>}
        {data && (
          <>
            <div className="dashboard-tiles">
              <Tile label={h.tiles.cars} value={String(data.cars.length)} />
              <Tile label={h.tiles.rating} value={data.host.rating !== null ? `★ ${data.host.rating.toFixed(1)}` : h.noRating} sub={h.reviewsCount(data.host.reviews)} />
              <Tile label={h.tiles.trips} value={String(data.host.trips)} />
              <Tile label={h.tiles.earned} value={<Money value={data.host.earned} />} />
              <Tile label={h.tiles.upcoming} value={String(data.host.upcoming)} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '32px 0 16px' }}>
              {TABS.map(x => (
                <button
                  key={x}
                  onClick={() => setParam('tab', x, 'cars')}
                  aria-pressed={tab === x}
                  style={{ fontSize: 14, fontWeight: 500, padding: '8px 16px', borderRadius: 980, border: '1px solid', borderColor: tab === x ? '#1d1d1f' : '#d2d2d7', background: tab === x ? '#1d1d1f' : '#fff', color: tab === x ? '#fff' : '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {h.tabs[x]} ({counts[x]})
                </button>
              ))}
              {tab !== 'cars' && data.cars.length > 1 && (
                <select value={carId} onChange={e => setParam('car', e.target.value, '')} aria-label={h.allCars} style={{ marginLeft: 'auto', fontSize: 14, padding: '8px 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', fontFamily: 'inherit', maxWidth: '100%' }}>
                  <option value="">{h.allCars}</option>
                  {data.cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} {c.year}</option>)}
                </select>
              )}
            </div>

            {tab === 'cars' && (
              <ul style={list}>
                {data.cars.length === 0 && <Empty text={h.noCars} />}
                {data.cars.map(car => (
                  <li key={car.id} className="admin-row" style={row}>
                    <div style={{ width: 120, aspectRatio: '16/10', borderRadius: 10, overflow: 'hidden', background: '#e8e8ed', flexShrink: 0 }}>
                      {car.photo && <img src={photoUrl(car.photo, 240, 150)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>
                        {car.brand} {car.model} <span style={{ fontWeight: 400, color: '#6e6e73' }}>· {car.year}</span>
                        {car.status === 'HIDDEN' && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: '#6e6e73', background: '#f0f0f0', padding: '2px 8px', borderRadius: 980 }}>{h.hidden}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>
                        <Money value={car.pricePerDay} />{t.common.perDay} · {car.city} · {car.rating !== null ? `★ ${car.rating.toFixed(1)} (${h.reviewsCount(car.reviews)})` : t.car.hostNoReviews} · {t.common.trips(car.trips)}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4, color: car.rentedNow ? '#b25000' : '#1b7a35' }}>
                        {car.rentedNow ? h.rentedNow(date(car.rentedNow.returnDate)) : car.nextBooking ? <span style={{ color: '#424245' }}>{h.next(date(car.nextBooking.pickupDate), date(car.nextBooking.returnDate))}</span> : h.free}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: '#86868b' }}>{h.earned}</span>
                      <strong style={{ fontSize: 16, color: '#1d1d1f' }}><Money value={car.earned} /></strong>
                      <Link to={`/cars/${car.slug}`} style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none' }}>{h.view}</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {tab === 'bookings' && (
              <ul style={list}>
                {bookings.length === 0 && <Empty text={h.noBookings} />}
                {bookings.map(b => (
                  <li key={b.id} style={{ ...row, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{b.car.brand} {b.car.model}</strong>
                        <StatusPill status={b.status} />
                      </div>
                      <div style={{ fontSize: 14, color: '#424245', marginTop: 4 }}>
                        {date(b.pickupDate)} – {date(b.returnDate)} · {t.common.days(b.days)}
                      </div>
                      <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>{b.handover === 'DELIVERY' && b.deliveryAddress ? h.delivery(b.deliveryAddress) : h.pickup}</div>
                    </div>
                    <div style={{ flex: '1 1 200px', fontSize: 13, color: '#6e6e73' }}>
                      <div style={{ color: '#86868b' }}>{h.customer}</div>
                      {b.customer ? (
                        <div style={{ color: '#1d1d1f', marginTop: 2 }}>
                          {b.customer.name} · <a href={`tel:${b.customer.phone}`} style={{ color: '#0071e3', textDecoration: 'none' }}>{b.customer.phone}</a>
                        </div>
                      ) : (
                        <div style={{ marginTop: 2 }}>{h.contactLater}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <strong style={{ fontSize: 16, color: '#1d1d1f' }}><Money value={b.total} /></strong>
                      {b.earned > 0 && b.earned !== b.total && <div style={{ fontSize: 12, color: '#86868b' }}>{h.earned}: <Money value={b.earned} /></div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {tab === 'reviews' && (
              <ul style={list}>
                {reviews.length === 0 && <Empty text={h.noReviews} />}
                {reviews.map(r => (
                  <li key={r.id} style={row}>
                    <div style={{ fontSize: 14, color: '#1d1d1f' }}>
                      <strong style={{ fontWeight: 600 }}>{r.car.brand} {r.car.model}</strong> · <span style={{ color: '#ff9f0a' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span> · {r.name} · <span style={{ color: '#86868b' }}>{date(r.date)}</span>
                    </div>
                    <p style={{ fontSize: 14, color: '#424245', margin: '6px 0 0', whiteSpace: 'pre-line' }}>{r.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: '#f5f5f7', minWidth: 0, containerType: 'inline-size' }}>
      <div style={{ fontSize: 13, color: '#6e6e73' }}>{label}</div>
      <div className="tile-value" style={{ fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', marginTop: 4, whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#86868b', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function StatusPill({ status }: { status: BookingStatus }) {
  const { t } = useI18n()
  const color: Partial<Record<BookingStatus, [string, string]>> = {
    AWAITING_CONFIRMATION: ['#fff4e5', '#b25000'],
    CONFIRMED: ['#e8f1fd', '#0071e3'],
    COMPLETED: ['#e3f6e8', '#1b7a35'],
  }
  const [bg, fg] = color[status] ?? ['#f2f2f4', '#6e6e73']
  return <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 980, background: bg, color: fg, whiteSpace: 'nowrap' }}>{t.bookings.status[status]}</span>
}

function Empty({ text }: { text: string }) {
  return <p style={{ fontSize: 15, color: '#6e6e73', padding: '24px 0' }}>{text}</p>
}

const list: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0 }
const row: React.CSSProperties = { padding: '16px 0', borderBottom: '1px solid #f0f0f0' }

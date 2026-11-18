import { useEffect, useRef, useState } from 'react'
import { CAR_REVIEW_COLORS, type CarReviewStatus } from '../lib/privateDocuments'
import { same, useLivePoll } from '../lib/livePoll'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Money } from '../components/Money'
import { photoUrl } from '../data/cars'
import { Avatar } from '../components/Avatar'
import { useI18n } from '../i18n/I18nContext'
import { api, ApiError } from '../lib/api'
import { hostCompleteBooking, hostConfirmBooking, type BookingStatus } from '../lib/bookings'
import { refreshHostAwaiting } from '../lib/hostNotifications'
import { CountBadge } from '../components/CountBadge'
import { CarConditionDialog } from '../components/CarConditionDialog'
import { HiddenVeil } from '../components/HiddenVeil'
import { CAR_CONDITIONS, CONDITION_COLORS, setCarCondition, type CarCondition } from '../lib/carCondition'
import { CloseBookingDialog } from './admin/CloseBookingDialog'
import { HostFinances } from './HostFinances'
import { FILTERS, HostReviews, shownReviews, tripShown, type HostReview } from './HostReviews'
import { ReturnLocationDialog } from '../components/ReturnLocationDialog'
import { ReturnLocation } from '../components/ReturnLocation'
import { fmt, formatDate } from '../lib/rental'
import { useUrlParams } from '../lib/useUrlParams'

type CarRef = { id: number; slug: string; brand: string; model: string }
type Period = { pickupDate: string; returnDate: string }
type HostData = {
  host: { id: number; name: string; phone: string | null; rating: number | null; reviews: number; trips: number; earned: number; awaiting: number }
  cars: (CarRef & {
    year: number
    photo: string | null
    pricePerDay: number
    city: string
    status: 'ACTIVE' | 'HIDDEN'
    reviewStatus: CarReviewStatus // the admin's check of the car's papers
    reviewNote: string | null
    condition: CarCondition // available, or why not (cleaning, garage…)
    conditionNote: string | null
    conditionSince: string | null
    rating: number | null
    reviews: number
    trips: number
    earned: number
    rentedNow: Period | null
    nextBooking: Period | null
  })[]
  bookings: (Period & {
    id: string
    car: CarRef & { photo: string | null }
    days: number
    handover: 'PICKUP' | 'DELIVERY'
    deliveryAddress: string | null
    status: BookingStatus
    total: number
    earned: number
    refundedAmount: number
    commissionRate: number | null // Rent Motors' share (%) once confirmed
    canComplete: boolean // confirmed, from the pick-up day on
    returnLocation: { address: string; lat: number; lng: number; by: string | null } | null // where the car was left
    customer: { name: string; avatarUrl: string | null; phone: string | null } // the phone only once the booking is confirmed
    holdExpiresAt: string | null // answer before then, or Stripe releases the payment
    createdAt: string
  })[]
  reviews: HostReview[]
}

const TABS = ['cars', 'bookings', 'finances', 'reviews'] as const
type Tab = (typeof TABS)[number]

// /host: what a user with the host role follows about their cars. The host adds and edits their
// cars and confirms or rejects the paid bookings of them.
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
  const load = () => api<HostData>('/host').then(setData).catch(() => setFailed(true))
  const [busyId, setBusyId] = useState<string | null>(null)
  const [closing, setClosing] = useState<{ booking: HostData['bookings'][number]; mode: 'reject' | 'cancel' } | null>(null)

  // Confirm a paid booking: the money is taken from the customer's card.
  async function confirmBooking(b: HostData['bookings'][number]) {
    if (!confirm(h.confirmAsk(fmt(b.total)))) return
    setBusyId(b.id)
    try {
      await hostConfirmBooking(b.id)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown'
      const errors = t.adminBookings.errors
      alert(code in errors ? errors[code as keyof typeof errors] : errors.unknown)
    }
    setBusyId(null)
    await Promise.all([load(), refreshHostAwaiting()])
  }

  // The car was returned: the host says where it was left, then the trip ends.
  const [ending, setEnding] = useState<HostData['bookings'][number] | null>(null)
  // The car whose state (cleaning, garage…) the host is changing.
  const [changing, setChanging] = useState<HostData['cars'][number] | null>(null)
  useEffect(() => {
    load()
  }, [])
  // New bookings, reviews and the admin's check of the cars show without a refresh.
  useLivePoll(() => { api<HostData>('/host').then(next => setData(prev => (same(prev, next) ? prev : next))).catch(() => {}) }, 30_000, !busyId && !closing && !ending && !changing)

  // The car is back on the site (if its papers are approved and it isn't hidden).
  async function makeReady(car: HostData['cars'][number]) {
    try {
      await setCarCondition(car.id, 'READY')
      await load()
    } catch {
      alert(t.carCondition.saveError)
    }
  }

  // The car leaves the site at once; the server refuses while a booking is still going on.
  async function remove(car: CarRef) {
    if (!confirm(h.deleteAsk(`${car.brand} ${car.model}`))) return
    try {
      await api(`/host/cars/${car.id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      alert(err instanceof ApiError && err.code === 'car-has-active-bookings' ? h.activeBookings : h.deleteError)
    }
  }

  const { params, edit } = useUrlParams()
  const tab: Tab = TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'cars'
  const carId = params.get('car') ?? ''
  // The cars tab can show only the cars in one state (cleaning, in service…).
  const state = CAR_CONDITIONS.includes(params.get('state') as CarCondition) ? (params.get('state') as CarCondition) : ''
  const setParam = (key: string, value: string, fallback: string) => edit(p => (value && value !== fallback ? p.set(key, value) : p.delete(key)))
  const date = (iso: string) => formatDate(iso, lang)

  // Bookings waiting for an answer come first.
  const bookings = (data?.bookings ?? [])
    .filter(b => !carId || String(b.car.id) === carId)
    .sort((a, b) => Number(b.status === 'AWAITING_CONFIRMATION') - Number(a.status === 'AWAITING_CONFIRMATION'))

  // On the reviews tab the tiles follow the filters: the rating is of the reviews shown there…
  const rated = data && tab === 'reviews' ? shownReviews(data.reviews, params) : null
  const rating = rated
    ? { value: rated.length ? Math.round((rated.reduce((sum, x) => sum + x.rating, 0) / rated.length) * 10) / 10 : null, count: rated.length }
    : { value: data?.host.rating ?? null, count: data?.host.reviews ?? 0 }
  // …and so are the cars in them and the finished trips that pass the same filters.
  // Without filters, all the host's cars count, also those without reviews.
  const carCount = rated && FILTERS.some(k => params.has(k)) ? new Set(rated.map(x => x.car.id)).size : data?.cars.length ?? 0
  const tripCount = data && tab === 'reviews'
    ? data.bookings.filter(b => b.status === 'COMPLETED' && tripShown(b, data.reviews, params)).length
    : data?.host.trips ?? 0

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '40px 24px 36px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <HostTabs tab={tab} onTab={x => setParam('tab', x, 'cars')} awaiting={data?.host.awaiting ?? 0} />
          <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 8px' }}>{h.eyebrow}</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{data?.host.name ?? '…'}</h1>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, color: '#a1a1a6', margin: '12px 0 0', maxWidth: 620, lineHeight: 1.5 }}>{h.intro}</p>
            <Link to="/host/cars/new" style={{ fontSize: 15, fontWeight: 500, padding: '12px 24px', borderRadius: 980, background: '#f5f5f7', color: '#1c1c1e', textDecoration: 'none' }}>{h.addCar}</Link>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 96px' }}>
        {failed && <p style={{ fontSize: 15, color: '#d70015' }}>{t.marketplace.loadError}</p>}
        {data && (
          <>
            {/* Finances has its own summary. */}
            {tab !== 'finances' && (
              <div className="dashboard-tiles">
                <Tile label={h.tiles.cars} value={String(carCount)} />
                <Tile label={h.tiles.rating} value={rating.value !== null ? `★ ${rating.value.toFixed(1)}` : h.noRating} sub={h.reviewsCount(rating.count)} />
                <Tile label={h.tiles.trips} value={String(tripCount)} />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '32px 0 16px' }}>
              {tab === 'bookings' && data.cars.length > 1 && (
                <select value={carId} onChange={e => setParam('car', e.target.value, '')} aria-label={h.allCars} style={{ marginLeft: 'auto', fontSize: 14, padding: '8px 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', fontFamily: 'inherit', maxWidth: '100%' }}>
                  <option value="">{h.allCars}</option>
                  {data.cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} {c.year}</option>)}
                </select>
              )}
            </div>

            {tab === 'cars' && data.cars.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {(['', ...CAR_CONDITIONS] as const)
                  .filter(k => !k || k === 'READY' || data.cars.some(c => c.condition === k) || k === state)
                  .map(k => {
                    const on = state === k
                    const n = k ? data.cars.filter(c => c.condition === k).length : data.cars.length
                    return (
                      <button
                        key={k || 'all'}
                        onClick={() => setParam('state', k, '')}
                        aria-pressed={on}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 14px', borderRadius: 980, border: '1px solid', borderColor: on ? '#1d1d1f' : '#d2d2d7', background: on ? '#1d1d1f' : 'transparent', color: on ? '#fff' : '#424245', cursor: 'pointer' }}
                      >
                        {k && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: CONDITION_COLORS[k].color }} />}
                        {k ? t.carCondition.names[k] : t.carCondition.filterAll} ({n})
                      </button>
                    )
                  })}
              </div>
            )}
            {tab === 'cars' && (
              <ul style={list}>
                {data.cars.length === 0 && <Empty text={h.noCars} />}
                {data.cars.length > 0 && state && !data.cars.some(c => c.condition === state) && <Empty text={t.carCondition.noMatch} />}
                {data.cars.filter(c => !state || c.condition === state).map(car => (
                  <li key={car.id} className="admin-row" style={row}>
                    <div className="car-row__main">
                    {car.status === 'HIDDEN' && <HiddenVeil label={t.admin.hidden} />}
                    <div style={{ width: 120, aspectRatio: '16/10', borderRadius: 10, overflow: 'hidden', background: '#e8e8ed', flexShrink: 0 }}>
                      {car.photo && <img src={photoUrl(car.photo, 240, 150)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>
                        {car.brand} {car.model} <span style={{ fontWeight: 400, color: '#6e6e73' }}>· {car.year}</span>
                        {car.reviewStatus !== 'APPROVED' && (
                          <span style={{ display: 'inline-block', whiteSpace: 'nowrap', verticalAlign: 'middle', marginLeft: 8, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 980, ...CAR_REVIEW_COLORS[car.reviewStatus] }}>
                            {t.carPapers.status[car.reviewStatus]}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '2px 9px', borderRadius: 980, ...CONDITION_COLORS[car.condition] }}>
                          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: CONDITION_COLORS[car.condition].color }} />
                          {t.carCondition.names[car.condition]}
                        </span>
                        {car.condition !== 'READY' && (
                          <span style={{ fontSize: 12, color: '#6e6e73' }}>
                            {t.carCondition.offSite}{car.conditionSince && ` · ${t.carCondition.since(date(car.conditionSince.slice(0, 10)))}`}
                          </span>
                        )}
                      </div>
                      {car.condition !== 'READY' && car.conditionNote && (
                        <div style={{ fontSize: 13, color: '#424245', marginTop: 2, overflowWrap: 'anywhere' }}>„{car.conditionNote}”</div>
                      )}
                      {car.reviewStatus === 'NO_DOCUMENTS' && (
                        <div style={{ fontSize: 13, color: '#424245', marginTop: 2 }}>{t.carPapers.noDocsShort}</div>
                      )}
                      {car.reviewStatus === 'REJECTED' && car.reviewNote && (
                        <div style={{ fontSize: 13, color: '#b3261e', marginTop: 2 }}>{t.carPapers.reason}: {car.reviewNote}</div>
                      )}
                      <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>
                        <Money value={car.pricePerDay} />{t.common.perDay} · {car.city} · {car.rating !== null ? `★ ${car.rating.toFixed(1)} (${h.reviewsCount(car.reviews)})` : t.car.hostNoReviews} · {t.common.trips(car.trips)}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4, color: car.rentedNow ? '#b25000' : '#1b7a35' }}>
                        {car.rentedNow ? h.rentedNow(date(car.rentedNow.returnDate)) : car.nextBooking ? <span style={{ color: '#424245' }}>{h.next(date(car.nextBooking.pickupDate), date(car.nextBooking.returnDate))}</span> : h.free}
                      </div>
                    </div>
                    </div>
                    <div className="host-car-side">
                      <span style={{ fontSize: 12, color: '#86868b' }}>{h.earned}</span>
                      <strong style={{ fontSize: 16, color: '#1d1d1f' }}><Money value={car.earned} /></strong>
                      <div className="row-actions" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                        {car.condition === 'READY'
                          ? <button onClick={() => setChanging(car)} className="btn-action btn-action--neutral">{t.carCondition.change}</button>
                          : <button onClick={() => makeReady(car)} className="btn-action btn-action--neutral">{t.carCondition.makeReady}</button>}
                        {car.status === 'ACTIVE' && car.reviewStatus === 'APPROVED' && car.condition === 'READY' && <Link to={`/cars/${car.slug}`} className="btn-action btn-action--neutral">{h.view}</Link>}
                        <Link to={`/host/cars/${car.id}`} className="btn-action btn-action--primary">{h.edit}</Link>
                        <button onClick={() => remove(car)} className="btn-action btn-action--danger">{h.delete}</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {tab === 'bookings' && (
              <ul style={list}>
                {bookings.length === 0 && <Empty text={h.noBookings} />}
                {/* Column names once, above the bookings (on wide screens, where the columns line up). */}
                {bookings.length > 0 && (
                  <li className="booking-cols-head" aria-hidden="true">
                    <span style={{ flex: '1 1 300px' }}>{h.columns.car}</span>
                    <span style={{ flex: '1 1 200px' }}>{h.columns.customer}</span>
                    <span style={{ flex: '0 0 130px', textAlign: 'right' }}>{h.columns.total}</span>
                  </li>
                )}
                {bookings.map(b => (
                  <li key={b.id} style={{ ...row, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <Link to={`/cars/${b.car.slug}`} className="booking-thumb">
                      {b.car.photo && <img src={photoUrl(b.car.photo, 240, 150)} alt={`${b.car.brand} ${b.car.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                    </Link>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{b.car.brand} {b.car.model}</strong>
                        <StatusPill status={b.status} />
                      </div>
                      <div style={{ fontSize: 14, color: '#424245', marginTop: 4 }}>
                        {date(b.pickupDate)} – {date(b.returnDate)} · {t.common.days(b.days)}
                      </div>
                      <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>{b.handover === 'DELIVERY' && b.deliveryAddress ? h.delivery(b.deliveryAddress) : h.pickup}</div>
                      {b.returnLocation && <ReturnLocation location={b.returnLocation} />}
                    </div>
                    </div>
                    <div style={{ flex: '1 1 200px', fontSize: 13, color: '#6e6e73' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={b.customer.name} url={b.customer.avatarUrl} size={40} />
                        <div style={{ color: '#1d1d1f', minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{b.customer.name}</div>
                          {b.customer.phone ? <a href={`tel:${b.customer.phone}`} style={{ color: '#0071e3', textDecoration: 'none' }}>{b.customer.phone}</a> : <div style={{ color: '#6e6e73' }}>{h.contactLater}</div>}
                        </div>
                      </div>
                    </div>
                    <div className="booking-total">
                      <strong style={{ fontSize: 16, color: '#1d1d1f' }}><Money value={b.total} /></strong>
                      {b.earned > 0 && b.earned !== b.total && <div style={{ fontSize: 12, color: '#86868b' }}>{h.earned}: <Money value={b.earned} /></div>}
                    </div>
                    {b.status === 'AWAITING_CONFIRMATION' && (
                      <div style={{ flexBasis: '100%', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 14px', borderRadius: 14, background: '#fff4e0' }}>
                        <div style={{ flex: '1 1 240px', fontSize: 13, color: '#9a5b00' }}>
                          <strong style={{ fontWeight: 600 }}>{h.awaitingTitle}</strong>
                          {b.holdExpiresAt && <div>{h.answerBy(new Date(b.holdExpiresAt).toLocaleString(lang, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}</div>}
                        </div>
                        <div className="row-actions">
                          <button onClick={() => confirmBooking(b)} disabled={busyId === b.id} className="btn-action btn-action--primary">{h.confirm}</button>
                          <button onClick={() => setClosing({ booking: b, mode: 'reject' })} disabled={busyId === b.id} className="btn-action btn-action--danger">{h.reject}</button>
                        </div>
                      </div>
                    )}
                    {b.status === 'CONFIRMED' && (
                      <div className="row-actions" style={{ flexBasis: '100%' }}>
                        {b.canComplete && <button onClick={() => setEnding(b)} disabled={busyId === b.id} className="btn-action btn-action--primary">{t.returnPlace.submit}</button>}
                        <button onClick={() => setClosing({ booking: b, mode: 'cancel' })} disabled={busyId === b.id} className="btn-action btn-action--danger">{t.adminBookings.cancel}</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {tab === 'finances' && <HostFinances />}

            {tab === 'reviews' && <HostReviews reviews={data.reviews} />}
          </>
        )}
      </main>
      {changing && (
        <CarConditionDialog
          car={changing}
          onClose={() => setChanging(null)}
          onDone={async () => {
            setChanging(null)
            await load()
          }}
        />
      )}
      {ending && (
        <ReturnLocationDialog
          onClose={() => setEnding(null)}
          onSubmit={async place => {
            await hostCompleteBooking(ending.id, place)
            setEnding(null)
            await load()
          }}
        />
      )}
      {closing && (
        <CloseBookingDialog
          booking={closing.booking}
          mode={closing.mode}
          onClose={() => setClosing(null)}
          onDone={() => { setClosing(null); load(); refreshHostAwaiting() }}
        />
      )}
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

// The host panel's sections, centred at the top of the page header; they scroll away with it.
function HostTabs({ tab, onTab, awaiting }: { tab: Tab; onTab: (tab: Tab) => void; awaiting: number }) {
  const { t } = useI18n()
  const h = t.hostPortal
  const bar = useRef<HTMLElement>(null)
  // On narrow screens the bar scrolls sideways: bring the current section into view.
  useEffect(() => {
    const center = () => {
      const active = bar.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
      if (bar.current && active) bar.current.scrollLeft = active.offsetLeft - (bar.current.clientWidth - active.offsetWidth) / 2
    }
    center()
    // Again whenever the tabs change width (the web font arriving, a red counter appearing).
    const inner = bar.current?.firstElementChild
    if (!inner) return
    const watch = new ResizeObserver(center)
    watch.observe(inner)
    return () => watch.disconnect()
  }, [tab])
  return (
    <>
      <nav ref={bar} className="host-tabs">
        <div className="admin-tabs-inner" style={{ padding: '0 24px 24px' }}>
          {TABS.map(x => (
            <button
              key={x}
              onClick={() => onTab(x)}
              aria-pressed={tab === x}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, padding: '8px 16px', borderRadius: 980, border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', background: tab === x ? '#f5f5f7' : 'transparent', color: tab === x ? '#1c1c1e' : '#a1a1a6' }}
            >
              {h.tabs[x]}
              {x === 'bookings' && <CountBadge n={awaiting} />}
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}

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
import { useUrlParams } from '../lib/useUrlParams'
import { useKeepHeight } from '../lib/useKeepHeight'
import { ResetButton } from '../components/ResetButton'
import { same, useLivePoll } from '../lib/livePoll'
import { formatDate } from '../lib/rental'
import { Money } from '../components/Money'
import { pageFrom, Pagination } from '../components/Pagination'
import { PERIODS, periodRange, today, type PeriodChoice } from '../lib/periods'

const GROUPS = ['all', 'active', 'waiting', 'completed', 'cancelled'] as const
const SORTS = ['newest', 'oldest', 'priceDesc', 'priceAsc'] as const
type Group = (typeof GROUPS)[number]
type Period = PeriodChoice
type Sort = (typeof SORTS)[number]
const PAGE_SIZE = 10

const daysUntil = (date: string) => Math.round((Date.parse(date) - Date.parse(today())) / 86_400_000)

function groupOf(b: Booking): Exclude<Group, 'all'> {
  if (b.status === 'COMPLETED') return 'completed'
  if (b.status === 'CANCELLED' || b.status === 'REJECTED' || b.status === 'EXPIRED') return 'cancelled'
  // Confirmed bookings count as in progress, also before the pick-up day (the card says when it starts).
  if (b.status === 'CONFIRMED') return 'active'
  return 'waiting' // waiting for the payment or for our confirmation
}

const COMPARE: Record<Sort, (a: Booking, b: Booking) => number> = {
  newest: (a, b) => b.pickupDate.localeCompare(a.pickupDate) || b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.pickupDate.localeCompare(b.pickupDate) || a.createdAt.localeCompare(b.createdAt),
  priceDesc: (a, b) => b.total - a.total,
  priceAsc: (a, b) => a.total - b.total,
}

export function MyBookings() {
  const { user, loading } = useAuth()
  const { lang, t } = useI18n()
  const mb = t.myBookings
  const location = useLocation()
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [failed, setFailed] = useState(false)
  const cars = useCars()
  // "Free right now" uses the same default period as the car list (today, 3 days), so the
  // links open the car with those dates already filled in.
  const { pickup, dropoff, query } = useRentalDates()
  const unavailable = useUnavailableCars(pickup, dropoff)

  const signedIn = !!user
  useEffect(() => {
    if (signedIn) myBookings().then(setBookings).catch(() => setFailed(true))
  }, [signedIn])
  // Status changes (confirmed, completed, refunded) show without a refresh.
  useLivePoll(() => { myBookings().then(next => setBookings(prev => (same(prev, next) ? prev : next))).catch(() => {}) }, 30_000, signedIn)

  // Recommendations wait for both the bookings and today's availability, so a booked car never flashes in.
  const history = (bookings ?? []).map(b => cars.find(c => c.slug === b.car.slug)).filter(c => !!c)
  const recommended = bookings && unavailable ? recommendCars(cars.filter(c => !unavailable.includes(c.id)), history) : []

  // Filters live in the URL, so Back from a booking keeps them.
  const { params, edit } = useUrlParams()
  // Typing in the search doesn't make the page jump up as the list gets shorter.
  const keep = useKeepHeight<HTMLElement>()
  const pick = <T extends string>(key: string, list: readonly T[], fallback: T) => (list.includes(params.get(key) as T) ? (params.get(key) as T) : fallback)
  const group = pick('show', GROUPS, 'all')
  const period = pick('period', PERIODS, 'all')
  const sort = pick('sort', SORTS, 'newest')
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const search = params.get('q') ?? ''
  const set = (key: string, value: string, fallback = '') => edit(p => { if (value && value !== fallback) p.set(key, value); else p.delete(key); p.delete('page') })

  const all = bookings ?? []
  const [start, end] = periodRange(period, from, to)
  const q = search.trim().toLowerCase()
  // A booking is in the period when its days overlap it.
  const filtered = all.filter(b => (!start || b.returnDate >= start) && (!end || b.pickupDate <= end) && (!q || `${b.car.brand} ${b.car.model}`.toLowerCase().includes(q)))
  const list = filtered.filter(b => group === 'all' || groupOf(b) === group).sort(COMPARE[sort])
  const count = (g: Group) => filtered.filter(b => g === 'all' || groupOf(b) === g).length
  const pages = Math.ceil(list.length / PAGE_SIZE)
  const page = pageFrom(params, pages)
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  function goToPage(n: number) {
    edit(p => (n > 1 ? p.set('page', String(n)) : p.delete('page')), { push: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const filtering = group !== 'all' || period !== 'all' || !!q
  const spent = all.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED').reduce((s, b) => s + b.total - b.refundedAmount, 0)

  if (loading) return <div style={{ minHeight: '80vh' }} />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  // Hosts don't rent cars; their past bookings stay stored but are no longer shown.
  if (user.host) return <Navigate to="/host" replace />

  return (
    <div style={{ paddingTop: 64 }}>
      <div style={{ padding: '56px 24px 36px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 8px' }}>{t.bookings.eyebrow}</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{t.bookings.title}</h1>
        </div>
      </div>
      <main ref={keep.ref} style={{ minHeight: keep.minHeight, maxWidth: 900, margin: '0 auto', padding: '32px 24px 96px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
        {bookings && bookings.length > 0 && (
          <>
            <div className="dashboard-tiles">
              <Tile label={mb.summary.total} value={String(all.length)} />
              <Tile label={mb.summary.active} value={String(all.filter(b => groupOf(b) === 'active').length)} />
              <Tile label={mb.summary.spent} value={<Money value={spent} />} />
            </div>

            <div className="admin-car-toolbar" style={{ marginTop: 10 }}>
              <input type="search" value={search} onChange={e => set('q', e.target.value)} placeholder={mb.search} aria-label={mb.search} style={{ ...control, flex: '1 1 200px' }} />
              <label style={labelStyle}>
                {mb.period}
                <select value={period} onChange={e => set('period', e.target.value, 'all')} style={control}>
                  {PERIODS.map(o => <option key={o} value={o}>{mb.periods[o]}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                {mb.sortBy}
                <select value={sort} onChange={e => set('sort', e.target.value, 'newest')} style={control}>
                  {SORTS.map(o => <option key={o} value={o}>{mb.sorts[o]}</option>)}
                </select>
              </label>
            </div>
            {period === 'custom' && (
              <div className="admin-car-toolbar">
                <label style={labelStyle}>{mb.from}<input type="date" value={from} max={to || undefined} onChange={e => set('from', e.target.value)} style={control} /></label>
                <label style={labelStyle}>{mb.to}<input type="date" value={to} min={from || undefined} onChange={e => set('to', e.target.value)} style={control} /></label>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {GROUPS.map(g => (
                <button
                  key={g}
                  onClick={() => set('show', g, 'all')}
                  aria-pressed={group === g}
                  style={{ fontSize: 13, padding: '7px 14px', borderRadius: 980, border: '1px solid', borderColor: group === g ? '#1d1d1f' : '#d2d2d7', background: group === g ? '#1d1d1f' : 'transparent', color: group === g ? '#fff' : '#6e6e73', cursor: 'pointer' }}
                >
                  {mb.groups[g]} ({count(g)})
                </button>
              ))}
              {filtering && (
                <ResetButton onClick={() => edit(p => { ['show', 'period', 'from', 'to', 'q', 'page'].forEach(k => p.delete(k)) })}>{mb.reset}</ResetButton>
              )}
            </div>
            {list.length === 0 && <p style={{ fontSize: 15, color: '#6e6e73', padding: '24px 0' }}>{mb.noMatch}</p>}
          </>
        )}

        {shown.map(b => {
          const g = groupOf(b)
          const startsIn = daysUntil(b.pickupDate)
          return (
            <BookingCard key={b.id} booking={b} to={`/bookings/${b.id}`}>
              {g === 'active' && startsIn <= 0 && <div style={{ fontSize: 13, fontWeight: 500, color: '#b25000', marginTop: 6 }}>{mb.inProgress(formatDate(b.returnDate, lang))}</div>}
              {g === 'active' && startsIn > 0 && <div style={{ fontSize: 13, fontWeight: 500, color: '#1b7a35', marginTop: 6 }}>{mb.startsIn(startsIn)}</div>}
              <div style={{ marginTop: 12 }}>
                <Link to={`/bookings/${b.id}`} className="btn-action btn-action--primary" style={{ gap: 6 }}>
                  {b.status === 'PENDING_PAYMENT' ? t.bookings.pay : t.admin.view}
                  <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden>
                    <path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </BookingCard>
          )
        })}
        <Pagination page={page} pages={pages} total={list.length} pageSize={PAGE_SIZE} onChange={goToPage} />
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

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: '#f5f5f7', minWidth: 0, containerType: 'inline-size' }}>
      <div style={{ fontSize: 13, color: '#6e6e73' }}>{label}</div>
      <div className="tile-value" style={{ fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', marginTop: 4, whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  )
}

const control: React.CSSProperties = { fontSize: 14, padding: '9px 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none' }
const labelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6e6e73' }

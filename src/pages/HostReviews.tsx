import { Link } from 'react-router'
import { Avatar } from '../components/Avatar'
import { ResetButton } from '../components/ResetButton'
import { photoUrl } from '../data/cars'
import { useI18n } from '../i18n/I18nContext'
import { PERIODS, periodRange, type PeriodChoice } from '../lib/periods'
import { formatDate } from '../lib/rental'
import { useUrlParams } from '../lib/useUrlParams'

export type HostReview = {
  id: string
  car: { id: number; slug: string; brand: string; model: string; photo: string | null }
  author: string // the same for all reviews of one customer
  name: string
  avatarUrl: string | null
  rating: number
  text: string
  date: string
}

const SORTS = ['newest', 'oldest', 'best', 'worst'] as const
type Sort = (typeof SORTS)[number]
const COMPARE: Record<Sort, (a: HostReview, b: HostReview) => number> = {
  newest: (a, b) => b.date.localeCompare(a.date),
  oldest: (a, b) => a.date.localeCompare(b.date),
  best: (a, b) => b.rating - a.rating || b.date.localeCompare(a.date),
  worst: (a, b) => a.rating - b.rating || b.date.localeCompare(a.date),
}
const FILTERS = ['car', 'client', 'stars', 'period', 'from', 'to', 'sort']

// The host's reviews tab: the reviews of their cars, filtered by car, customer, stars and period.
export function HostReviews({ reviews, cars }: { reviews: HostReview[]; cars: { id: number; brand: string; model: string; year: number }[] }) {
  const { lang, t } = useI18n()
  const r = t.hostReviews
  const mb = t.myBookings
  const { params, edit } = useUrlParams()
  const set = (key: string, value: string, fallback = '') => edit(p => (value && value !== fallback ? p.set(key, value) : p.delete(key)))

  const car = params.get('car') ?? ''
  const client = params.get('client') ?? ''
  const stars = params.get('stars') ?? ''
  const period: PeriodChoice = PERIODS.includes(params.get('period') as PeriodChoice) ? (params.get('period') as PeriodChoice) : 'all'
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const sort: Sort = SORTS.includes(params.get('sort') as Sort) ? (params.get('sort') as Sort) : 'newest'

  // Each customer once, by name.
  const clients = [...new Map(reviews.map(x => [x.author, x.name])).entries()].sort((a, b) => a[1].localeCompare(b[1], lang))
  const [start, end] = periodRange(period, from, to)
  const shown = reviews
    .filter(x => (!car || String(x.car.id) === car) && (!client || x.author === client) && (!stars || x.rating === Number(stars)))
    .filter(x => (!start || x.date >= start) && (!end || x.date <= end))
    .sort(COMPARE[sort])
  const filtering = FILTERS.some(k => params.has(k))

  if (reviews.length === 0) return <p style={{ fontSize: 15, color: '#6e6e73', padding: '24px 0' }}>{t.hostPortal.noReviews}</p>

  return (
    <>
      <div className="admin-car-toolbar">
        <select value={car} onChange={e => set('car', e.target.value)} aria-label={r.car} style={control}>
          <option value="">{t.hostPortal.allCars}</option>
          {cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} {c.year}</option>)}
        </select>
        <select value={client} onChange={e => set('client', e.target.value)} aria-label={r.client} style={control}>
          <option value="">{r.allClients}</option>
          {clients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select value={stars} onChange={e => set('stars', e.target.value)} aria-label={r.stars} style={control}>
          <option value="">{r.allStars}</option>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)} {r.starsCount(n)}</option>)}
        </select>
        <label style={labelStyle}>
          {mb.period}
          <select value={period} onChange={e => set('period', e.target.value, 'all')} style={control}>
            {PERIODS.map(o => <option key={o} value={o}>{mb.periods[o]}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          {mb.sortBy}
          <select value={sort} onChange={e => set('sort', e.target.value, 'newest')} style={control}>
            {SORTS.map(o => <option key={o} value={o}>{r.sorts[o]}</option>)}
          </select>
        </label>
      </div>
      {period === 'custom' && (
        <div className="admin-car-toolbar">
          <label style={labelStyle}>{mb.from}<input type="date" value={from} max={to || undefined} onChange={e => set('from', e.target.value)} style={control} /></label>
          <label style={labelStyle}>{mb.to}<input type="date" value={to} min={from || undefined} onChange={e => set('to', e.target.value)} style={control} /></label>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#6e6e73', marginTop: 6 }}>
        {r.found(shown.length)}
        {filtering && <ResetButton onClick={() => edit(p => FILTERS.forEach(k => p.delete(k)))}>{mb.reset}</ResetButton>}
      </div>

      {shown.length === 0 && <p style={{ fontSize: 15, color: '#6e6e73', padding: '24px 0' }}>{r.noMatch}</p>}
      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
        {shown.map(x => (
          <li key={x.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '18px 0', borderBottom: '1px solid #e5e5ea' }}>
            <Link to={`/cars/${x.car.slug}`} className="booking-thumb">
              {x.car.photo && <img src={photoUrl(x.car.photo, 240, 150)} alt={`${x.car.brand} ${x.car.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 14 }}>
                <strong style={{ fontWeight: 600, color: '#1d1d1f' }}>{x.car.brand} {x.car.model}</strong>
                <span style={{ color: '#ff9f0a', letterSpacing: 1 }} aria-label={r.starsCount(x.rating)}>{'★'.repeat(x.rating)}{'☆'.repeat(5 - x.rating)}</span>
                <span style={{ color: '#86868b' }}>{formatDate(x.date, lang)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Avatar name={x.name} url={x.avatarUrl} size={28} />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{x.name}</span>
              </div>
              <p style={{ fontSize: 14, color: '#424245', margin: '8px 0 0', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{x.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

const control: React.CSSProperties = { fontSize: 14, padding: '9px 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none', maxWidth: '100%' }
const labelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6e6e73' }

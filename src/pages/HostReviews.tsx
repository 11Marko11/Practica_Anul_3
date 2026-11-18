import { Link } from 'react-router'
import { Avatar } from '../components/Avatar'
import { plain, Suggest } from '../components/Suggest'
import { ResetButton } from '../components/ResetButton'
import { photoUrl } from '../data/cars'
import { useI18n } from '../i18n/I18nContext'
import { formatDate } from '../lib/rental'
import { useUrlParams } from '../lib/useUrlParams'
import { useKeepHeight } from '../lib/useKeepHeight'

export type HostReview = {
  id: string
  car: { id: number; slug: string; brand: string; model: string; photo: string | null }
  author: string // the same for all reviews of one customer
  bookingId: string | null // the trip it is about
  name: string
  avatarUrl: string | null
  rating: number
  text: string
  date: string
}

export const FILTERS = ['carName', 'client', 'stars', 'from', 'to']

const carName = (x: HostReview) => `${x.car.brand} ${x.car.model}`
// Names that start with what was typed.
const starts = (name: string, typed: string) => !typed.trim() || plain(name).startsWith(plain(typed))

// Whether a finished trip passes the same filters: its car, its customer, its return day in the
// period and, when stars are chosen, a review with that many stars.
export function tripShown(
  trip: { id: string; car: { brand: string; model: string }; customer: { name: string }; returnDate: string },
  reviews: HostReview[],
  params: URLSearchParams,
) {
  const stars = params.get('stars') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  return starts(`${trip.car.brand} ${trip.car.model}`, params.get('carName') ?? '') && starts(trip.customer.name, params.get('client') ?? '')
    && (!from || trip.returnDate >= from) && (!to || trip.returnDate <= to)
    && (!stars || reviews.some(x => x.bookingId === trip.id && x.rating === Number(stars)))
}

// The reviews the filters in the address leave, newest first. The rating tile counts the same ones.
export function shownReviews(reviews: HostReview[], params: URLSearchParams) {
  const stars = params.get('stars') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  return reviews
    .filter(x => starts(carName(x), params.get('carName') ?? '') && starts(x.name, params.get('client') ?? '') && (!stars || x.rating === Number(stars)))
    .filter(x => (!from || x.date >= from) && (!to || x.date <= to))
    .sort((a, b) => b.date.localeCompare(a.date))
}

// The host's reviews tab: the reviews of their cars, filtered by car, customer, stars and period.
export function HostReviews({ reviews }: { reviews: HostReview[] }) {
  const { lang, t } = useI18n()
  const r = t.hostReviews
  const mb = t.myBookings
  const { params, edit } = useUrlParams()
  const keep = useKeepHeight<HTMLDivElement>()
  const set = (key: string, value: string, fallback = '') => edit(p => (value && value !== fallback ? p.set(key, value) : p.delete(key)))

  const car = params.get('carName') ?? ''
  const client = params.get('client') ?? ''
  const stars = params.get('stars') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''

  const names = (list: string[]) => [...new Set(list)].sort((a, b) => a.localeCompare(b, lang))
  const shown = shownReviews(reviews, params)
  const filtering = FILTERS.some(k => params.has(k))

  if (reviews.length === 0) return <p style={{ fontSize: 15, color: '#6e6e73', padding: '24px 0' }}>{t.hostPortal.noReviews}</p>

  return (
    <div ref={keep.ref} style={{ minHeight: keep.minHeight }}>
      <div className="admin-car-toolbar">
        <Suggest value={car} onChange={v => set('carName', v)} options={names(reviews.map(carName))} placeholder={r.car} style={control} />
        <Suggest value={client} onChange={v => set('client', v)} options={names(reviews.map(x => x.name))} placeholder={r.client} style={control} />
        {/* "De la" and "Până la" always stay side by side, also on phones. */}
        <div className="date-range">
          <label>{mb.from}<input type="date" value={from} max={to || undefined} onChange={e => set('from', e.target.value)} style={control} /></label>
          <label>{mb.to}<input type="date" value={to} min={from || undefined} onChange={e => set('to', e.target.value)} style={control} /></label>
        </div>
        <select value={stars} onChange={e => set('stars', e.target.value)} aria-label={r.stars} style={control}>
          <option value="">{r.allStars}</option>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)} {r.starsCount(n)}</option>)}
        </select>
      </div>
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
    </div>
  )
}

const control: React.CSSProperties = { fontSize: 14, padding: '9px 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none', maxWidth: '100%' }

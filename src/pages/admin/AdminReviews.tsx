import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { photoUrl } from '../../data/cars'
import { useI18n } from '../../i18n/I18nContext'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/rental'
import { AdminGuard } from './AdminGuard'
import { AdminTabs } from './AdminTabs'

type CarReviews = {
  car: { id: number; slug: string; brand: string; model: string; photo: string | null; status: 'ACTIVE' | 'HIDDEN' }
  count: number
  average: number | null
  reviews: { id: string; name: string; rating: number; text: string; date: string; customerId: string | null }[]
}

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

// /admin/reviews: every car with all of its reviews, so the admin can read and remove them.
export function AdminReviews() {
  return (
    <AdminGuard>
      <ReviewsContent />
    </AdminGuard>
  )
}

function ReviewsContent() {
  const { lang, t } = useI18n()
  const r = t.reviewsAdmin
  const [cars, setCars] = useState<CarReviews[] | null>(null)
  const [carId, setCarId] = useState('')
  const [onlyReviewed, setOnlyReviewed] = useState(true)

  function load() {
    api<{ cars: CarReviews[] }>('/admin/reviews').then(res => setCars(res.cars)).catch(() => setCars([]))
  }
  useEffect(load, [])

  async function remove(id: string) {
    if (!confirm(r.deleteAsk)) return
    try {
      await api(`/reviews/${id}`, { method: 'DELETE' })
      load()
    } catch {
      alert(r.deleteError)
    }
  }

  const shown = (cars ?? []).filter(c => (carId ? String(c.car.id) === carId : !onlyReviewed || c.count > 0))

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '40px 24px 28px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <AdminTabs />
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{r.title}</h1>
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 96px' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={carId}
            onChange={e => setCarId(e.target.value)}
            aria-label={r.allCars}
            style={{ fontSize: 14, padding: '9px 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', fontFamily: 'inherit', maxWidth: '100%' }}
          >
            <option value="">{r.allCars}</option>
            {(cars ?? []).map(c => (
              <option key={c.car.id} value={c.car.id}>
                {c.car.brand} {c.car.model} ({c.count})
              </option>
            ))}
          </select>
          {!carId && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#424245', cursor: 'pointer' }}>
              <input type="checkbox" checked={onlyReviewed} onChange={e => setOnlyReviewed(e.target.checked)} style={{ accentColor: '#1d1d1f' }} />
              {r.onlyReviewed}
            </label>
          )}
        </div>

        {!cars && <p style={{ fontSize: 15, color: '#6e6e73', marginTop: 24 }}>{t.bookings.loading}</p>}
        {cars && shown.length === 0 && <p style={{ fontSize: 15, color: '#6e6e73', padding: '32px 0' }}>{r.noReviews}</p>}

        {shown.map(c => (
          <section key={c.car.id} style={{ marginTop: 28, border: '1px solid #f0f0f0', borderRadius: 18, overflow: 'hidden' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: '#f5f5f7', flexWrap: 'wrap' }}>
              <div style={{ width: 88, aspectRatio: '16/10', borderRadius: 10, overflow: 'hidden', background: '#e8e8ed', flexShrink: 0 }}>
                {c.car.photo && <img src={photoUrl(c.car.photo, 176, 110)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: 0 }}>
                  {c.car.brand} {c.car.model}
                  {c.car.status === 'HIDDEN' && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: '#6e6e73' }}>· {r.hidden}</span>}
                </h2>
                <div style={{ fontSize: 14, color: '#424245', marginTop: 2 }}>
                  {c.average !== null ? <><span style={{ color: '#1d1d1f', fontWeight: 600 }}>★ {c.average.toFixed(1)}</span> · {t.reviews.count(c.count)}</> : r.noReviews}
                </div>
              </div>
              <Link to={`/cars/${c.car.slug}#reviews`} target="_blank" style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none' }}>{r.viewCar}</Link>
            </header>
            {c.reviews.map(rv => (
              <div key={rv.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: '#1d1d1f' }}>
                    <span style={{ letterSpacing: 1 }}>{stars(rv.rating)}</span> · {r.by}{' '}
                    {rv.customerId ? <Link to={`/admin/customers/${rv.customerId}`} style={{ color: '#0071e3', textDecoration: 'none' }}>{rv.name}</Link> : rv.name}
                    <span style={{ color: '#86868b' }}> · {formatDate(rv.date, lang)}</span>
                  </div>
                  <p style={{ fontSize: 14, color: '#424245', margin: '4px 0 0', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{rv.text}</p>
                </div>
                <button onClick={() => remove(rv.id)} style={{ flexShrink: 0, fontSize: 13, color: '#d70015', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {r.delete}
                </button>
              </div>
            ))}
          </section>
        ))}
      </main>
    </div>
  )
}

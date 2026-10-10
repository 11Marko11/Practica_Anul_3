import { Link } from 'react-router'
import { carImage } from '../../data/cars'
import { deleteCar, useAllCars, useFreshCatalog } from '../../lib/carStore'
import { ApiError } from '../../lib/api'
import { fmt } from '../../lib/rental'
import { useI18n } from '../../i18n/I18nContext'
import { carText } from '../../i18n/cars'
import { AdminGuard } from './AdminGuard'
import { AdminTabs } from './AdminTabs'
import { useUrlParams } from '../../lib/useUrlParams'
import type { Car } from '../../data/cars'

const SORTS = ['recent', 'oldest', 'name', 'price-asc', 'price-desc', 'year', 'power'] as const
type Sort = (typeof SORTS)[number]
const STATUS_FILTERS = ['all', 'ACTIVE', 'HIDDEN'] as const

const name = (c: Car) => `${c.brand} ${c.model}`
const added = (c: Car) => c.createdAt ?? ''
const COMPARE: Record<Sort, (a: Car, b: Car) => number> = {
  recent: (a, b) => added(b).localeCompare(added(a)) || b.id - a.id,
  oldest: (a, b) => added(a).localeCompare(added(b)) || a.id - b.id,
  name: (a, b) => name(a).localeCompare(name(b)),
  'price-asc': (a, b) => a.pricePerDay - b.pricePerDay,
  'price-desc': (a, b) => b.pricePerDay - a.pricePerDay,
  year: (a, b) => b.year - a.year || name(a).localeCompare(name(b)),
  power: (a, b) => b.horsepower - a.horsepower,
}

export function AdminCars() {
  return (
    <AdminGuard>
      <AdminCarsContent />
    </AdminGuard>
  )
}

function AdminCarsContent() {
  const allCars = useAllCars()
  const fresh = useFreshCatalog()
  const { lang, t } = useI18n()
  const s = t.adminCarsList

  // Sorting and filters live in the URL, so they are kept after adding or editing a car.
  const { params, edit } = useUrlParams()
  const sort: Sort = SORTS.includes(params.get('sort') as Sort) ? (params.get('sort') as Sort) : 'recent'
  const status = STATUS_FILTERS.includes(params.get('status') as never) ? (params.get('status') as (typeof STATUS_FILTERS)[number]) : 'all'
  const brand = params.get('brand') ?? ''
  const query = params.get('q') ?? ''
  const set = (key: string, value: string, fallback: string) => edit(p => (value && value !== fallback ? p.set(key, value) : p.delete(key)))

  const brands = [...new Set(allCars.map(c => c.brand))].sort((a, b) => a.localeCompare(b))
  const q = query.trim().toLowerCase()
  const cars = allCars
    .filter(c => (status === 'all' || (c.status ?? 'ACTIVE') === status) && (!brand || c.brand === brand))
    .filter(c => !q || `${name(c)} ${c.location}`.toLowerCase().includes(q))
    .sort(COMPARE[sort])
  const count = (f: (typeof STATUS_FILTERS)[number]) => allCars.filter(c => f === 'all' || (c.status ?? 'ACTIVE') === f).length

  async function remove(id: number, name: string) {
    if (!confirm(t.admin.deleteConfirm(name))) return
    try {
      await deleteCar(id)
    } catch (err) {
      alert(err instanceof ApiError && err.code === 'car-has-bookings' ? t.admin.hasBookings : t.admin.deleteError)
    }
  }

  if (!fresh) return <div style={{ minHeight: '80vh' }} />

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '40px 24px 36px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <AdminTabs />
        </div>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{t.admin.title}</h1>
            <p style={{ fontSize: 14, color: '#a1a1a6', margin: '10px 0 0' }}>{t.admin.count(allCars.length)}</p>
          </div>
          <Link to="/admin/cars/new" state={{ listSearch: params.toString() }} style={{ fontSize: 15, fontWeight: 500, padding: '12px 24px', borderRadius: 980, background: '#f5f5f7', color: '#1c1c1e', textDecoration: 'none' }}>
            + {t.admin.add}
          </Link>
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 96px' }}>
        <div className="admin-car-toolbar">
          <input
            type="search"
            value={query}
            onChange={e => set('q', e.target.value, '')}
            placeholder={s.search}
            aria-label={s.search}
            style={{ ...control, flex: '1 1 220px' }}
          />
          <select value={brand} onChange={e => set('brand', e.target.value, '')} aria-label={t.marketplace.brand} style={control}>
            <option value="">{s.allBrands}</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6e6e73' }}>
            {s.sortBy}
            <select value={sort} onChange={e => set('sort', e.target.value, 'recent')} style={control}>
              {SORTS.map(o => <option key={o} value={o}>{s.sort[o]}</option>)}
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', margin: '12px 0 4px' }}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => set('status', f, 'all')}
              aria-pressed={status === f}
              style={{ fontSize: 13, padding: '7px 14px', borderRadius: 980, border: '1px solid', borderColor: status === f ? '#1d1d1f' : '#d2d2d7', background: status === f ? '#1d1d1f' : 'transparent', color: status === f ? '#fff' : '#6e6e73', cursor: 'pointer' }}
            >
              {s.status[f]} ({count(f)})
            </button>
          ))}
          {(q || brand || status !== 'all') && (
            <button onClick={() => edit(p => { p.delete('q'); p.delete('brand'); p.delete('status') })} style={{ fontSize: 13, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}>
              {s.reset}
            </button>
          )}
        </div>

        {allCars.length === 0 && <p style={{ fontSize: 16, color: '#6e6e73', textAlign: 'center', padding: '48px 0' }}>{t.admin.empty}</p>}
        {allCars.length > 0 && cars.length === 0 && <p style={{ fontSize: 15, color: '#6e6e73', padding: '32px 0' }}>{s.noMatch}</p>}

        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {cars.map(car => {
            const name = `${car.brand} ${car.model}`
            return (
              <li key={car.id} className="admin-row" style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: 120, aspectRatio: '16/10', borderRadius: 10, overflow: 'hidden', background: '#e8e8ed', flexShrink: 0 }}>
                  {car.photos.length > 0 && <img src={carImage(car, 240, 150)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>{name} <span style={{ fontWeight: 400, color: '#6e6e73' }}>· {car.year}</span>
                    {car.status === 'HIDDEN' && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: '#6e6e73', background: '#f0f0f0', padding: '2px 8px', borderRadius: 980 }}>{t.admin.hidden}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>
                    {fmt(car.pricePerDay)}{t.common.perDay} · {carText(car, lang).location} · {car.horsepower} {t.car.units.hp}
                    {car.createdAt && <span style={{ color: '#86868b' }}> · {t.adminCarsList.added(new Date(car.createdAt).toLocaleDateString(lang))}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 14, flexShrink: 0 }}>
                  <Link to={`/cars/${car.slug}`} style={{ color: '#6e6e73', textDecoration: 'none' }}>{t.admin.view}</Link>
                  <Link to={`/admin/cars/${car.slug}`} state={{ listSearch: params.toString() }} style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>{t.admin.edit}</Link>
                  <button
                    onClick={() => remove(car.id, name)}
                    style={{ fontSize: 14, color: '#d70015', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    {t.admin.delete}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

      </main>
    </div>
  )
}

const control: React.CSSProperties = { fontSize: 14, padding: '9px 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none' }

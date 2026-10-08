import { Link } from 'react-router'
import { carImage } from '../../data/cars'
import { deleteCar, useAllCars, useFreshCatalog } from '../../lib/carStore'
import { ApiError } from '../../lib/api'
import { fmt } from '../../lib/rental'
import { useI18n } from '../../i18n/I18nContext'
import { carText } from '../../i18n/cars'
import { AdminGuard } from './AdminGuard'
import { AdminTabs } from './AdminTabs'

export function AdminCars() {
  return (
    <AdminGuard>
      <AdminCarsContent />
    </AdminGuard>
  )
}

function AdminCarsContent() {
  const cars = useAllCars()
  const fresh = useFreshCatalog()
  const { lang, t } = useI18n()

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
            <p style={{ fontSize: 14, color: '#a1a1a6', margin: '10px 0 0' }}>{t.admin.count(cars.length)}</p>
          </div>
          <Link to="/admin/cars/new" style={{ fontSize: 15, fontWeight: 500, padding: '12px 24px', borderRadius: 980, background: '#f5f5f7', color: '#1c1c1e', textDecoration: 'none' }}>
            + {t.admin.add}
          </Link>
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 96px' }}>
        {cars.length === 0 && <p style={{ fontSize: 16, color: '#6e6e73', textAlign: 'center', padding: '48px 0' }}>{t.admin.empty}</p>}

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
                    {fmt(car.pricePerDay)}{t.common.perDay} · {carText(car, lang).location}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 14, flexShrink: 0 }}>
                  <Link to={`/cars/${car.slug}`} style={{ color: '#6e6e73', textDecoration: 'none' }}>{t.admin.view}</Link>
                  <Link to={`/admin/cars/${car.slug}`} style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>{t.admin.edit}</Link>
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

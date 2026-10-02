import { Link } from 'react-router'
import { carImage } from '../../data/cars'
import { deleteCar, resetCars, useCars } from '../../lib/carStore'
import { fmt } from '../../lib/rental'
import { useI18n } from '../../i18n/I18nContext'
import { carText } from '../../i18n/cars'
import { AdminGuard } from './AdminGuard'

export function AdminCars() {
  return (
    <AdminGuard>
      <AdminCarsContent />
    </AdminGuard>
  )
}

function AdminCarsContent() {
  const cars = useCars()
  const { lang, t } = useI18n()

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '56px 24px 36px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 8px' }}>{t.admin.eyebrow}</p>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{t.admin.title}</h1>
            <p style={{ fontSize: 14, color: '#a1a1a6', margin: '10px 0 0' }}>{t.admin.count(cars.length)}</p>
          </div>
          <Link to="/admin/cars/new" style={{ fontSize: 15, fontWeight: 500, padding: '12px 24px', borderRadius: 980, background: '#f5f5f7', color: '#1c1c1e', textDecoration: 'none' }}>
            + {t.admin.add}
          </Link>
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 96px' }}>
        <p style={{ fontSize: 13, color: '#6e6e73', background: '#f5f5f7', borderRadius: 12, padding: '12px 16px', margin: '0 0 16px' }}>{t.admin.localNote}</p>

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
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>{name} <span style={{ fontWeight: 400, color: '#6e6e73' }}>· {car.year}</span></div>
                  <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>
                    {fmt(car.pricePerDay)}{t.common.perDay} · {carText(car, lang).location}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 14, flexShrink: 0 }}>
                  <Link to={`/cars/${car.slug}`} style={{ color: '#6e6e73', textDecoration: 'none' }}>{t.admin.view}</Link>
                  <Link to={`/admin/cars/${car.slug}`} style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>{t.admin.edit}</Link>
                  <button
                    onClick={() => confirm(t.admin.deleteConfirm(name)) && deleteCar(car.id)}
                    style={{ fontSize: 14, color: '#d70015', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    {t.admin.delete}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        <button
          onClick={() => confirm(t.admin.resetConfirm) && resetCars()}
          style={{ marginTop: 32, fontSize: 14, color: '#6e6e73', background: 'none', border: '1px solid #d2d2d7', borderRadius: 980, padding: '10px 18px', cursor: 'pointer' }}
        >
          {t.admin.reset}
        </button>
      </main>
    </div>
  )
}

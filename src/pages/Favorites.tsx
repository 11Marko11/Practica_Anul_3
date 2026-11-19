import { Link } from 'react-router'
import { useI18n } from '../i18n/I18nContext'
import { useCars, useCatalogStatus } from '../lib/carStore'
import { useFavorites } from '../lib/favorites'
import { useRentalDates } from '../lib/useRentalDates'
import { CarCard } from './Marketplace'

// /favorites: the cars with a heart, newest heart first. Open to guests too (kept in the browser).
export function Favorites() {
  const { t } = useI18n()
  const f = t.favorites
  const ids = useFavorites()
  const cars = useCars()
  const status = useCatalogStatus()
  const { days, query } = useRentalDates()
  // Only cars still on the site; a car taken off it simply doesn't show.
  const shown = ids.map(id => cars.find(c => c.id === id)).filter(c => !!c)

  return (
    <div style={{ paddingTop: 64 }}>
      <div style={{ padding: '56px 24px 36px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 8px' }}>{f.eyebrow}</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{f.title}</h1>
          <p style={{ fontSize: 14, color: '#a1a1a6', margin: '10px 0 0' }}>{f.count(shown.length)}</p>
        </div>
      </div>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 96px' }}>
        {status !== 'loading' && shown.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontSize: 20, color: '#6e6e73', margin: '0 0 24px', lineHeight: 1.5 }}>{f.empty}</p>
            <Link to={`/marketplace${query}`} className="btn-action btn-action--primary" style={{ fontSize: 18, fontWeight: 600, height: 52, padding: '0 32px' }}>{f.browse}</Link>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 20 }}>
          {shown.map(car => <CarCard key={car.id} car={car} days={days} query={query} />)}
        </div>
      </main>
    </div>
  )
}

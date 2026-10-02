import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { CARS, carImage, type Car } from '../data/cars'
import { addDays, fmt, today } from '../lib/rental'
import { useRentalDates } from '../lib/useRentalDates'
import { DateField } from '../components/DateField'
import { useI18n } from '../i18n/I18nContext'

// Every brand that has at least one car, alphabetically, with how many cars it has.
const BRANDS = Object.entries(
  CARS.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.brand]: (acc[c.brand] ?? 0) + 1 }), {}),
).sort(([a], [b]) => a.localeCompare(b))

export function Marketplace() {
  const location = useLocation()
  const { t } = useI18n()
  const requestedBrand = (location.state as { brand?: string } | null)?.brand
  const [brand, setBrand] = useState(() => BRANDS.some(([b]) => b === requestedBrand) ? requestedBrand! : 'All')
  const [sort, setSort] = useState<'newest' | 'price-asc' | 'price-desc'>('newest')
  const { pickup, dropoff, days, query, changePickup, changeDropoff } = useRentalDates()

  const list = CARS
    .filter(c => brand === 'All' || c.brand === brand)
    .sort((a, b) =>
      sort === 'price-asc' ? a.pricePerDay - b.pricePerDay :
      sort === 'price-desc' ? b.pricePerDay - a.pricePerDay :
      b.year - a.year
    )

  return (
    <div style={{ paddingTop: 52 }}>
      {/* Page header */}
      <div style={{ padding: '56px 24px 24px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 8px', letterSpacing: '0.01em' }}>{t.marketplace.eyebrow}</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>
            {t.marketplace.title}
          </h1>
        </div>
      </div>

      {/* Rental dates */}
      <div style={{ padding: '8px 24px 36px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="date-pair date-pair--inline">
            <DateField label={t.marketplace.pickupDate} value={pickup} min={today()} onChange={changePickup} />
            <DateField label={t.marketplace.returnDate} value={dropoff} min={addDays(pickup, 1)} onChange={changeDropoff} />
          </div>
          <p style={{ fontSize: 14, color: '#a1a1a6', margin: '0 0 12px' }}>
            {t.common.days(days)} · {t.marketplace.insuranceIncluded}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '24px 24px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#6e6e73' }}>
              {t.marketplace.brand}
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <select
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  style={{ appearance: 'none', fontSize: 14, fontFamily: 'inherit', padding: '9px 40px 9px 16px', minWidth: 220, borderRadius: 980, border: '1px solid', borderColor: brand === 'All' ? '#d2d2d7' : '#1d1d1f', background: '#fff', color: '#1d1d1f', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="All">{t.marketplace.allBrands(CARS.length)}</option>
                  {BRANDS.map(([b, count]) => (
                    <option key={b} value={b}>{b} ({count})</option>
                  ))}
                </select>
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="#1d1d1f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['newest', 'price-asc', 'price-desc'] as const).map(v => (
              <button key={v} onClick={() => setSort(v)} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 980, border: '1px solid', borderColor: sort === v ? '#1d1d1f' : '#d2d2d7', background: sort === v ? '#1d1d1f' : 'transparent', color: sort === v ? '#fff' : '#6e6e73', cursor: 'pointer', transition: 'all 0.15s', fontWeight: 400 }}>
                {t.marketplace.sort[v]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: '8px auto 0' }}>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>{t.marketplace.available(list.length)}{brand !== 'All' ? ` · ${brand}` : ''}</p>
        </div>
      </div>

      {/* Grid */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 20 }}>
          {list.map(car => <CarCard key={car.id} car={car} days={days} query={query} />)}
        </div>
        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 22, fontWeight: 500, color: '#1d1d1f' }}>{t.marketplace.emptyTitle}</p>
            <p style={{ fontSize: 15, color: '#6e6e73', marginTop: 8 }}>{t.marketplace.emptyText}</p>
          </div>
        )}
      </main>
    </div>
  )
}

function CarCard({ car, days, query }: { car: Car; days: number; query: string }) {
  const [hov, setHov] = useState(false)
  const { t } = useI18n()

  return (
    <Link
      to={`/cars/${car.slug}${query}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: 'block', textDecoration: 'none', borderRadius: 18, overflow: 'hidden', background: '#f5f5f7', transition: 'transform 0.2s, box-shadow 0.2s', transform: hov ? 'translateY(-3px)' : 'none', boxShadow: hov ? '0 12px 40px rgba(0,0,0,0.10)' : '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '16/10', background: '#e8e8ed' }}>
        <img src={carImage(car, 900, 600)} alt={`${car.year} ${car.brand} ${car.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s', transform: hov ? 'scale(1.04)' : 'scale(1)' }} />
        {car.fuel !== 'Petrol' && (
          <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 500, background: 'rgba(255,255,255,0.9)', color: '#1d1d1f', padding: '4px 10px', borderRadius: 980, backdropFilter: 'blur(8px)' }}>
            {t.common.fuel[car.fuel]}
          </span>
        )}
      </div>
      <div style={{ padding: '20px 20px 22px' }}>
        <p style={{ fontSize: 12, color: '#6e6e73', margin: '0 0 4px' }}>{car.brand} · {car.year}</p>
        <h2 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f', margin: '0 0 14px', lineHeight: 1.2 }}>{car.model}</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 500, color: '#1d1d1f', letterSpacing: '-0.02em' }}>
            {fmt(car.pricePerDay)}<span style={{ fontSize: 13, fontWeight: 400, color: '#6e6e73' }}>{t.common.perDay}</span>
          </span>
          <span style={{ fontSize: 12, color: '#6e6e73' }}>{t.common.seats(car.seats)} · {t.common.fuel[car.fuel]}</span>
        </div>
        <p style={{ fontSize: 13, color: '#6e6e73', margin: '8px 0 0' }}>
          {t.marketplace.totalFor(fmt(car.pricePerDay * days), days)}
        </p>
        <span style={{ display: 'block', marginTop: 14, padding: '10px 0', fontSize: 14, fontWeight: 500, color: '#0071e3', textAlign: 'center' }}>
          {t.marketplace.viewDetails}
        </span>
      </div>
    </Link>
  )
}

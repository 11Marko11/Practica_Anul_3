import { useState } from 'react'

const BRANDS = ['All', 'BMW', 'Mercedes', 'Audi', 'Porsche', 'Ferrari', 'Tesla', 'Ford', 'Lamborghini']

const CARS = [
  { id: 1, brand: 'Porsche', model: '911 Carrera 4S', year: 2024, price: 142000, fuel: 'Petrol', mileage: 1200, image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&h=600&fit=crop&auto=format' },
  { id: 2, brand: 'Ferrari', model: 'Roma Spider', year: 2024, price: 268000, fuel: 'Petrol', mileage: 320, image: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=900&h=600&fit=crop&auto=format' },
  { id: 3, brand: 'BMW', model: 'M4 Competition', year: 2023, price: 89500, fuel: 'Petrol', mileage: 8400, image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&h=600&fit=crop&auto=format' },
  { id: 4, brand: 'Tesla', model: 'Model S Plaid', year: 2024, price: 109990, fuel: 'Electric', mileage: 2100, image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=900&h=600&fit=crop&auto=format' },
  { id: 5, brand: 'Mercedes', model: 'AMG GT 63 S', year: 2023, price: 164000, fuel: 'Petrol', mileage: 5600, image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=900&h=600&fit=crop&auto=format' },
  { id: 6, brand: 'Lamborghini', model: 'Huracán EVO', year: 2022, price: 249000, fuel: 'Petrol', mileage: 3900, image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&h=600&fit=crop&auto=format' },
  { id: 7, brand: 'Audi', model: 'RS e-tron GT', year: 2024, price: 145000, fuel: 'Electric', mileage: 900, image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&h=600&fit=crop&auto=format' },
  { id: 8, brand: 'Ford', model: 'Mustang GT500', year: 2023, price: 78000, fuel: 'Petrol', mileage: 11000, image: 'https://images.unsplash.com/photo-1584060573923-0d0bf7b86f5a?w=900&h=600&fit=crop&auto=format' },
  { id: 9, brand: 'BMW', model: 'iX M60', year: 2024, price: 112000, fuel: 'Electric', mileage: 4200, image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=900&h=600&fit=crop&auto=format' },
  { id: 10, brand: 'Porsche', model: 'Taycan Turbo S', year: 2024, price: 187000, fuel: 'Electric', mileage: 1800, image: 'https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?w=900&h=600&fit=crop&auto=format' },
  { id: 11, brand: 'Mercedes', model: 'EQS 580', year: 2023, price: 132000, fuel: 'Electric', mileage: 7200, image: 'https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?w=900&h=600&fit=crop&auto=format' },
  { id: 12, brand: 'Ferrari', model: 'SF90 Stradale', year: 2023, price: 509000, fuel: 'Hybrid', mileage: 2200, image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=900&h=600&fit=crop&auto=format' },
]

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US')
}

export function Marketplace() {
  const [brand, setBrand] = useState('All')
  const [sort, setSort] = useState<'newest' | 'price-asc' | 'price-desc'>('newest')

  const list = CARS
    .filter(c => brand === 'All' || c.brand === brand)
    .sort((a, b) =>
      sort === 'price-asc' ? a.price - b.price :
      sort === 'price-desc' ? b.price - a.price :
      b.year - a.year
    )

  return (
    <div style={{ paddingTop: 52 }}>
      {/* Page header */}
      <div style={{ padding: '56px 24px 40px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 8px', letterSpacing: '0.01em' }}>Marketplace</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: 0, lineHeight: 1.05 }}>
            Browse all vehicles.
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '24px 24px', position: 'sticky', top: 52, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #f0f0f0', zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {BRANDS.map(b => (
              <button
                key={b}
                onClick={() => setBrand(b)}
                style={{ fontSize: 13, padding: '6px 16px', borderRadius: 980, border: '1px solid', borderColor: brand === b ? '#1d1d1f' : '#d2d2d7', background: brand === b ? '#1d1d1f' : 'transparent', color: brand === b ? '#fff' : '#1d1d1f', cursor: 'pointer', transition: 'all 0.15s', fontWeight: 400 }}
              >
                {b}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {([['newest', 'Newest'], ['price-asc', 'Price ↑'], ['price-desc', 'Price ↓']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setSort(v)} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 980, border: '1px solid', borderColor: sort === v ? '#1d1d1f' : '#d2d2d7', background: sort === v ? '#1d1d1f' : 'transparent', color: sort === v ? '#fff' : '#6e6e73', cursor: 'pointer', transition: 'all 0.15s', fontWeight: 400 }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: '8px auto 0' }}>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>{list.length} vehicle{list.length !== 1 ? 's' : ''}{brand !== 'All' ? ` · ${brand}` : ''}</p>
        </div>
      </div>

      {/* Grid */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {list.map(car => <CarCard key={car.id} car={car} />)}
        </div>
        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 22, fontWeight: 500, color: '#1d1d1f' }}>No vehicles found</p>
            <p style={{ fontSize: 15, color: '#6e6e73', marginTop: 8 }}>Try a different brand</p>
          </div>
        )}
      </main>
    </div>
  )
}

function CarCard({ car }: { car: typeof CARS[0] }) {
  const [hov, setHov] = useState(false)
  return (
    <article
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ cursor: 'pointer', borderRadius: 18, overflow: 'hidden', background: '#f5f5f7', transition: 'transform 0.2s, box-shadow 0.2s', transform: hov ? 'translateY(-3px)' : 'none', boxShadow: hov ? '0 12px 40px rgba(0,0,0,0.10)' : '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '16/10', background: '#e8e8ed' }}>
        <img src={car.image} alt={`${car.year} ${car.brand} ${car.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s', transform: hov ? 'scale(1.04)' : 'scale(1)' }} />
        {car.fuel !== 'Petrol' && (
          <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 500, background: 'rgba(255,255,255,0.9)', color: '#1d1d1f', padding: '4px 10px', borderRadius: 980, backdropFilter: 'blur(8px)' }}>
            {car.fuel}
          </span>
        )}
      </div>
      <div style={{ padding: '20px 20px 22px' }}>
        <p style={{ fontSize: 12, color: '#6e6e73', margin: '0 0 4px' }}>{car.brand} · {car.year}</p>
        <h2 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f', margin: '0 0 14px', lineHeight: 1.2 }}>{car.model}</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 500, color: '#1d1d1f', letterSpacing: '-0.02em' }}>{fmt(car.price)}</span>
          <span style={{ fontSize: 12, color: '#6e6e73' }}>{car.mileage.toLocaleString()} mi</span>
        </div>
        <button style={{ marginTop: 14, width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 500, color: '#0071e3', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
          View Details →
        </button>
      </div>
    </article>
  )
}

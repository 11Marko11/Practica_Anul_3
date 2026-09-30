import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

const CARS = [
  { id: 1, brand: 'Porsche', model: '911 Carrera 4S', year: 2024, pricePerDay: 390, fuel: 'Petrol', seats: 4, image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&h=600&fit=crop&auto=format' },
  { id: 2, brand: 'Ferrari', model: 'Roma Spider', year: 2024, pricePerDay: 890, fuel: 'Petrol', seats: 4, image: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=900&h=600&fit=crop&auto=format' },
  { id: 3, brand: 'BMW', model: 'M4 Competition', year: 2023, pricePerDay: 260, fuel: 'Petrol', seats: 4, image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&h=600&fit=crop&auto=format' },
  { id: 4, brand: 'Tesla', model: 'Model S Plaid', year: 2024, pricePerDay: 240, fuel: 'Electric', seats: 5, image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=900&h=600&fit=crop&auto=format' },
  { id: 5, brand: 'Mercedes', model: 'AMG GT 63 S', year: 2023, pricePerDay: 420, fuel: 'Petrol', seats: 4, image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=900&h=600&fit=crop&auto=format' },
  { id: 6, brand: 'Lamborghini', model: 'Huracán EVO', year: 2022, pricePerDay: 990, fuel: 'Petrol', seats: 2, image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&h=600&fit=crop&auto=format' },
  { id: 7, brand: 'Audi', model: 'RS e-tron GT', year: 2024, pricePerDay: 350, fuel: 'Electric', seats: 4, image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&h=600&fit=crop&auto=format' },
  { id: 8, brand: 'Ford', model: 'Mustang GT500', year: 2023, pricePerDay: 220, fuel: 'Petrol', seats: 4, image: 'https://images.unsplash.com/photo-1584060573923-0d0bf7b86f5a?w=900&h=600&fit=crop&auto=format' },
  { id: 9, brand: 'BMW', model: 'iX M60', year: 2024, pricePerDay: 280, fuel: 'Electric', seats: 5, image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=900&h=600&fit=crop&auto=format' },
  { id: 10, brand: 'Porsche', model: 'Taycan Turbo S', year: 2024, pricePerDay: 450, fuel: 'Electric', seats: 4, image: 'https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?w=900&h=600&fit=crop&auto=format' },
  { id: 11, brand: 'Mercedes', model: 'EQS 580', year: 2023, pricePerDay: 300, fuel: 'Electric', seats: 5, image: 'https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?w=900&h=600&fit=crop&auto=format' },
  { id: 12, brand: 'Ferrari', model: 'SF90 Stradale', year: 2023, pricePerDay: 1450, fuel: 'Hybrid', seats: 2, image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=900&h=600&fit=crop&auto=format' },
]

// Every brand that has at least one car, alphabetically, with how many cars it has.
const BRANDS = Object.entries(
  CARS.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.brand]: (acc[c.brand] ?? 0) + 1 }), {}),
).sort(([a], [b]) => a.localeCompare(b))

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US')
}

// Dates are 'YYYY-MM-DD' strings, handled in UTC so time zones can't shift the day.
function addDays(date: string, n: number) {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(from: string, to: string) {
  const ms = new Date(to + 'T00:00:00Z').getTime() - new Date(from + 'T00:00:00Z').getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
}

export function Marketplace() {
  const location = useLocation()
  const requestedBrand = (location.state as { brand?: string } | null)?.brand
  const [brand, setBrand] = useState(() => BRANDS.some(([b]) => b === requestedBrand) ? requestedBrand! : 'All')
  const [sort, setSort] = useState<'newest' | 'price-asc' | 'price-desc'>('newest')
  const [pickup, setPickup] = useState(() => addDays(today(), 1))
  const [dropoff, setDropoff] = useState(() => addDays(today(), 4))
  const days = daysBetween(pickup, dropoff)

  function changePickup(value: string) {
    setPickup(value)
    if (value >= dropoff) setDropoff(addDays(value, 1))
  }

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
          <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 8px', letterSpacing: '0.01em' }}>Car Rentals</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>
            Find your rental car.
          </h1>
        </div>
      </div>

      {/* Rental dates */}
      <div style={{ padding: '8px 24px 36px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <DateField label="Pick-up date" value={pickup} min={today()} onChange={changePickup} />
          <DateField label="Return date" value={dropoff} min={addDays(pickup, 1)} onChange={setDropoff} />
          <p style={{ fontSize: 14, color: '#a1a1a6', margin: '0 0 12px' }}>
            {days} day{days !== 1 ? 's' : ''} · insurance included
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '24px 24px', position: 'sticky', top: 52, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #f0f0f0', zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#6e6e73' }}>
              Brand
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <select
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  style={{ appearance: 'none', fontSize: 14, fontFamily: 'inherit', padding: '9px 40px 9px 16px', minWidth: 220, borderRadius: 980, border: '1px solid', borderColor: brand === 'All' ? '#d2d2d7' : '#1d1d1f', background: '#fff', color: '#1d1d1f', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="All">All brands ({CARS.length})</option>
                  {BRANDS.map(([b, count]) => (
                    <option key={b} value={b}>{b} ({count})</option>
                  ))}
                </select>
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="#1d1d1f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </label>
            {brand !== 'All' && (
              <button onClick={() => setBrand('All')} style={{ fontSize: 13, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Clear
              </button>
            )}
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
          <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>{list.length} car{list.length !== 1 ? 's' : ''} available{brand !== 'All' ? ` · ${brand}` : ''}</p>
        </div>
      </div>

      {/* Grid */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {list.map(car => <CarCard key={car.id} car={car} days={days} pickup={pickup} dropoff={dropoff} />)}
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

function DateField({ label, value, min, onChange }: { label: string; value: string; min: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#a1a1a6' }}>
      {label}
      <input
        type="date"
        value={value}
        min={min}
        onChange={e => e.target.value && onChange(e.target.value)}
        style={{ fontSize: 15, padding: '10px 14px', border: '1px solid #3a3a3d', borderRadius: 12, color: '#f5f5f7', fontFamily: 'inherit', background: '#2a2a2d', colorScheme: 'dark' }}
      />
    </label>
  )
}

function CarCard({ car, days, pickup, dropoff }: { car: typeof CARS[0]; days: number; pickup: string; dropoff: string }) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)
  const name = `${car.brand} ${car.model}`

  function book() {
    navigate('/contact', { state: { subject: 'booking', message: `I'd like to rent the ${name} from ${pickup} to ${dropoff} (${days} day${days !== 1 ? 's' : ''}, ${fmt(car.pricePerDay * days)} total).` } })
  }

  return (
    <article
      onClick={book}
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
          <span style={{ fontSize: 17, fontWeight: 500, color: '#1d1d1f', letterSpacing: '-0.02em' }}>
            {fmt(car.pricePerDay)}<span style={{ fontSize: 13, fontWeight: 400, color: '#6e6e73' }}> / day</span>
          </span>
          <span style={{ fontSize: 12, color: '#6e6e73' }}>{car.seats} seats · {car.fuel}</span>
        </div>
        <p style={{ fontSize: 13, color: '#6e6e73', margin: '8px 0 0' }}>
          {fmt(car.pricePerDay * days)} total for {days} day{days !== 1 ? 's' : ''}
        </p>
        <button style={{ marginTop: 14, width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 500, color: '#0071e3', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
          Book Now →
        </button>
      </div>
    </article>
  )
}

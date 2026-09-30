import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CARS, carImage, findCar, type Car } from '../data/cars'
import { addDays, bookingMessage, fmt, plural, today } from '../lib/rental'
import { useRentalDates } from '../lib/useRentalDates'
import { DateField } from '../components/DateField'
import { CarGallery } from '../components/CarGallery'

export function CarDetails() {
  const { slug = '' } = useParams()
  const car = findCar(slug)
  if (!car) return <CarNotFound />
  return <CarDetailsContent key={car.slug} car={car} />
}

function CarDetailsContent({ car }: { car: Car }) {
  const navigate = useNavigate()
  const { pickup, dropoff, days, query, changePickup, changeDropoff } = useRentalDates()
  const total = car.pricePerDay * days

  const specs = [
    { label: 'Power', value: `${car.horsepower} hp` },
    { label: '0–100 km/h', value: `${car.acceleration} s` },
    { label: 'Top speed', value: `${car.topSpeed} km/h` },
    { label: 'Transmission', value: car.transmission },
    { label: 'Drive', value: car.drive === 'AWD' ? 'All-wheel drive' : 'Rear-wheel drive' },
    { label: 'Seats', value: `${car.seats} seats` },
    { label: 'Fuel', value: car.fuel },
    ...(car.range ? [{ label: car.fuel === 'Hybrid' ? 'Electric range' : 'Range', value: `${car.range} km` }] : []),
  ]

  // Same brand first, then same fuel type, then anything else.
  const similar = CARS
    .filter(c => c.id !== car.id)
    .map(c => ({ c, score: (c.brand === car.brand ? 2 : 0) + (c.fuel === car.fuel ? 1 : 0) }))
    .sort((a, b) => b.score - a.score || a.c.pricePerDay - b.c.pricePerDay)
    .slice(0, 3)
    .map(({ c }) => c)

  function book() {
    navigate('/contact', { state: { subject: 'booking', message: bookingMessage(car, pickup, dropoff) } })
  }

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 96px' }}>
        <Link to={`/marketplace${query}`} style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none' }}>
          ← All cars
        </Link>

        <header style={{ margin: '20px 0 28px' }}>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: '0 0 6px' }}>{car.brand} · {car.year}</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.035em', color: '#1d1d1f', margin: '0 0 10px', lineHeight: 1.05 }}>
            {car.model}
          </h1>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>
            <span style={{ color: '#1d1d1f', fontWeight: 500 }}>★ {car.host.rating.toFixed(1)}</span> · {plural(car.host.trips, 'trip')} · {car.location}
          </p>
        </header>

        <div className="detail-grid">
          <div className="detail-image">
            <CarGallery car={car} />
          </div>

          <div className="detail-info">

            <Section title="Specifications" first>
              <div className="spec-grid">
                {specs.map(s => (
                  <div key={s.label} style={{ background: '#f5f5f7', borderRadius: 14, padding: '16px 18px' }}>
                    <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="About this car">
              <p style={{ fontSize: 16, color: '#424245', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>{car.description}</p>
            </Section>

            <Section title="Features">
              <ul className="feature-list">
                {car.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: '#1d1d1f' }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden style={{ flexShrink: 0 }}>
                      <circle cx="9" cy="9" r="9" fill="#1c1c1e" />
                      <path d="M5.5 9.2l2.2 2.2 4.8-4.8" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Your host">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#1c1c1e', borderRadius: 18, padding: '20px 22px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#3a3a3d', color: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, flexShrink: 0 }}>
                  {car.host.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f7' }}>{car.host.name}</div>
                  <div style={{ fontSize: 14, color: '#a1a1a6', marginTop: 2 }}>
                    ★ {car.host.rating.toFixed(1)} · {plural(car.host.trips, 'trip')} · Verified host
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <aside className="booking-card" style={{ background: '#1c1c1e', borderRadius: 24, padding: '28px 24px', color: '#f5f5f7' }}>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em' }}>
              {fmt(car.pricePerDay)}<span style={{ fontSize: 15, fontWeight: 400, color: '#a1a1a6' }}> / day</span>
            </div>
            <p style={{ fontSize: 13, color: '#a1a1a6', margin: '4px 0 20px' }}>Pick up in {car.location}</p>

            <div className="date-pair">
              <DateField label="Pick-up" value={pickup} min={today()} onChange={changePickup} />
              <DateField label="Return" value={dropoff} min={addDays(pickup, 1)} onChange={changeDropoff} />
            </div>

            <div style={{ borderTop: '1px solid #3a3a3d', marginTop: 20, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <Line label={`${fmt(car.pricePerDay)} × ${plural(days, 'day')}`} value={fmt(total)} />
              <Line label="Insurance & roadside assistance" value="Included" />
              <div style={{ borderTop: '1px solid #3a3a3d', paddingTop: 12, marginTop: 2 }}>
                <Line label="Total" value={fmt(total)} strong />
              </div>
            </div>

            <button
              onClick={book}
              style={{ width: '100%', marginTop: 20, padding: '14px 0', fontSize: 15, fontWeight: 500, background: '#f5f5f7', color: '#1c1c1e', border: 'none', borderRadius: 980, cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Book Now
            </button>
            <p style={{ fontSize: 12, color: '#86868b', textAlign: 'center', margin: '12px 0 0' }}>
              Free cancellation up to 24 hours before pick-up. <Link to="/terms" style={{ color: '#a1a1a6' }}>Terms</Link>
            </p>
          </aside>
        </div>

        <section style={{ marginTop: 72 }}>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '0 0 24px' }}>
            You may also like
          </h2>
          <div className="similar-grid">
            {similar.map(c => (
              <Link key={c.id} to={`/cars/${c.slug}${query}`} style={{ textDecoration: 'none', borderRadius: 18, overflow: 'hidden', background: '#f5f5f7', display: 'block' }}>
                <div style={{ aspectRatio: '16/10', background: '#e8e8ed' }}>
                  <img src={carImage(c, 600, 375)} alt={`${c.year} ${c.brand} ${c.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '16px 18px 18px' }}>
                  <div style={{ fontSize: 12, color: '#6e6e73' }}>{c.brand} · {c.year}</div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em', margin: '2px 0 6px' }}>{c.model}</div>
                  <div style={{ fontSize: 15, color: '#1d1d1f' }}>
                    {fmt(c.pricePerDay)}<span style={{ fontSize: 13, color: '#6e6e73' }}> / day</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Section({ title, children, first = false }: { title: string; children: React.ReactNode; first?: boolean }) {
  return (
    <section style={{ marginTop: first ? 0 : 40 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f', margin: '0 0 16px' }}>{title}</h2>
      {children}
    </section>
  )
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: strong ? '#f5f5f7' : '#a1a1a6', fontWeight: strong ? 600 : 400, fontSize: strong ? 16 : 14 }}>
      <span>{label}</span>
      <span style={{ color: '#f5f5f7' }}>{value}</span>
    </div>
  )
}

function CarNotFound() {
  return (
    <div style={{ paddingTop: 52, minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px' }}>
      <div>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '0 0 8px' }}>Car not found</h1>
        <p style={{ fontSize: 16, color: '#6e6e73', margin: '0 0 24px' }}>This car may no longer be available.</p>
        <Link to="/marketplace" style={{ fontSize: 15, fontWeight: 500, padding: '12px 28px', borderRadius: 980, background: '#1d1d1f', color: '#fff', textDecoration: 'none' }}>
          Browse all cars
        </Link>
      </div>
    </div>
  )
}

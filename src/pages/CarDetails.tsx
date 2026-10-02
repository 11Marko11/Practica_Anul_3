import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CARS, findCar, type Car } from '../data/cars'
import { addDays, bookingMessage, fmt, today } from '../lib/rental'
import { useRentalDates } from '../lib/useRentalDates'
import { DateField } from '../components/DateField'
import { CarGallery } from '../components/CarGallery'
import { DeliveryPicker } from '../components/DeliveryPicker'
import { SimilarCars } from '../components/SimilarCars'
import { CarReviews } from '../components/CarReviews'
import { useReviews } from '../lib/useReviews'
import type { Handover } from '../lib/delivery'
import { useI18n } from '../i18n/I18nContext'
import { carText } from '../i18n/cars'

export function CarDetails() {
  const { slug = '' } = useParams()
  const car = findCar(slug)
  if (!car) return <CarNotFound />
  return <CarDetailsContent key={car.slug} car={car} />
}

function CarDetailsContent({ car }: { car: Car }) {
  const navigate = useNavigate()
  const { lang, t } = useI18n()
  const text = carText(car, lang)
  const { pickup, dropoff, days, query, changePickup, changeDropoff } = useRentalDates()
  const [handover, setHandover] = useState<Handover>({ mode: 'pickup' })
  const reviewData = useReviews(car.slug)
  const { reviews, average } = reviewData
  const rental = car.pricePerDay * days
  const deliveryQuote = handover.mode === 'delivery' ? handover.quote : null
  const deliveryFee = deliveryQuote?.ok ? deliveryQuote.fee : 0
  const total = rental + deliveryFee
  // Delivery needs an address within range before the car can be booked.
  const canBook = handover.mode === 'pickup' || !!deliveryQuote?.ok

  const specs = [
    { label: t.car.spec.power, value: `${car.horsepower} ${t.car.units.hp}` },
    { label: t.car.spec.acceleration, value: `${car.acceleration} ${t.car.units.s}` },
    { label: t.car.spec.topSpeed, value: `${car.topSpeed} ${t.car.units.kmh}` },
    { label: t.car.spec.transmission, value: text.transmission },
    { label: t.car.spec.drive, value: t.car.drive[car.drive] },
    { label: t.car.spec.seats, value: t.common.seats(car.seats) },
    { label: t.car.spec.fuel, value: t.common.fuel[car.fuel] },
    ...(car.range ? [{ label: car.fuel === 'Hybrid' ? t.car.spec.electricRange : t.car.spec.range, value: `${car.range} ${t.car.units.km}` }] : []),
  ]

  // Same brand first, then same fuel type, then anything else.
  const similar = CARS
    .filter(c => c.id !== car.id)
    .map(c => ({ c, score: (c.brand === car.brand ? 2 : 0) + (c.fuel === car.fuel ? 1 : 0) }))
    .sort((a, b) => b.score - a.score || a.c.pricePerDay - b.c.pricePerDay)
    .slice(0, 8)
    .map(({ c }) => c)

  function book() {
    navigate('/contact', { state: { subject: 'booking', message: bookingMessage(car, pickup, dropoff, handover, t, lang) } })
  }

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 96px' }}>
        <Link to={`/marketplace${query}`} style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none' }}>
          {t.car.allCars}
        </Link>

        <header style={{ margin: '20px 0 28px' }}>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: '0 0 6px' }}>{car.brand} · {car.year}</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.035em', color: '#1d1d1f', margin: '0 0 10px', lineHeight: 1.05 }}>
            {car.model}
          </h1>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>
            {reviews.length > 0 && <span style={{ color: '#1d1d1f', fontWeight: 500 }}>★ {average.toFixed(1)} · </span>}
            <a href="#reviews" style={{ color: '#0071e3', textDecoration: 'none' }}>{t.reviews.count(reviews.length)}</a> · {text.location}
          </p>
        </header>

        <div className="detail-grid">
          <div className="detail-image">
            <CarGallery car={car} />
          </div>

          <div className="detail-info">

            <Section title={t.car.specs} first>
              <div className="spec-grid">
                {specs.map(s => (
                  <div key={s.label} style={{ background: '#f5f5f7', borderRadius: 14, padding: '16px 18px' }}>
                    <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title={t.car.about}>
              <p style={{ fontSize: 16, color: '#424245', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>{text.description}</p>
            </Section>

            <Section title={t.car.features}>
              <ul className="feature-list">
                {text.features.map(f => (
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

            <Section title={t.car.pickupLocation}>
              <PickupMap car={car} />
            </Section>

            <Section title={t.car.host}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#1c1c1e', borderRadius: 18, padding: '20px 22px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#3a3a3d', color: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, flexShrink: 0 }}>
                  {car.host.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f7' }}>{car.host.name}</div>
                  <div style={{ fontSize: 14, color: '#a1a1a6', marginTop: 2 }}>
                    ★ {car.host.rating.toFixed(1)} · {t.common.trips(car.host.trips)} · {t.car.verifiedHost}
                  </div>
                </div>
              </div>
            </Section>

            <Section title={t.reviews.title} id="reviews">
              <CarReviews data={reviewData} />
            </Section>
          </div>

          <aside className="booking-card" style={{ background: '#1c1c1e', borderRadius: 24, padding: '28px 24px', color: '#f5f5f7' }}>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em' }}>
              {fmt(car.pricePerDay)}<span style={{ fontSize: 15, fontWeight: 400, color: '#a1a1a6' }}>{t.common.perDay}</span>
            </div>
            <p style={{ fontSize: 13, color: '#a1a1a6', margin: '4px 0 20px' }}>{t.car.locatedAt(car.pickup.address)}</p>

            <div className="date-pair">
              <DateField label={t.car.pickup} value={pickup} min={today()} onChange={changePickup} />
              <DateField label={t.car.return} value={dropoff} min={addDays(pickup, 1)} onChange={changeDropoff} />
            </div>

            <DeliveryPicker car={car} value={handover} onChange={setHandover} />

            <div style={{ borderTop: '1px solid #3a3a3d', marginTop: 20, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <Line label={`${fmt(car.pricePerDay)} × ${t.common.days(days)}`} value={fmt(rental)} />
              {deliveryQuote?.ok && <Line label={t.car.deliveryLine(deliveryQuote.km)} value={fmt(deliveryFee)} />}
              <Line label={t.car.insurance} value={t.car.included} />
              <div style={{ borderTop: '1px solid #3a3a3d', paddingTop: 12, marginTop: 2 }}>
                <Line label={t.car.total} value={fmt(total)} strong />
              </div>
            </div>

            <button
              onClick={book}
              disabled={!canBook}
              style={{ width: '100%', marginTop: 20, padding: '14px 0', fontSize: 15, fontWeight: 500, background: '#f5f5f7', color: '#1c1c1e', border: 'none', borderRadius: 980, cursor: canBook ? 'pointer' : 'not-allowed', opacity: canBook ? 1 : 0.4, transition: 'opacity 0.15s' }}
            >
              {t.car.book}
            </button>
            {!canBook && (
              <p style={{ fontSize: 12, color: '#a1a1a6', textAlign: 'center', margin: '8px 0 0' }}>
                {deliveryQuote ? t.car.chooseInCountry : t.car.chooseAddress}
              </p>
            )}
            <p style={{ fontSize: 12, color: '#86868b', textAlign: 'center', margin: '12px 0 0' }}>
              {t.car.freeCancel} <Link to="/terms" style={{ color: '#a1a1a6' }}>{t.car.terms}</Link>
            </p>
          </aside>
        </div>

        <SimilarCars cars={similar} query={query} />
      </div>
    </div>
  )
}

// OpenStreetMap embed centred on the car's pick-up address.
function PickupMap({ car }: { car: Car }) {
  const { address, lat, lng } = car.pickup
  const { t } = useI18n()
  const bbox = [lng - 0.012, lat - 0.006, lng + 0.012, lat + 0.006].join(',')
  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', background: '#f5f5f7' }}>
      <iframe
        title={t.car.mapTitle(address)}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
        loading="lazy"
        style={{ display: 'block', width: '100%', height: 260, border: 0 }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '14px 18px' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1d1d1f' }}>{address}</div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>{t.car.meetHost}</div>
        </div>
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {t.car.openMap}
        </a>
      </div>
    </div>
  )
}

function Section({ title, children, first = false, id }: { title: string; children: React.ReactNode; first?: boolean; id?: string }) {
  return (
    <section id={id} style={{ marginTop: first ? 0 : 40, scrollMarginTop: 72 }}>
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
  const { t } = useI18n()
  return (
    <div style={{ paddingTop: 52, minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px' }}>
      <div>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '0 0 8px' }}>{t.car.notFound}</h1>
        <p style={{ fontSize: 16, color: '#6e6e73', margin: '0 0 24px' }}>{t.car.notFoundText}</p>
        <Link to="/marketplace" style={{ fontSize: 15, fontWeight: 500, padding: '12px 28px', borderRadius: 980, background: '#1d1d1f', color: '#fff', textDecoration: 'none' }}>
          {t.car.browseAll}
        </Link>
      </div>
    </div>
  )
}

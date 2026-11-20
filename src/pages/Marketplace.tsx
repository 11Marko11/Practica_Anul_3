import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { carImage, type Car } from '../data/cars'
import { FavoriteButton } from '../components/FavoriteButton'
import { reloadCars, useCars, useCatalogStatus } from '../lib/carStore'
import { addDays, fmt, today } from '../lib/rental'
import { useRentalDates } from '../lib/useRentalDates'
import { DateField } from '../components/DateField'
import { PromoBanner } from '../components/PromoBanner'
import { pageFrom, Pagination } from '../components/Pagination'
import { useI18n } from '../i18n/I18nContext'
import { ResetButton } from '../components/ResetButton'
import { applyFilters, FUELS, POWER_OPTIONS, SEAT_OPTIONS, SORTS, useCarFilters, useUnavailableCars, type Filters, type Sort } from '../lib/carFilters'

const PAGE_SIZE = 12

export function Marketplace() {
  const { t } = useI18n()
  const cars = useCars()
  const status = useCatalogStatus()
  const { pickup, dropoff, days, query, changePickup, changeDropoff } = useRentalDates()
  const { filters, update, active, reset, params, edit } = useCarFilters()
  const unavailable = useUnavailableCars(pickup, dropoff) ?? []
  const [showFilters, setShowFilters] = useState(false)

  // Cars already booked for the chosen dates are not offered.
  const free = cars.filter(c => !unavailable.includes(c.id))
  const list = applyFilters(free, filters)
  const hiddenBooked = cars.length - free.length

  // Long lists are split into pages; the page number lives in the URL (?page=2).
  const pages = Math.ceil(list.length / PAGE_SIZE)
  const page = pageFrom(params, pages)
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const gridTop = useRef<HTMLElement>(null)
  function goToPage(n: number) {
    edit(p => (n > 1 ? p.set('page', String(n)) : p.delete('page')), { push: true })
    gridTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const brands = [...new Set(cars.map(c => c.brand))].sort((a, b) => a.localeCompare(b))
  const cities = [...new Set(cars.map(c => c.location.split(',')[0]))].sort((a, b) => a.localeCompare(b))
  const prices = cars.map(c => c.pricePerDay)
  const priceMin = Math.floor(Math.min(...prices, 0) / 100) * 100
  const priceMax = Math.ceil(Math.max(...prices, 100) / 100) * 100

  return (
    <div style={{ paddingTop: 64 }}>
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

      {/* Filters and sorting */}
      <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="filters-toggle-row">
            <button className="filters-toggle" onClick={() => setShowFilters(s => !s)} aria-expanded={showFilters} style={{ ...pill(active > 0), gap: 8 }}>
              {t.marketplace.filters}{active > 0 && ` (${active})`}
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className={`filters-panel${showFilters ? ' filters-panel--open' : ''}`}>
            <FilterField label={t.marketplace.brand}>
              <Select label={t.marketplace.brand} value={filters.brand ?? ''} active={!!filters.brand} onChange={v => update({ brand: v || null })}>
                <option value="">{t.marketplace.any}</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </Select>
            </FilterField>
            <FilterField label={t.marketplace.city}>
              <Select label={t.marketplace.city} value={filters.city ?? ''} active={!!filters.city} onChange={v => update({ city: v || null })}>
                <option value="">{t.marketplace.allCities}</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FilterField>
            <FilterField label={t.marketplace.fuel} wide>
              <div role="group" aria-label={t.marketplace.fuel} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FUELS.map(f => {
                  const on = filters.fuels.includes(f)
                  return (
                    <button key={f} aria-pressed={on} onClick={() => update(cur => ({ fuels: cur.fuels.includes(f) ? cur.fuels.filter(x => x !== f) : [...cur.fuels, f] }))} style={pill(on)}>
                      {t.common.fuel[f]}
                    </button>
                  )
                })}
              </div>
            </FilterField>
            <FilterField label={t.marketplace.seats}>
              <Select label={t.marketplace.seats} value={String(filters.seats ?? '')} active={!!filters.seats} onChange={v => update({ seats: v ? Number(v) : null })}>
                <option value="">{t.marketplace.any}</option>
                {SEAT_OPTIONS.map(n => <option key={n} value={n}>{t.marketplace.atLeast(n)}</option>)}
              </Select>
            </FilterField>
            <FilterField label={t.marketplace.drive}>
              <Select label={t.marketplace.drive} value={filters.drive ?? ''} active={!!filters.drive} onChange={v => update({ drive: (v || null) as Filters['drive'] })}>
                <option value="">{t.marketplace.any}</option>
                <option value="AWD">{t.car.drive.AWD}</option>
                <option value="RWD">{t.car.drive.RWD}</option>
                <option value="FWD">{t.car.drive.FWD}</option>
              </Select>
            </FilterField>
            <FilterField label={t.marketplace.power}>
              <Select label={t.marketplace.power} value={String(filters.minHp ?? '')} active={!!filters.minHp} onChange={v => update({ minHp: v ? Number(v) : null })}>
                <option value="">{t.marketplace.any}</option>
                {POWER_OPTIONS.map(hp => <option key={hp} value={hp}>{t.marketplace.powerAtLeast(hp)}</option>)}
              </Select>
            </FilterField>
            <FilterField label={`${t.marketplace.maxPrice}: ${t.marketplace.upTo(fmt(filters.maxPrice ?? priceMax))}`}>
              <input
                type="range"
                aria-label={t.marketplace.maxPrice}
                min={priceMin}
                max={priceMax}
                step={100}
                value={Math.min(filters.maxPrice ?? priceMax, priceMax)}
                onChange={e => update({ maxPrice: Number(e.target.value) >= priceMax ? null : Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#1d1d1f' }}
              />
            </FilterField>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px 16px', flexWrap: 'wrap', marginTop: 16 }}>
            <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>{t.marketplace.available(list.length)}</p>
            {hiddenBooked > 0 && <p style={{ fontSize: 13, color: '#86868b', margin: 0 }}>{t.marketplace.bookedHidden(hiddenBooked)}</p>}
            {active > 0 && (
              <ResetButton onClick={reset}>{t.marketplace.reset}</ResetButton>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#6e6e73', marginLeft: 'auto' }}>
              {t.marketplace.sortBy}
              <Select label={t.marketplace.sortBy} value={filters.sort} active={filters.sort !== 'newest'} onChange={v => update({ sort: v as Sort })}>
                {SORTS.map(s => <option key={s} value={s}>{t.marketplace.sort[s]}</option>)}
              </Select>
            </label>
          </div>
        </div>
      </div>

      {/* Grid */}
      <main ref={gridTop} style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 96px', scrollMarginTop: 64 }}>
        <PromoBanner placement="MARKETPLACE" style={{ marginBottom: 32 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 20 }}>
          {shown.map(car => <CarCard key={car.id} car={car} days={days} query={query} />)}
        </div>
        <Pagination page={page} pages={pages} total={list.length} pageSize={PAGE_SIZE} onChange={goToPage} />
        {list.length === 0 && status === 'loading' && (
          <p style={{ textAlign: 'center', padding: '80px 0', fontSize: 15, color: '#6e6e73' }}>{t.marketplace.loading}</p>
        )}
        {list.length === 0 && status === 'error' && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 15, color: '#6e6e73', margin: '0 0 16px' }}>{t.marketplace.loadError}</p>
            <button onClick={reloadCars} style={{ fontSize: 14, fontWeight: 500, padding: '10px 22px', borderRadius: 980, background: '#1d1d1f', color: '#fff', border: 'none', cursor: 'pointer' }}>
              {t.marketplace.retry}
            </button>
          </div>
        )}
        {list.length === 0 && status === 'ready' && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 22, fontWeight: 500, color: '#1d1d1f' }}>{t.marketplace.emptyTitle}</p>
            <p style={{ fontSize: 15, color: '#6e6e73', marginTop: 8 }}>{t.marketplace.emptyText}</p>
            {active > 0 && (
              <button onClick={reset} style={{ marginTop: 16, fontSize: 14, fontWeight: 500, padding: '10px 22px', borderRadius: 980, background: '#1d1d1f', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {t.marketplace.reset}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// Rounded button used for the fuel choices and the phone "Filters" toggle; dark when selected.
const pill = (on: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', fontSize: 13, padding: '8px 14px', borderRadius: 980, border: '1px solid', cursor: 'pointer',
  borderColor: on ? '#1d1d1f' : '#d2d2d7', background: on ? '#1d1d1f' : '#fff', color: on ? '#fff' : '#1d1d1f', fontFamily: 'inherit', transition: 'all 0.15s',
})

function FilterField({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? 'filter-wide' : undefined} style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

function Select({ label, value, active, onChange, children }: { label: string; value: string; active: boolean; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <span style={{ position: 'relative', display: 'flex' }}>
      <select
        aria-label={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ appearance: 'none', width: '100%', fontSize: 14, fontFamily: 'inherit', padding: '9px 36px 9px 14px', borderRadius: 980, border: '1px solid', borderColor: active ? '#1d1d1f' : '#d2d2d7', background: '#fff', color: '#1d1d1f', cursor: 'pointer', outline: 'none' }}
      >
        {children}
      </select>
    </span>
  )
}

export function CarCard({ car, days, query }: { car: Car; days: number; query: string }) {
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
        <img src={carImage(car, 900, 600)} loading="lazy" decoding="async" alt={`${car.year} ${car.brand} ${car.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s', transform: hov ? 'scale(1.04)' : 'scale(1)' }} />
        {/* Dots in the corner: the fuel, and whether the host delivers / lets the car be left anywhere. */}
        <div className="card-badges">
          <FuelBadge fuel={car.fuel} />
          {/* Both: one oval with the two icons instead of two dots. */}
          {car.delivery !== false && car.freeReturn !== false
            ? <InfoBadge kind="both" />
            : <>
              {car.delivery !== false && <InfoBadge kind="delivery" />}
              {car.freeReturn !== false && <InfoBadge kind="return" />}
            </>}
        </div>
      </div>
      <div style={{ padding: '20px 20px 22px' }}>
        <p style={{ fontSize: 12, color: '#6e6e73', margin: '0 0 4px' }}>{car.brand} · {car.year}</p>
        <h2 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f', margin: '0 0 14px', lineHeight: 1.2 }}>{car.model}</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 500, color: '#1d1d1f', letterSpacing: '-0.02em' }}>
            {fmt(car.pricePerDay)}<span style={{ fontSize: 13, fontWeight: 400, color: '#6e6e73' }}>{t.common.perDay}</span>
          </span>
          <span style={{ fontSize: 12, color: '#6e6e73' }}>{t.common.seats(car.seats)}</span>
        </div>
        {/* "View details" and, on its right, the heart that saves the car to the favourites. */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 12, fontSize: 18, fontWeight: 800, color: '#fff', background: hov ? '#3a3a3c' : '#1d1d1f', transition: 'background-color 0.15s' }}>
            {t.marketplace.viewDetails}
          </span>
          <FavoriteButton carId={car.id} className="fav-button--card" />
        </div>
      </div>
    </Link>
  )
}

// The fuel of a car on its card: a small coloured dot with an icon that opens to the full name
// on hover ("Electric car"…). Each fuel has its own colour and icon.
const FUEL_ICONS: Record<Car['fuel'], React.ReactNode> = {
  Electric: <path d="M7.2 0 0.8 8h4.3L4.4 14l6.8-8.4H6.8L7.2 0z" fill="currentColor" />,
  Hybrid: <path d="M12.6 1.2C6.4 1 2 3.6 2 8.3c0 1.2.4 2.2 1 3L1.4 13l1 .9 1.6-1.7c.8.5 1.8.8 2.9.8 4.4 0 6.4-4.3 5.7-11.8zM5.2 10.6l-.8-.8C6 7.5 7.9 5.8 10.1 4.6 8.2 6.1 6.6 8.1 5.2 10.6z" fill="currentColor" />,
  // A fuel pump.
  Petrol: <path d="M2 1.5A1.5 1.5 0 0 1 3.5 0h4A1.5 1.5 0 0 1 9 1.5V6h.5A1.5 1.5 0 0 1 11 7.5v3a.5.5 0 0 0 1 0V5.2l-1.3-1.3.7-.7L13 4.8v5.7a1.5 1.5 0 0 1-3 0v-3a.5.5 0 0 0-.5-.5H9v6h.5v1h-8v-1H2V1.5zM3.5 1.5V5h4V1.5h-4z" fill="currentColor" />,
  // A drop.
  Diesel: <path d="M7 0C5 3.2 2.2 6.3 2.2 9.1A4.8 4.8 0 0 0 7 14a4.8 4.8 0 0 0 4.8-4.9C11.8 6.3 9 3.2 7 0z" fill="currentColor" />,
}

// The host delivers the car to the customer's address / the customer may leave it anywhere.
const INFO_ICONS = {
  // A van.
  delivery: <path d="M1 3h7.5v6.5H1zM8.5 5.2h2.6L13 7.6v1.9H8.5zM3.6 12.2a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8zm7 0a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z" fill="currentColor" />,
  // A map pin.
  return: <path d="M7 0a4.7 4.7 0 0 0-4.7 4.7C2.3 8.3 7 14 7 14s4.7-5.7 4.7-9.3A4.7 4.7 0 0 0 7 0zm0 6.6a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8z" fill="currentColor" />,
}

function InfoBadge({ kind }: { kind: keyof typeof INFO_ICONS | 'both' }) {
  const { t } = useI18n()
  const label = kind === 'both' ? t.common.bothBadge : kind === 'delivery' ? t.common.deliveryBadge : t.common.returnBadge
  const icons = kind === 'both' ? (['delivery', 'return'] as const) : [kind]
  return (
    <span className={`ev-badge ev-badge--${kind}`} aria-label={label}>
      {icons.map(k => <svg key={k} width="13" height="14" viewBox="0 0 14 14" aria-hidden="true">{INFO_ICONS[k]}</svg>)}
      <span className="ev-badge__label">{label}</span>
    </span>
  )
}

function FuelBadge({ fuel }: { fuel: Car['fuel'] }) {
  const { t } = useI18n()
  const label = t.common.fuelCar[fuel]
  return (
    <span className={`ev-badge ev-badge--${fuel.toLowerCase()}`} aria-label={label}>
      <svg width="13" height="14" viewBox="0 0 14 14" aria-hidden="true">{FUEL_ICONS[fuel]}</svg>
      <span className="ev-badge__label">{label}</span>
    </span>
  )
}

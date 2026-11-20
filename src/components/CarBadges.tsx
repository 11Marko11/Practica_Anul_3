import type { Car } from '../data/cars'
import { useI18n } from '../i18n/I18nContext'

// Dots in a car photo's top right corner: the fuel, and whether the host delivers the car / lets
// it be left anywhere (one oval with both icons when both). Each opens to its name on hover.
export function CarBadges({ car }: { car: Car }) {
  return (
    <div className="card-badges">
      <FuelBadge fuel={car.fuel} />
      {car.delivery !== false && car.freeReturn !== false
        ? <InfoBadge kind="both" />
        : <>
          {car.delivery !== false && <InfoBadge kind="delivery" />}
          {car.freeReturn !== false && <InfoBadge kind="return" />}
        </>}
    </div>
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

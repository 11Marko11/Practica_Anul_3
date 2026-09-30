import type { Car } from '../data/cars'
import type { Handover } from './delivery'

export function fmt(n: number) {
  return '$' + n.toLocaleString('en-US')
}

// Dates are 'YYYY-MM-DD' strings, handled in UTC so time zones can't shift the day.
export function addDays(date: string, n: number) {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysBetween(from: string, to: string) {
  const ms = new Date(to + 'T00:00:00Z').getTime() - new Date(from + 'T00:00:00Z').getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n !== 1 ? 's' : ''}`
}

// The prefilled message sent to the Contact page when someone books a car.
export function bookingMessage(car: Car, pickup: string, dropoff: string, handover: Handover) {
  const days = daysBetween(pickup, dropoff)
  const rental = car.pricePerDay * days
  const quote = handover.mode === 'delivery' && handover.quote?.ok ? handover.quote : null
  const lines = [
    `I'd like to rent the ${car.brand} ${car.model} from ${pickup} to ${dropoff} (${plural(days, 'day')}, ${fmt(rental)}).`,
    quote
      ? `Please deliver it to ${quote.place.label} (≈ ${quote.km} km, ${fmt(quote.fee)} delivery) and collect it there at the end.`
      : `I'll pick it up at ${car.pickup.address}.`,
    `Total: ${fmt(rental + (quote?.fee ?? 0))}.`,
  ]
  return lines.join(' ')
}

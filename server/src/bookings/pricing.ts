import { HttpError } from '../http/errors.js'

// Same rules as the website's src/lib/delivery.ts: keep the two in sync.
export const DELIVERY = { baseFee: 350, perKm: 20, roadFactor: 1.3, country: 'md' }

type Point = { lat: number; lng: number }

function straightLineKm(a: Point, b: Point) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export function deliveryQuote(from: Point, to: Point) {
  const km = Math.max(1, Math.round(straightLineKm(from, to) * DELIVERY.roadFactor))
  return { km, fee: Math.round(DELIVERY.baseFee + DELIVERY.perKm * km) }
}

// Delivery is only offered inside Moldova. The website checks this too, but the price is
// decided here, so check again with OpenStreetMap's reverse geocoder.
export async function assertInMoldova(point: Point, siteUrl: string) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.search = new URLSearchParams({ lat: String(point.lat), lon: String(point.lng), format: 'json', zoom: '3' }).toString()
  let country = ''
  try {
    const res = await fetch(url, { headers: { 'User-Agent': `RentMotors/1.0 (${siteUrl})` }, signal: AbortSignal.timeout(8000) })
    country = ((await res.json()) as { address?: { country_code?: string } }).address?.country_code ?? ''
  } catch {
    throw new HttpError(502, 'delivery-check-failed')
  }
  if (country !== DELIVERY.country) throw new HttpError(422, 'delivery-outside-country')
}

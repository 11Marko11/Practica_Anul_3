// Delivery pricing: a flat fee plus a per-kilometre rate from the car's pick-up address,
// to any address in Moldova. Distances are straight-line distances scaled by a road
// factor, which is a fair estimate of driving distance without a routing service.
export const DELIVERY = {
  baseFee: 350, // MDL
  perKm: 20, // MDL
  country: 'md', // ISO code of the country we deliver in
  roadFactor: 1.3,
}

export type Place = { label: string; lat: number; lng: number; countryCode: string }

export type DeliveryQuote =
  | { ok: true; place: Place; km: number; fee: number }
  | { ok: false; place: Place }

// How the renter gets the car: collect it from the host, or have it delivered.
export type Handover = { mode: 'pickup' } | { mode: 'delivery'; quote: DeliveryQuote | null }

function straightLineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export function quoteDelivery(from: { lat: number; lng: number }, place: Place): DeliveryQuote {
  if (place.countryCode !== DELIVERY.country) return { ok: false, place }
  const km = Math.max(1, Math.round(straightLineKm(from, place) * DELIVERY.roadFactor))
  return { ok: true, place, km, fee: Math.round(DELIVERY.baseFee + DELIVERY.perKm * km) }
}

// Address search through OpenStreetMap's Nominatim service (free, no API key).
// Its usage policy allows light use like this: one search per user action, no autocomplete.
// Results are limited to the delivery country.
export async function searchAddress(query: string, lang: string, signal?: AbortSignal): Promise<Place[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.search = new URLSearchParams({ q: query, format: 'json', limit: '5', addressdetails: '1', countrycodes: DELIVERY.country, 'accept-language': lang }).toString()
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Address search failed (${res.status})`)
  const rows = (await res.json()) as NominatimResult[]
  const places = rows.map(r => ({ label: placeLabel(r), lat: Number(r.lat), lng: Number(r.lon), countryCode: r.address?.country_code ?? '' }))
  // Several results can describe the same street address (e.g. two shops in one building).
  return places.filter((p, i) => places.findIndex(q => q.label === p.label) === i)
}

// Which country a point is in (used for "Use my current location"), as a lowercase ISO code.
export async function countryAt(lat: number, lng: number): Promise<string> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.search = new URLSearchParams({ lat: String(lat), lon: String(lng), format: 'json', zoom: '3' }).toString()
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Location lookup failed (${res.status})`)
  const row = (await res.json()) as Partial<NominatimResult>
  return row.address?.country_code ?? ''
}

type NominatimResult = {
  display_name: string
  lat: string
  lon: string
  address?: Record<string, string>
}

// "Marienplatz 1, 80331 Munich" rather than the shop or building name Nominatim puts first.
function placeLabel(r: NominatimResult) {
  const a = r.address ?? {}
  const street = [a.road, a.house_number].filter(Boolean).join(' ')
  const town = a.city ?? a.town ?? a.village ?? a.municipality
  const place = [a.postcode, town].filter(Boolean).join(' ')
  const label = [street, place].filter(Boolean).join(', ')
  return label || r.display_name.split(', ').slice(0, 4).join(', ')
}

// Delivery pricing: a flat fee plus a per-kilometre rate, up to a maximum distance
// from the car's pick-up address. Distances are straight-line distances scaled by a
// road factor, which is a fair estimate of driving distance without a routing service.
export const DELIVERY = {
  baseFee: 20,
  perKm: 1.2,
  maxKm: 100,
  roadFactor: 1.3,
}

export type Place = { label: string; lat: number; lng: number }

export type DeliveryQuote =
  | { ok: true; place: Place; km: number; fee: number }
  | { ok: false; place: Place; km: number }

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
  const km = Math.max(1, Math.round(straightLineKm(from, place) * DELIVERY.roadFactor))
  if (km > DELIVERY.maxKm) return { ok: false, place, km }
  return { ok: true, place, km, fee: Math.round(DELIVERY.baseFee + DELIVERY.perKm * km) }
}

// Address search through OpenStreetMap's Nominatim service (free, no API key).
// Its usage policy allows light use like this: one search per user action, no autocomplete.
export async function searchAddress(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.search = new URLSearchParams({ q: query, format: 'json', limit: '5', addressdetails: '1', 'accept-language': 'en' }).toString()
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Address search failed (${res.status})`)
  const rows = (await res.json()) as NominatimResult[]
  const places = rows.map(r => ({ label: placeLabel(r), lat: Number(r.lat), lng: Number(r.lon) }))
  // Several results can describe the same street address (e.g. two shops in one building).
  return places.filter((p, i) => places.findIndex(q => q.label === p.label) === i)
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

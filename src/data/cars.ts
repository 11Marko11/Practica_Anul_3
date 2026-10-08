export type Car = {
  id: number
  slug: string
  brand: string
  model: string
  year: number
  pricePerDay: number // Moldovan lei (MDL)
  fuel: 'Petrol' | 'Electric' | 'Hybrid'
  seats: number
  photos: string[] // Unsplash photo ids or full image links; the first one is the cover
  horsepower: number
  acceleration: number // 0–100 km/h in seconds
  topSpeed: number // km/h
  transmission: string
  drive: 'AWD' | 'RWD'
  range?: number // electric range in km
  location: string // city shown in listings
  pickup: { address: string; lat: number; lng: number } // where the car is collected
  host: { name: string; rating: number; trips: number }
  description: string // English
  features: string[]
  translations?: Partial<Record<'ro' | 'ru', { description: string }>>
  status?: 'ACTIVE' | 'HIDDEN' // hidden cars are only sent to admins
}

// Cities a car can be collected in (offered in the admin form).
export const CITIES = ['Chișinău', 'Bălți', 'Cahul', 'Căușeni', 'Comrat', 'Drochia', 'Edineț', 'Florești', 'Hîncești', 'Ialoveni', 'Orhei', 'Soroca', 'Strășeni', 'Ungheni']

export function carImage(car: Car, width: number, height: number, index = 0) {
  return photoUrl(car.photos[index], width, height)
}

// A full image link is used as is; anything else is treated as an Unsplash photo id.
export function photoUrl(photo: string, width: number, height: number) {
  if (/^https?:\/\//.test(photo)) return photo
  return `https://images.unsplash.com/${photo}?w=${width}&h=${height}&fit=crop&auto=format`
}

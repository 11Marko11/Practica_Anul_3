export type Car = {
  id: number
  slug: string
  brand: string
  model: string
  year: number
  pricePerDay: number // Moldovan lei (MDL)
  fuel: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid'
  seats: number
  photos: string[] // Unsplash photo ids or full image links; the first one is the cover
  horsepower: number
  acceleration: number // 0–100 km/h in seconds
  topSpeed: number // km/h
  transmission: string
  drive: 'AWD' | 'RWD' | 'FWD'
  range?: number // electric range in km
  location: string // city shown in listings
  pickup: { address: string; lat: number; lng: number } // where the car is collected
  // rating: average of the reviews of the host's cars (null before the first one); trips: completed rentals
  host: { id?: number; name: string; rating: number | null; reviews?: number; trips: number }
  description: string // English
  features: string[]
  defects?: string[] // known flaws listed by the host
  translations?: Partial<Record<'ro' | 'ru', { description: string }>>
  photoCredits?: ({ text: string; url: string | null } | null)[] // author and licence, same order as photos
  status?: 'ACTIVE' | 'HIDDEN' | 'REMOVED' // hidden and removed cars are only sent to admins
  createdAt?: string // when the car was added
}

// Cities a car can be collected in (offered in the admin form).
export const CITIES = ['Chișinău', 'Bălți', 'Cahul', 'Căușeni', 'Comrat', 'Drochia', 'Edineț', 'Florești', 'Hîncești', 'Ialoveni', 'Orhei', 'Soroca', 'Strășeni', 'Ungheni']

export function carImage(car: Car, width: number, height: number, index = 0) {
  return photoUrl(car.photos[index], width, height)
}

// A full image link is used as is; photos served by the site (/cars/…-960.jpg) also exist in
// 330 px for thumbnails; anything else is treated as an Unsplash photo id.
export function photoUrl(photo: string, width: number, height: number) {
  if (photo.startsWith('/cars/')) return width <= 400 ? photo.replace(/-960\.jpg$/, '-330.jpg') : photo
  if (/^https?:\/\//.test(photo) || photo.startsWith('/api/')) return photo // full links and uploaded photos
  return `https://images.unsplash.com/${photo}?w=${width}&h=${height}&fit=crop&auto=format`
}

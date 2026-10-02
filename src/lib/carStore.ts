import { useSyncExternalStore } from 'react'
import { SAMPLE_CARS, type Car } from '../data/cars'

// The car catalogue. Until the site has a backend, changes made in the admin pages are
// saved in localStorage. This file is the only place that knows that: when a backend
// exists, only these functions need to call it, and the pages stay the same.
const CARS_KEY = 'rentmotors.cars'

let cars: Car[] = load()
const listeners = new Set<() => void>()

function load(): Car[] {
  try {
    const raw = localStorage.getItem(CARS_KEY)
    return raw ? (JSON.parse(raw) as Car[]) : SAMPLE_CARS
  } catch {
    return SAMPLE_CARS
  }
}

// `null` goes back to the sample catalogue.
function commit(next: Car[] | null) {
  cars = next ?? SAMPLE_CARS
  try {
    if (next) localStorage.setItem(CARS_KEY, JSON.stringify(next))
    else localStorage.removeItem(CARS_KEY)
  } catch {
    // Storage unavailable (private mode): changes last until the page is reloaded.
  }
  listeners.forEach(l => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Keep other open tabs in sync with changes made in the admin pages.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== CARS_KEY) return
    cars = load()
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useCars() {
  return useSyncExternalStore(subscribe, () => cars)
}

export function useCar(slug: string) {
  return useCars().find(c => c.slug === slug)
}

// Adds a new car, or replaces the car with the same id.
export function saveCar(car: Car) {
  commit(cars.some(c => c.id === car.id) ? cars.map(c => (c.id === car.id ? car : c)) : [...cars, car])
}

export function deleteCar(id: number) {
  commit(cars.filter(c => c.id !== id))
}

export function resetCars() {
  commit(null)
}

export function nextCarId() {
  return Math.max(0, ...cars.map(c => c.id)) + 1
}

// "BMW", "M4 Competition" → "bmw-m4-competition", with "-2", "-3"… if another car already uses it.
export function uniqueSlug(brand: string, model: string, ownId?: number) {
  const base = `${brand} ${model}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'car'
  const taken = (slug: string) => cars.some(c => c.slug === slug && c.id !== ownId)
  let slug = base
  for (let n = 2; taken(slug); n++) slug = `${base}-${n}`
  return slug
}

import { useEffect, useState } from 'react'
import { useUrlParams } from './useUrlParams'
import type { Car } from '../data/cars'
import { api } from './api'

export const SORTS = ['newest', 'price-asc', 'price-desc', 'power', 'fastest'] as const
export type Sort = (typeof SORTS)[number]
export const FUELS: Car['fuel'][] = ['Petrol', 'Electric', 'Hybrid']
export const SEAT_OPTIONS = [2, 4, 5]
export const POWER_OPTIONS = [300, 500, 700]

export type Filters = {
  brand: string | null
  city: string | null
  fuels: Car['fuel'][] // empty = any
  seats: number | null // at least
  drive: Car['drive'] | null
  minHp: number | null
  maxPrice: number | null
  sort: Sort
}

const int = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null)

function parse(params: URLSearchParams): Filters {
  const sort = params.get('sort')
  const drive = params.get('drive')
  return {
    brand: params.get('brand'),
    city: params.get('city'),
    fuels: (params.get('fuel') ?? '').split(',').filter((f): f is Car['fuel'] => FUELS.includes(f as Car['fuel'])),
    seats: int(params.get('seats')),
    drive: drive === 'AWD' || drive === 'RWD' ? drive : null,
    minHp: int(params.get('hp')),
    maxPrice: int(params.get('maxPrice')),
    sort: SORTS.includes(sort as Sort) ? (sort as Sort) : 'newest',
  }
}

const NO_FILTERS = { brand: null, city: null, fuels: [], seats: null, drive: null, minHp: null, maxPrice: null } satisfies Omit<Filters, 'sort'>

// The car list's filters and sort order live in the URL (?brand=BMW&fuel=Electric,Hybrid&sort=power…),
// so they survive a reload, the back button, and can be shared as a link.
export function useCarFilters() {
  const { params, edit } = useUrlParams()
  const filters = parse(params)

  function update(change: Partial<Filters> | ((current: Filters) => Partial<Filters>)) {
    edit(p => {
      const current = parse(p)
      const next = { ...current, ...(typeof change === 'function' ? change(current) : change) }
      const put = (key: string, value: string | number | null) => (value === null || value === '' ? p.delete(key) : p.set(key, String(value)))
      put('brand', next.brand)
      put('city', next.city)
      put('fuel', next.fuels.join(','))
      put('seats', next.seats)
      put('drive', next.drive)
      put('hp', next.minHp)
      put('maxPrice', next.maxPrice)
      put('sort', next.sort === 'newest' ? null : next.sort)
    })
  }

  const active = [filters.brand, filters.city, filters.fuels.length || null, filters.seats, filters.drive, filters.minHp, filters.maxPrice].filter(v => v !== null).length

  return { filters, update, active, reset: () => update(NO_FILTERS) }
}

export function applyFilters(cars: Car[], f: Filters) {
  return cars
    .filter(c =>
      (!f.brand || c.brand === f.brand) &&
      (!f.city || c.location.split(',')[0] === f.city) &&
      (!f.fuels.length || f.fuels.includes(c.fuel)) &&
      (!f.seats || c.seats >= f.seats) &&
      (!f.drive || c.drive === f.drive) &&
      (!f.minHp || c.horsepower >= f.minHp) &&
      (!f.maxPrice || c.pricePerDay <= f.maxPrice),
    )
    .sort((a, b) => {
      switch (f.sort) {
        case 'price-asc': return a.pricePerDay - b.pricePerDay
        case 'price-desc': return b.pricePerDay - a.pricePerDay
        case 'power': return b.horsepower - a.horsepower
        case 'fastest': return a.acceleration - b.acceleration
        default: return b.year - a.year || a.pricePerDay - b.pricePerDay
      }
    })
}

// Cars to suggest on My bookings: free ones, most like what the customer booked before
// (same brand, same fuel, similar price). Without a history, the newest cars come first.
export function recommendCars(free: Car[], history: Car[], limit = 8) {
  const brands = new Set(history.map(c => c.brand))
  const fuels = new Set(history.map(c => c.fuel))
  const avgPrice = history.length ? history.reduce((s, c) => s + c.pricePerDay, 0) / history.length : 0
  const score = (c: Car) =>
    (brands.has(c.brand) ? 3 : 0) + (fuels.has(c.fuel) ? 2 : 0) + (avgPrice ? Math.max(0, 1 - Math.abs(c.pricePerDay - avgPrice) / avgPrice) : 0)
  return [...free]
    .sort((a, b) => (history.length ? score(b) - score(a) : 0) || b.year - a.year || a.pricePerDay - b.pricePerDay)
    .slice(0, limit)
}

// Ids of cars already booked for [pickup, dropoff); null until the server answers.
export function useUnavailableCars(pickup: string, dropoff: string) {
  const [ids, setIds] = useState<number[] | null>(null)
  useEffect(() => {
    let cancelled = false
    api<{ carIds: number[] }>(`/cars/unavailable?from=${pickup}&to=${dropoff}`)
      .then(res => !cancelled && setIds(res.carIds))
      .catch(() => !cancelled && setIds([]))
    return () => {
      cancelled = true
    }
  }, [pickup, dropoff])
  return ids
}

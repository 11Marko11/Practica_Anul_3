import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Car } from '../data/cars'
import { api } from './api'

// The car catalogue, loaded from the API once and shared by every page.
// Admins also receive hidden cars; public pages only show active ones.
type State = { cars: Car[]; status: 'loading' | 'ready' | 'error' }

let state: State = { cars: [], status: 'loading' }
let started = false
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  listeners.forEach(l => l())
}

export async function reloadCars() {
  started = true
  if (state.status === 'error') set({ ...state, status: 'loading' })
  try {
    const res = await api<{ cars: Car[] }>('/cars')
    set({ cars: res.cars, status: 'ready' })
  } catch {
    set({ ...state, status: state.status === 'ready' ? 'ready' : 'error' })
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!started) reloadCars()
  return () => listeners.delete(listener)
}

function useStore() {
  return useSyncExternalStore(subscribe, () => state)
}

const active = (cars: Car[]) => cars.filter(c => c.status !== 'HIDDEN')

// Active cars, for the public pages.
export function useCars() {
  return active(useStore().cars)
}

export function useCatalogStatus() {
  return useStore().status
}

// Hidden cars are only in the store for admins, who may open their pages.
export function useCar(slug: string) {
  return useStore().cars.find(c => c.slug === slug)
}

// Every car including hidden ones (only filled for admins), for the admin pages.
export function useAllCars() {
  return useStore().cars
}

// Admin pages reload the catalogue on opening: it may have been loaded before signing in,
// without the hidden cars. True once that reload has finished.
export function useFreshCatalog() {
  const [fresh, setFresh] = useState(false)
  useEffect(() => {
    reloadCars().finally(() => setFresh(true))
  }, [])
  return fresh
}

// What the admin form sends; the server fills in id, slug and the host's rating.
export type CarInput = Omit<Car, 'id' | 'slug' | 'location' | 'host'> & { city: string; hostName: string; status: 'ACTIVE' | 'HIDDEN' }

export async function saveCar(input: CarInput, id?: number) {
  const res = id
    ? await api<{ car: Car }>(`/admin/cars/${id}`, { method: 'PUT', body: input })
    : await api<{ car: Car }>('/admin/cars', { body: input })
  await reloadCars()
  return res.car
}

export async function deleteCar(id: number) {
  await api(`/admin/cars/${id}`, { method: 'DELETE' })
  await reloadCars()
}

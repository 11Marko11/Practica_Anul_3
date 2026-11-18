import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Car } from '../data/cars'
import { api } from './api'
import { same, startLivePoll } from './livePoll'

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
    if (!(state.status === 'ready' && same(state.cars, res.cars))) set({ cars: res.cars, status: 'ready' })
  } catch {
    set({ ...state, status: state.status === 'ready' ? 'ready' : 'error' })
  }
}

// While a page shows cars, the catalogue is checked every minute (and when the tab comes back),
// so new, edited or hidden cars appear without a refresh.
let stopPoll: (() => void) | null = null

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!started) reloadCars()
  if (!stopPoll) stopPoll = startLivePoll(reloadCars, 60_000)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && stopPoll) {
      stopPoll()
      stopPoll = null
    }
  }
}

function useStore() {
  return useSyncExternalStore(subscribe, () => state)
}

// Shown by their host, with papers approved and available now (not being cleaned, in service…).
const active = (cars: Car[]) => cars.filter(c =>
  (c.status ?? 'ACTIVE') === 'ACTIVE' && (c.reviewStatus ?? 'APPROVED') === 'APPROVED' && (c.condition ?? 'READY') === 'READY')

// The cars the public sees, for the public pages (also when an admin is signed in).
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

// What the host's car form sends; the server fills in id and slug, and the car is the host's.
export type CarInput = Omit<Car, 'id' | 'slug' | 'location' | 'host' | 'status' | 'reviewStatus'> & {
  city: string
  status: 'ACTIVE' | 'HIDDEN'
  documentIds: string[] // the car's papers, uploaded first (see uploadCarDocument)
}

// Admins can't change a car's details (only its owner can), but can take it off the site or put it back.
export async function setCarStatus(id: number, status: 'ACTIVE' | 'HIDDEN') {
  await api(`/admin/cars/${id}/status`, { method: 'PATCH', body: { status } })
  await reloadCars()
}

export async function deleteCar(id: number) {
  await api(`/admin/cars/${id}`, { method: 'DELETE' })
  await reloadCars()
}

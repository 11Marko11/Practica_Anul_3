import { useEffect, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from './api'

// The cars with a heart. Guests keep them in this browser; once signed in they live in the
// account, and the guest's hearts are added to it at sign-in (then cleared from the browser).
const KEY = 'rm-favorites'
let ids: number[] = readLocal()
let signedIn = false
const listeners = new Set<() => void>()

function readLocal(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter(n => Number.isInteger(n)) : []
  } catch {
    return []
  }
}
function writeLocal(next: number[]) {
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode: kept for this visit only */ }
}
function set(next: number[]) {
  ids = next
  listeners.forEach(l => l())
}

export function toggleFavorite(carId: number) {
  const on = ids.includes(carId)
  const next = on ? ids.filter(id => id !== carId) : [carId, ...ids]
  set(next)
  if (!signedIn) return writeLocal(next)
  // Shown at once; the server's answer then confirms (or undoes) it.
  api<{ carIds: number[] }>(`/favorites/${carId}`, { method: on ? 'DELETE' : 'PUT' })
    .then(r => set(r.carIds))
    .catch(() => set(on ? [carId, ...ids] : ids.filter(id => id !== carId)))
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const useFavorites = () => useSyncExternalStore(subscribe, () => ids)
export const useIsFavorite = (carId: number) => useSyncExternalStore(subscribe, () => ids.includes(carId))

// Mounted once (in the layout): follows signing in and out.
export function useFavoritesSync() {
  const { user, loading } = useAuth()
  const userId = user?.id ?? null
  useEffect(() => {
    if (loading) return
    if (!userId) {
      signedIn = false
      set(readLocal())
      return
    }
    signedIn = true
    const guest = readLocal()
    const load = guest.length
      ? api<{ carIds: number[] }>('/favorites/merge', { body: { carIds: guest } }).then(r => { writeLocal([]); return r })
      : api<{ carIds: number[] }>('/favorites')
    load.then(r => set(r.carIds)).catch(() => {})
  }, [userId, loading])
}

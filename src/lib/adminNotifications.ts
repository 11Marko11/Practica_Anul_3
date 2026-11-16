import { useEffect, useSyncExternalStore } from 'react'
import { api } from './api'

// What waits for the admin: paid bookings to confirm, customer documents, host requests and car papers to check.
// Checked every 30 seconds and whenever the tab regains focus, while an admin has the site open.
type Counts = { bookings: number; verifications: number; hostRequests: number; carReviews: number }
let counts: Counts = { bookings: 0, verifications: 0, hostRequests: 0, carReviews: 0 }
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

export async function refreshAwaitingCount() {
  try {
    const res = await api<{ awaitingConfirmation: number; pendingVerifications: number; pendingHostApplications: number; pendingCarReviews: number }>('/admin/bookings/summary')
    counts = { bookings: res.awaitingConfirmation, verifications: res.pendingVerifications, hostRequests: res.pendingHostApplications, carReviews: res.pendingCarReviews }
  } catch {
    return // keep the last known count
  }
  listeners.forEach(l => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    refreshAwaitingCount()
    timer = setInterval(() => { if (document.visibilityState === 'visible') refreshAwaitingCount() }, 30_000)
    window.addEventListener('focus', refreshAwaitingCount)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
      window.removeEventListener('focus', refreshAwaitingCount)
    }
  }
}

const noSubscribe = () => () => {}

const NONE: Counts = { bookings: 0, verifications: 0, hostRequests: 0, carReviews: 0 }

// Both counts (zero for everyone who is not an admin).
export function useAdminCounts(isAdmin: boolean): Counts {
  return useSyncExternalStore(isAdmin ? subscribe : noSubscribe, () => (isAdmin ? counts : NONE))
}

// Everything waiting for the admin, for the account menu badge and the browser tab title.
export function useAwaitingCount(isAdmin: boolean) {
  const c = useAdminCounts(isAdmin)
  // Paid bookings are answered by the hosts now, so they don't count as the admin's work.
  const value = c.verifications + c.hostRequests + c.carReviews
  // Show the count in the browser tab too, e.g. "(2) Rent Motors".
  useEffect(() => {
    if (!isAdmin) return
    const base = document.title.replace(/^\(\d+\) /, '')
    document.title = value > 0 ? `(${value}) ${base}` : base
  }, [isAdmin, value])
  return value
}

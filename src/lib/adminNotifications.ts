import { useEffect, useSyncExternalStore } from 'react'
import { api } from './api'

// How many paid bookings wait for the admin's confirmation. Checked every minute and
// whenever the tab regains focus, while an admin has the site open.
let count = 0
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

export async function refreshAwaitingCount() {
  try {
    const res = await api<{ awaitingConfirmation: number }>('/admin/bookings/summary')
    count = res.awaitingConfirmation
  } catch {
    return // keep the last known count
  }
  listeners.forEach(l => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    refreshAwaitingCount()
    timer = setInterval(refreshAwaitingCount, 60_000)
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

// 0 for everyone who is not an admin.
export function useAwaitingCount(isAdmin: boolean) {
  const value = useSyncExternalStore(isAdmin ? subscribe : noSubscribe, () => (isAdmin ? count : 0))
  // Show the count in the browser tab too, e.g. "(2) Rent Motors".
  useEffect(() => {
    if (!isAdmin) return
    const base = document.title.replace(/^\(\d+\) /, '')
    document.title = value > 0 ? `(${value}) ${base}` : base
  }, [isAdmin, value])
  return value
}

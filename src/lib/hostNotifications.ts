import { useSyncExternalStore } from 'react'
import { api } from './api'
import { startLivePoll } from './livePoll'

// How many paid bookings wait for the signed-in host's answer, for the menu badge. Checked every
// 30 seconds (and when the tab comes back) while a host has the site open.
let count = 0
const listeners = new Set<() => void>()
let stop: (() => void) | null = null

export async function refreshHostAwaiting() {
  try {
    count = (await api<{ awaiting: number }>('/host/summary')).awaiting
  } catch {
    return // keep the last known count
  }
  listeners.forEach(l => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!stop) {
    refreshHostAwaiting()
    stop = startLivePoll(refreshHostAwaiting, 30_000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && stop) {
      stop()
      stop = null
    }
  }
}

const noSubscribe = () => () => {}

export function useHostAwaiting(isHost: boolean) {
  return useSyncExternalStore(isHost ? subscribe : noSubscribe, () => (isHost ? count : 0))
}

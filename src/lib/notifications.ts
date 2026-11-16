import { useSyncExternalStore } from 'react'
import { api } from './api'
import { startLivePoll } from './livePoll'

export type Notification = { id: string; type: string; data: Record<string, unknown>; link: string | null; read: boolean; createdAt: string }

export const getNotifications = () => api<{ unread: number; notifications: Notification[] }>('/notifications')
export const markRead = (ids?: string[]) => api('/notifications/read', { body: ids ? { ids } : {} })

// Unread notifications, for the bell: checked every 30 seconds (and when the tab comes back)
// while someone is signed in.
let unread = 0
const listeners = new Set<() => void>()
let stop: (() => void) | null = null

export async function refreshUnread() {
  try {
    unread = (await api<{ unread: number }>('/notifications/unread')).unread
  } catch {
    return
  }
  listeners.forEach(l => l())
}

export function setUnread(n: number) {
  unread = n
  listeners.forEach(l => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!stop) {
    refreshUnread()
    stop = startLivePoll(refreshUnread, 30_000)
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

export function useUnreadNotifications(signedIn: boolean) {
  return useSyncExternalStore(signedIn ? subscribe : noSubscribe, () => (signedIn ? unread : 0))
}

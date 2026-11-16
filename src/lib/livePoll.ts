import { useEffect, useRef } from 'react'

// Runs `check` every `ms` while the tab is in front, and right away when the tab comes back to
// the front or the window gets focus, so open pages show changes without a refresh.
// Returns a function that stops it.
export function startLivePoll(check: () => void, ms: number) {
  const tick = () => { if (document.visibilityState === 'visible') check() }
  const timer = setInterval(tick, ms)
  document.addEventListener('visibilitychange', tick)
  window.addEventListener('focus', tick)
  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', tick)
    window.removeEventListener('focus', tick)
  }
}

// The same as a hook; `enabled` false pauses it.
export function useLivePoll(check: () => void, ms: number, enabled = true) {
  const latest = useRef(check)
  latest.current = check
  useEffect(() => {
    if (!enabled) return
    return startLivePoll(() => latest.current(), ms)
  }, [ms, enabled])
}

// Keeps the previous value when nothing changed, so pages don't redraw for nothing.
export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

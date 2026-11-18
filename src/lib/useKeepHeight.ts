import { useLayoutEffect, useRef, useState } from 'react'

// Keeps an area of the page from getting shorter while its list is filtered, so typing in a search
// field doesn't make the page jump up when fewer results are left. It may grow; it shrinks back
// only when `reset` changes (e.g. another tab).
export function useKeepHeight<T extends HTMLElement>(reset?: unknown) {
  const ref = useRef<T>(null)
  const [minHeight, setMinHeight] = useState(0)
  const [lastReset, setLastReset] = useState(reset)
  if (reset !== lastReset) {
    setLastReset(reset)
    setMinHeight(0)
  }
  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight ?? 0
    if (height > minHeight) setMinHeight(height)
  })
  return { ref, minHeight }
}

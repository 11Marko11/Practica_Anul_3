import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'

// A new page opens at the top; Back and Forward return to where the user was on that page,
// with no flash of its top first. Positions are kept per history entry.
export function useScrollMemory() {
  const location = useLocation()
  const navigation = useNavigationType()
  const positions = useRef(new Map<string, number>())
  const lastPath = useRef(location.pathname)

  // The browser's own restoring runs before the page has rendered; we do it ourselves.
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  }, [])

  // Remember where each history entry is scrolled to. The entry is read from a ref switched just
  // before the new page scrolls, so a late scroll event of the change itself (the new page is
  // shorter, or goes to the top) never overwrites the position of the page being left.
  const current = useRef(location.key)
  useEffect(() => {
    const save = () => positions.current.set(current.current, window.scrollY)
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [])

  // Before the new page is painted: back to the saved spot, or to the top of a new page.
  useLayoutEffect(() => {
    current.current = location.key
    const pathChanged = lastPath.current !== location.pathname
    lastPath.current = location.pathname
    const saved = navigation === 'POP' ? positions.current.get(location.key) : undefined
    if (saved === undefined) {
      if (pathChanged) window.scrollTo(0, 0)
      return
    }
    window.scrollTo(0, saved)
    // Parts of the page (reviews, lists) may still be loading: try again for a few seconds until the
    // page is tall enough, unless the user scrolls meanwhile.
    let frame = 0
    const started = performance.now()
    const retry = () => {
      if (Math.abs(window.scrollY - saved) < 2 || performance.now() - started > 4000) return
      window.scrollTo(0, saved)
      frame = requestAnimationFrame(retry)
    }
    frame = requestAnimationFrame(retry)
    const stop = () => cancelAnimationFrame(frame)
    window.addEventListener('wheel', stop, { once: true, passive: true })
    window.addEventListener('touchstart', stop, { once: true, passive: true })
    return () => {
      stop()
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
    }
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps
}

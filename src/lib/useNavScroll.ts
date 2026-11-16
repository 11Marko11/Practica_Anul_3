import { useEffect, useRef, useState } from 'react'

export const NAV_HEIGHT = 52

// Hide the nav while scrolling down, bring it back as soon as the user scrolls up.
export function useNavScroll() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastY.current
      setScrolled(y > 20)
      if (y <= NAV_HEIGHT) setHidden(false)
      else if (delta > 4) setHidden(true)
      else if (delta < -4) setHidden(false)
      if (Math.abs(delta) > 4 || y <= NAV_HEIGHT) lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return { scrolled, hidden }
}

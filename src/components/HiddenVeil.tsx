import { useEffect, useState } from 'react'

// Darkens a hidden car's photo and details and writes "Ascunsă" across them; the row's buttons
// stay outside it. It slides in from the right when the car is hidden and slides back out to the
// right when the car is shown again.
export function HiddenVeil({ show, label, className }: { show: boolean; label: string; className?: string }) {
  const [mounted, setMounted] = useState(show)
  useEffect(() => {
    if (show) setMounted(true)
  }, [show])
  if (!mounted) return null
  return (
    <div
      className={`car-row__veil${className ? ` ${className}` : ''}${show ? '' : ' car-row__veil--leaving'}`}
      aria-hidden="true"
      onAnimationEnd={(e) => { if (!show && e.target === e.currentTarget) setMounted(false) }}
    >
      <span>{label}</span>
    </div>
  )
}

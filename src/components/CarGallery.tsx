import { useEffect, useRef, useState } from 'react'
import { carImage, type Car } from '../data/cars'

// Photo gallery for the car details page: large photo with arrows,
// thumbnails, keyboard (← →) and swipe navigation.
export function CarGallery({ car }: { car: Car }) {
  const [index, setIndex] = useState(0)
  const count = car.photos.length
  const touchX = useRef<number | null>(null)
  const name = `${car.year} ${car.brand} ${car.model}`

  const go = (step: number) => setIndex(i => (i + step + count) % count)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count])

  return (
    <div>
      <div
        onTouchStart={e => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={e => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
        style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', aspectRatio: '16/10', background: '#e8e8ed' }}
      >
        {car.photos.map((_, i) => (
          <img
            key={i}
            src={carImage(car, 1400, 875, i)}
            alt={`${name}, photo ${i + 1} of ${count}`}
            aria-hidden={i !== index}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: i === index ? 1 : 0, transition: 'opacity 0.35s ease' }}
          />
        ))}

        <ArrowButton side="left" label="Previous photo" onClick={() => go(-1)} />
        <ArrowButton side="right" label="Next photo" onClick={() => go(1)} />

        <span style={{ position: 'absolute', right: 14, bottom: 14, fontSize: 12, fontWeight: 500, color: '#fff', background: 'rgba(28,28,30,0.7)', backdropFilter: 'blur(8px)', padding: '5px 11px', borderRadius: 980 }}>
          {index + 1} / {count}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 10, marginTop: 10 }}>
        {car.photos.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Show photo ${i + 1}`}
            aria-current={i === index}
            style={{ padding: 0, border: 'none', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/10', cursor: 'pointer', background: '#e8e8ed', outline: i === index ? '2px solid #1c1c1e' : 'none', outlineOffset: 2, opacity: i === index ? 1 : 0.6, transition: 'opacity 0.2s' }}
          >
            <img src={carImage(car, 320, 200, i)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
        ))}
      </div>
    </div>
  )
}

function ArrowButton({ side, label, onClick }: { side: 'left' | 'right'; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{ position: 'absolute', top: '50%', [side]: 14, transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(28,28,30,0.6)', backdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <path d={side === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

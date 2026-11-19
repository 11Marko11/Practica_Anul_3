import { useEffect, useRef, useState } from 'react'
import { carImage, type Car } from '../data/cars'
import { useI18n } from '../i18n/I18nContext'

// Photo gallery for the car details page: large photo with arrows,
// thumbnails, keyboard (← →) and swipe navigation. A click on the photo opens it full screen.
export function CarGallery({ car }: { car: Car }) {
  const [index, setIndex] = useState(0)
  const count = car.photos.length
  const touchX = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
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

  const swipe = {
    onTouchStart: (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX),
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchX.current === null) return
      const dx = e.changedTouches[0].clientX - touchX.current
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
      touchX.current = null
    },
  }

  return (
    <div>
      <div
        onClick={e => { if (!(e.target as HTMLElement).closest('button')) setOpen(true) }}
        title={t.gallery.enlarge}
        onTouchStart={e => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={e => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
        style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', aspectRatio: '16/10', background: '#e8e8ed', cursor: 'zoom-in' }}
      >
        {car.photos.map((_, i) => (
          <img
            key={i}
            src={carImage(car, 1400, 875, i)}
            alt={t.gallery.photoAlt(name, i + 1, count)}
            aria-hidden={i !== index}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: i === index ? 1 : 0, transition: 'opacity 0.35s ease' }}
          />
        ))}

        <ArrowButton side="left" label={t.gallery.previous} onClick={() => go(-1)} />
        <ArrowButton side="right" label={t.gallery.next} onClick={() => go(1)} />

        <span style={{ position: 'absolute', right: 14, bottom: 14, fontSize: 12, fontWeight: 500, color: '#fff', background: 'rgba(28,28,30,0.7)', backdropFilter: 'blur(8px)', padding: '5px 11px', borderRadius: 980 }}>
          {index + 1} / {count}
        </span>
      </div>


      {open && (
        <Lightbox onClose={() => setOpen(false)} label={t.gallery.close} swipe={swipe}>
          <img
            src={carImage(car, 2200, 1375, index)}
            alt={t.gallery.photoAlt(name, index + 1, count)}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12, display: 'block' }}
          />
          {count > 1 && <ArrowButton side="left" label={t.gallery.previous} onClick={() => go(-1)} big />}
          {count > 1 && <ArrowButton side="right" label={t.gallery.next} onClick={() => go(1)} big />}
          <span style={{ position: 'absolute', left: '50%', bottom: 20, transform: 'translateX(-50%)', fontSize: 14, fontWeight: 500, color: '#fff', background: 'rgba(28,28,30,0.7)', padding: '6px 14px', borderRadius: 980 }}>
            {index + 1} / {count}
          </span>
        </Lightbox>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 10, marginTop: 10 }}>
        {car.photos.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={t.gallery.show(i + 1)}
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

// The photo full screen, on a dark background; Esc, the ✕ or a click beside the photo closes it.
function Lightbox({ onClose, label, swipe, children }: {
  onClose: () => void
  label: string
  swipe: { onTouchStart: (e: React.TouchEvent) => void; onTouchEnd: (e: React.TouchEvent) => void }
  children: React.ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      className="lightbox"
      onClick={e => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('lightbox__stage')) dialog.current?.close() }}
      {...swipe}
    >
      <div className="lightbox__stage">{children}</div>
      <button onClick={() => dialog.current?.close()} aria-label={label} className="lightbox__close">
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden><path d="M4 4l10 10M14 4 4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
    </dialog>
  )
}

function ArrowButton({ side, label, onClick, big }: { side: 'left' | 'right'; label: string; onClick: () => void; big?: boolean }) {
  const size = big ? 52 : 40
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      aria-label={label}
      style={{ position: 'absolute', top: '50%', [side]: big ? 20 : 14, transform: 'translateY(-50%)', width: size, height: size, borderRadius: '50%', border: 'none', background: 'rgba(28,28,30,0.6)', backdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <path d={side === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

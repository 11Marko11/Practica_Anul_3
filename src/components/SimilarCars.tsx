import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { CARS, carImage, type Car } from '../data/cars'
import { fmt } from '../lib/rental'
import { useI18n } from '../i18n/I18nContext'

// "You may also like" row on the car details page: a sideways-scrolling list of
// recommended cars, ending with a card that links to the full listing.
export function SimilarCars({ cars, query }: { cars: Car[]; query: string }) {
  const { t } = useI18n()
  const row = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  function updateEdges() {
    const el = row.current
    if (!el) return
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }

  useEffect(() => {
    updateEdges()
    window.addEventListener('resize', updateEdges)
    return () => window.removeEventListener('resize', updateEdges)
  }, [])

  // Scroll by the visible width, so each click shows the next set of cards.
  function scroll(direction: 1 | -1) {
    const el = row.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' })
  }

  return (
    <section style={{ marginTop: 72 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, margin: '0 0 24px' }}>
        <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: 0 }}>
          {t.car.similar}
        </h2>
        <div className="similar-arrows" style={{ gap: 8 }}>
          <ScrollButton label={t.car.scrollPrev} disabled={edges.start} onClick={() => scroll(-1)} path="M10 3L5 8l5 5" />
          <ScrollButton label={t.car.scrollNext} disabled={edges.end} onClick={() => scroll(1)} path="M6 3l5 5-5 5" />
        </div>
      </div>

      <div ref={row} onScroll={updateEdges} className="similar-row">
        {cars.map(c => (
          <Link key={c.id} to={`/cars/${c.slug}${query}`} className="similar-card" style={{ textDecoration: 'none', borderRadius: 18, overflow: 'hidden', background: '#f5f5f7', display: 'block' }}>
            <div style={{ aspectRatio: '16/10', background: '#e8e8ed' }}>
              <img src={carImage(c, 600, 375)} alt={`${c.year} ${c.brand} ${c.model}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ padding: '16px 18px 18px' }}>
              <div style={{ fontSize: 12, color: '#6e6e73' }}>{c.brand} · {c.year}</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em', margin: '2px 0 6px' }}>{c.model}</div>
              <div style={{ fontSize: 15, color: '#1d1d1f' }}>
                {fmt(c.pricePerDay)}<span style={{ fontSize: 13, color: '#6e6e73' }}>{t.common.perDay}</span>
              </div>
            </div>
          </Link>
        ))}

        <Link
          to={`/marketplace${query}`}
          className="similar-card"
          style={{ textDecoration: 'none', borderRadius: 18, background: '#1c1c1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', minHeight: 240 }}
        >
          <span style={{ width: 52, height: 52, borderRadius: '50%', background: '#f5f5f7', color: '#1c1c1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#f5f5f7', letterSpacing: '-0.02em' }}>{t.car.browseAll}</span>
          <span style={{ fontSize: 13, color: '#a1a1a6' }}>{t.marketplace.available(CARS.length)}</span>
        </Link>
      </div>
    </section>
  )
}

function ScrollButton({ label, disabled, onClick, path }: { label: string; disabled: boolean; onClick: () => void; path: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #d2d2d7', background: '#fff', color: '#1d1d1f', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s' }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

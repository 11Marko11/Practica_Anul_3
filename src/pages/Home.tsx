import { useNavigate } from 'react-router'
import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/I18nContext'

const BRANDS = [
  { name: 'BMW', count: 24, logo: 'B' },
  { name: 'Mercedes', count: 31, logo: 'M' },
  { name: 'Audi', count: 18, logo: 'A' },
  { name: 'Porsche', count: 14, logo: 'P' },
  { name: 'Ferrari', count: 9, logo: 'F' },
  { name: 'Tesla', count: 22, logo: 'T' },
  { name: 'Lamborghini', count: 7, logo: 'L' },
  { name: 'Ford', count: 36, logo: 'F' },
]

type BrandSize = 'lg' | 'md' | 'sm'

// Bigger collections get bigger tiles, sized relative to the largest brand.
function brandSize(count: number, max: number): BrandSize {
  const share = count / max
  return share >= 0.65 ? 'lg' : share >= 0.35 ? 'md' : 'sm'
}

const MAX_BRAND_COUNT = Math.max(...BRANDS.map(b => b.count))
const BRANDS_BY_SIZE = [...BRANDS].sort((a, b) => b.count - a.count)

const STATS = [
  { value: '240+', key: 'cars' },
  { value: '8', key: 'brands' },
  { value: '4.9', key: 'rating' },
  { value: '12,000+', key: 'trips' },
] as const

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&h=900&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=1600&h=900&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1600&h=900&fit=crop&auto=format',
]

export function Home() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % HERO_IMAGES.length), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div>
      {/* Hero */}
      <section style={{ position: 'relative', height: '100vh', minHeight: 600, overflow: 'hidden', background: '#111' }}>
        {HERO_IMAGES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              opacity: slide === i ? 1 : 0,
              transition: 'opacity 1.2s ease',
            }}
          />
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)' }} />

        {/* Slide dots */}
        <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={t.home.showSlide(i + 1)}
              style={{ width: slide === i ? 24 : 8, height: 8, borderRadius: 4, border: 'none', background: slide === i ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0, transition: 'all 0.3s' }}
            />
          ))}
        </div>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20, fontWeight: 400 }}>
            {t.home.eyebrow}
          </p>
          <h1 style={{ fontSize: 'clamp(44px, 7vw, 88px)', fontWeight: 600, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1.0, margin: '0 0 24px', maxWidth: 700 }}>
            {t.home.title}
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.75)', fontWeight: 300, maxWidth: 480, lineHeight: 1.6, margin: '0 0 40px' }}>
            {t.home.subtitle}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/marketplace')}
              style={{ fontSize: 15, fontWeight: 500, padding: '14px 32px', borderRadius: 980, background: '#fff', color: '#1d1d1f', border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {t.home.findCar}
            </button>
            <button
              onClick={() => navigate('/about')}
              style={{ fontSize: 15, fontWeight: 400, padding: '14px 32px', borderRadius: 980, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {t.home.learnMore}
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: '#1c1c1e', padding: '64px 24px' }}>
        <div className="stats-grid" style={{ maxWidth: 1200, margin: '0 auto' }}>
          {STATS.map(s => (
            <div key={s.key} style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.04em', color: '#f5f5f7' }}>{s.value}</div>
              <div style={{ fontSize: 14, color: '#a1a1a6', marginTop: 4, fontWeight: 400 }}>{t.home.stats[s.key]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Brands */}
      <section style={{ padding: '88px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{t.home.brandsEyebrow}</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: 0 }}>
              {t.home.brandsTitle[0]}<br />{t.home.brandsTitle[1]}
            </h2>
            <button
              onClick={() => navigate('/marketplace')}
              style={{ fontSize: 15, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 400, padding: 0 }}
            >
              {t.home.seeAll}
            </button>
          </div>
          <div className="brand-grid">
            {BRANDS_BY_SIZE.map(brand => (
              <BrandCard
                key={brand.name}
                brand={brand}
                size={brandSize(brand.count, MAX_BRAND_COUNT)}
                onClick={() => navigate('/marketplace', { state: { brand: brand.name } })}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: '#1c1c1e', padding: '88px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#a1a1a6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{t.home.howEyebrow}</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: '0 0 56px' }}>
            {t.home.howTitle}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32 }}>
            {t.home.steps.map((item, i) => (
              <div key={i} style={{ background: '#2a2a2d', borderRadius: 18, padding: '32px 28px' }}>
                <div style={{ fontSize: 13, color: '#86868b', fontWeight: 500, marginBottom: 16, letterSpacing: '0.04em' }}>0{i + 1}</div>
                <h3 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: '#f5f5f7', margin: '0 0 12px' }}>{item.title}</h3>
                <p style={{ fontSize: 15, color: '#a1a1a6', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '88px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.035em', color: '#1d1d1f', margin: '0 0 16px', lineHeight: 1.05 }}>
            {t.home.ctaTitle}
          </h2>
          <p style={{ fontSize: 17, color: '#6e6e73', fontWeight: 300, margin: '0 0 36px', lineHeight: 1.6 }}>
            {t.home.ctaText}
          </p>
          <button
            onClick={() => navigate('/marketplace')}
            style={{ fontSize: 16, fontWeight: 500, padding: '16px 40px', borderRadius: 980, background: '#1d1d1f', color: '#fff', border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {t.home.ctaButton}
          </button>
        </div>
      </section>
    </div>
  )
}

const BRAND_TILE = {
  lg: { gridColumn: 'span 2', gridRow: 'span 2', logo: 56, logoFont: 22, name: 28, count: 15, padding: '28px 28px' },
  md: { gridColumn: 'span 2', gridRow: 'span 1', logo: 44, logoFont: 18, name: 20, count: 14, padding: '22px 24px' },
  sm: { gridColumn: 'span 1', gridRow: 'span 1', logo: 36, logoFont: 15, name: 16, count: 13, padding: '20px 20px' },
}

function BrandCard({ brand, size, onClick }: { brand: typeof BRANDS[0]; size: BrandSize; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  const { t } = useI18n()
  const tile = BRAND_TILE[size]
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ gridColumn: tile.gridColumn, gridRow: tile.gridRow, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', padding: tile.padding, borderRadius: size === 'lg' ? 20 : 14, background: hov ? '#e8e8ed' : '#f5f5f7', border: 'none', cursor: 'pointer', transition: 'background 0.15s', textAlign: 'left', minWidth: 0 }}
    >
      <div style={{ width: tile.logo, height: tile.logo, flexShrink: 0, borderRadius: tile.logo / 4, background: '#1d1d1f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: tile.logoFont, fontWeight: 700 }}>
        {brand.logo}
      </div>
      <div>
        <div style={{ fontSize: tile.name, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em' }}>{brand.name}</div>
        <div style={{ fontSize: tile.count, color: '#6e6e73', marginTop: 2 }}>{t.home.carsAvailable(brand.count)}</div>
      </div>
    </button>
  )
}

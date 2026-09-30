import { useNavigate } from 'react-router'
import { useState, useEffect } from 'react'

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

const STATS = [
  { value: '240+', label: 'Vehicles listed' },
  { value: '8', label: 'Premium brands' },
  { value: '4.9', label: 'Average rating' },
  { value: '1,200+', label: 'Happy buyers' },
]

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&h=900&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=1600&h=900&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1600&h=900&fit=crop&auto=format',
]

export function Home() {
  const navigate = useNavigate()
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
              style={{ width: slide === i ? 24 : 8, height: 8, borderRadius: 4, border: 'none', background: slide === i ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0, transition: 'all 0.3s' }}
            />
          ))}
        </div>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20, fontWeight: 400 }}>
            Premium Automotive Marketplace
          </p>
          <h1 style={{ fontSize: 'clamp(44px, 7vw, 88px)', fontWeight: 600, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1.0, margin: '0 0 24px', maxWidth: 700 }}>
            Drive what you love.
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.75)', fontWeight: 300, maxWidth: 480, lineHeight: 1.6, margin: '0 0 40px' }}>
            Curated selection of premium vehicles from the world's most iconic brands.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/marketplace')}
              style={{ fontSize: 15, fontWeight: 500, padding: '14px 32px', borderRadius: 980, background: '#fff', color: '#1d1d1f', border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Browse Cars
            </button>
            <button
              onClick={() => navigate('/about')}
              style={{ fontSize: 15, fontWeight: 400, padding: '14px 32px', borderRadius: 980, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: '#f5f5f7', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0 }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ textAlign: 'center', padding: '24px 16px', borderRight: i < STATS.length - 1 ? '1px solid #e0e0e5' : 'none' }}>
              <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.04em', color: '#1d1d1f' }}>{s.value}</div>
              <div style={{ fontSize: 14, color: '#6e6e73', marginTop: 4, fontWeight: 400 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Brands */}
      <section style={{ padding: '88px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Brands</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: 0 }}>
              Every great brand,<br />in one place.
            </h2>
            <button
              onClick={() => navigate('/marketplace')}
              style={{ fontSize: 15, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 400, padding: 0 }}
            >
              See all cars →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {BRANDS.map(brand => (
              <BrandCard key={brand.name} brand={brand} onClick={() => navigate('/marketplace')} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: '#f5f5f7', padding: '88px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>How it works</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '0 0 56px' }}>
            Simple. Fast. Reliable.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32 }}>
            {[
              { step: '01', title: 'Browse', desc: 'Explore hundreds of curated premium vehicles filtered by brand, price, and fuel type.' },
              { step: '02', title: 'Connect', desc: 'Get in touch directly with verified sellers. No middlemen, no hidden fees.' },
              { step: '03', title: 'Drive', desc: 'Complete the purchase and take delivery. Your dream car, delivered to your door.' },
            ].map(item => (
              <div key={item.step} style={{ background: '#fff', borderRadius: 18, padding: '32px 28px' }}>
                <div style={{ fontSize: 13, color: '#6e6e73', fontWeight: 500, marginBottom: 16, letterSpacing: '0.04em' }}>{item.step}</div>
                <h3 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f', margin: '0 0 12px' }}>{item.title}</h3>
                <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '88px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.035em', color: '#1d1d1f', margin: '0 0 16px', lineHeight: 1.05 }}>
            Ready to find your car?
          </h2>
          <p style={{ fontSize: 17, color: '#6e6e73', fontWeight: 300, margin: '0 0 36px', lineHeight: 1.6 }}>
            Join thousands of buyers who found their perfect vehicle on AutoMarkt.
          </p>
          <button
            onClick={() => navigate('/marketplace')}
            style={{ fontSize: 16, fontWeight: 500, padding: '16px 40px', borderRadius: 980, background: '#1d1d1f', color: '#fff', border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Browse Cars
          </button>
        </div>
      </section>
    </div>
  )
}

function BrandCard({ brand, onClick }: { brand: typeof BRANDS[0]; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '24px 20px', borderRadius: 14, background: hov ? '#e8e8ed' : '#f5f5f7', border: 'none', cursor: 'pointer', transition: 'background 0.15s', textAlign: 'left' }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1d1d1f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        {brand.logo}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{brand.name}</div>
      <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>{brand.count} vehicles</div>
    </button>
  )
}

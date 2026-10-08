import { useNavigate } from 'react-router'
import { useI18n } from '../i18n/I18nContext'

export function About() {
  const navigate = useNavigate()
  const { t } = useI18n()

  return (
    <div style={{ paddingTop: 52 }}>
      {/* Header */}
      <section style={{ padding: '80px 24px 72px', borderBottom: '1px solid #f0f0f0' }}>
        <div className="about-hero" style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div>
            <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 12px', letterSpacing: '0.01em' }}>{t.about.eyebrow}</p>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 600, letterSpacing: '-0.035em', color: '#1d1d1f', margin: '0 0 20px', lineHeight: 1.05 }}>
              {t.about.title[0]}<br />{t.about.title[1]}
            </h1>
            <p style={{ fontSize: 17, color: '#6e6e73', fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
              {t.about.intro}
            </p>
          </div>
          <div style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: '4/3', background: '#e8e8ed' }}>
            <img
              src="https://images.unsplash.com/photo-1493238792000-8113da705763?w=800&h=600&fit=crop&auto=format"
              alt={t.about.imageAlt}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: '80px 24px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#a1a1a6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{t.about.valuesEyebrow}</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: '0 0 48px' }}>{t.about.valuesTitle}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {t.about.values.map((v, i) => (
              <div key={i} style={{ background: '#2a2a2d', borderRadius: 18, padding: '36px 28px' }}>
                <div style={{ fontSize: 13, color: '#86868b', fontWeight: 500, marginBottom: 16 }}>0{i + 1}</div>
                <h3 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: '#f5f5f7', margin: '0 0 12px' }}>{v.title}</h3>
                <p style={{ fontSize: 15, color: '#a1a1a6', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#2a2a2d', padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#fff', margin: '0 0 16px' }}>
          {t.about.ctaTitle}
        </h2>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', fontWeight: 300, margin: '0 0 36px' }}>
          {t.about.ctaText}
        </p>
        <button
          onClick={() => navigate('/marketplace')}
          style={{ fontSize: 15, fontWeight: 500, padding: '14px 36px', borderRadius: 980, background: '#fff', color: '#1d1d1f', border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {t.about.ctaButton}
        </button>
      </section>
    </div>
  )
}

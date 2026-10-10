import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useI18n, type Lang } from '../i18n/I18nContext'
import { promoText, trackClick, usePromotions, type Placement, type Promotion } from '../lib/promotions'

// Advertising banners for one place of the site. Several banners rotate every 6 seconds
// (paused while the pointer is on them); nothing is rendered when there are none.
export function PromoBanner({ placement, style }: { placement: Placement; style?: React.CSSProperties }) {
  const promotions = usePromotions(placement)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const { t } = useI18n()
  const count = promotions.length

  useEffect(() => {
    if (count < 2 || paused) return
    const timer = setInterval(() => setIndex(i => (i + 1) % count), 6000)
    return () => clearInterval(timer)
  }, [count, paused])

  if (!count) return null
  const current = Math.min(index, count - 1)

  return (
    <section aria-roledescription="carousel" aria-label={t.promo.label} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} style={{ position: 'relative', ...style }}>
      {promotions.map((p, i) => (
        <div key={p.id} aria-hidden={i !== current} style={{ display: i === current ? 'block' : 'none' }}>
          <Slide promotion={p} />
        </div>
      ))}
      {count > 1 && (
        <div style={{ position: 'absolute', right: 18, bottom: 16, display: 'flex', gap: 6 }}>
          {promotions.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setIndex(i)}
              aria-label={t.promo.show(i + 1)}
              aria-current={i === current}
              style={{ width: i === current ? 22 : 8, height: 8, borderRadius: 4, border: 'none', padding: 0, cursor: 'pointer', background: i === current ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.3s' }}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// `preview` (admin editor) disables the link and click counting; `lang` shows another language's texts.
export function Slide({ promotion: p, preview = false, lang: previewLang }: { promotion: Pick<Promotion, 'id' | 'texts' | 'imageUrl' | 'linkUrl'>; preview?: boolean; lang?: Lang }) {
  const { lang: siteLang, t } = useI18n()
  const lang = previewLang ?? siteLang
  const title = promoText(p, lang, 'title')
  const text = promoText(p, lang, 'text')
  const button = promoText(p, lang, 'button')
  const external = !!p.linkUrl && /^https?:\/\//.test(p.linkUrl)
  const buttonStyle: React.CSSProperties = { display: 'inline-block', marginTop: 18, fontSize: 15, fontWeight: 500, padding: '12px 26px', borderRadius: 980, background: '#fff', color: '#1d1d1f', textDecoration: 'none' }
  const onClick = () => !preview && trackClick(p.id)

  return (
    <div className="promo-slide" style={{ backgroundImage: p.imageUrl ? `url("${p.imageUrl}")` : undefined }}>
      <div className="promo-shade" />
      <div style={{ position: 'relative', maxWidth: 560 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', margin: '0 0 8px' }}>{t.promo.tag}</p>
        <h2 style={{ fontSize: 'clamp(24px, 3.4vw, 36px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#fff', margin: 0, lineHeight: 1.1 }}>{title}</h2>
        {text && <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', margin: '10px 0 0', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{text}</p>}
        {p.linkUrl && button && (
          preview ? (
            <span style={buttonStyle}>{button}</span>
          ) : external ? (
            <a href={p.linkUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={onClick} style={buttonStyle}>{button} ↗</a>
          ) : (
            <Link to={p.linkUrl} onClick={onClick} style={buttonStyle}>{button}</Link>
          )
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { useSiteContent } from '../lib/siteContent'

type Prefill = { subject?: string; message?: string } | null

export function Contact() {
  const location = useLocation()
  const prefill = location.state as Prefill
  const { user } = useAuth()
  const { lang, t } = useI18n()
  const { content, ready } = useSiteContent('contact')
  const c = content[lang]
  const empty = { name: user?.name ?? '', email: user?.email ?? '', subject: 'booking', message: '' }
  const [form, setForm] = useState({ ...empty, ...prefill })
  const [sent, setSent] = useState(false)

  // Re-apply the prefill when arriving from another "Book Now" / "List Your Car" link while already on this page.
  useEffect(() => {
    if (prefill) {
      setForm({ ...empty, ...prefill })
      setSent(false)
    }
  }, [location.key])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    fontSize: 15,
    border: '1px solid #d2d2d7',
    borderRadius: 12,
    background: '#fff',
    color: '#1d1d1f',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{ paddingTop: 52, opacity: ready ? 1 : 0, transition: 'opacity 0.25s' }}>
      {/* Header */}
      <section style={{ padding: '80px 24px 56px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 12px' }}>{c.eyebrow}</p>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 600, letterSpacing: '-0.035em', color: '#1d1d1f', margin: 0, lineHeight: 1.05 }}>
            {c.title}
          </h1>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: '64px 24px 96px' }}>
        <div className="contact-grid" style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* Left info */}
          <div style={{ background: '#1c1c1e', borderRadius: 24, padding: '40px 32px' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f7', margin: '0 0 16px' }}>{c.helpTitle}</h2>
            <p style={{ fontSize: 15, color: '#a1a1a6', lineHeight: 1.7, fontWeight: 300, margin: '0 0 40px', whiteSpace: 'pre-line' }}>
              {c.helpText}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {[
                { label: t.contact.info.email, value: content.email, href: `mailto:${content.email}` },
                { label: t.contact.info.phone, value: content.phone, href: `tel:${content.phone.replace(/[^+\d]/g, '')}` },
                { label: t.contact.info.hours, value: c.hours },
                { label: t.contact.info.address, value: c.address, href: `https://www.openstreetmap.org/search?query=${encodeURIComponent(c.address)}` },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 12, color: '#86868b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500 }}>{item.label}</div>
                  {item.href ? (
                    <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" style={{ fontSize: 15, color: '#f5f5f7', fontWeight: 400, textDecoration: 'none' }}>{item.value}</a>
                  ) : (
                    <div style={{ fontSize: 15, color: '#f5f5f7', fontWeight: 400, whiteSpace: 'pre-line' }}>{item.value}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div>
            {sent ? (
              <div style={{ background: '#f5f5f7', borderRadius: 20, padding: '56px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
                <h3 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f', margin: '0 0 10px' }}>{t.contact.sentTitle}</h3>
                <p style={{ fontSize: 15, color: '#6e6e73', fontWeight: 300 }}>{t.contact.sentText}</p>
                <button
                  onClick={() => { setSent(false); setForm(empty) }}
                  style={{ marginTop: 24, fontSize: 14, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {t.contact.sendAnother}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row">
                  <div>
                    <label style={{ fontSize: 13, color: '#6e6e73', display: 'block', marginBottom: 6, fontWeight: 400 }}>{t.contact.name}</label>
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ion Popescu"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#1d1d1f')}
                      onBlur={e => (e.target.style.borderColor = '#d2d2d7')}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#6e6e73', display: 'block', marginBottom: 6, fontWeight: 400 }}>{t.contact.email}</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="ion@example.com"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#1d1d1f')}
                      onBlur={e => (e.target.style.borderColor = '#d2d2d7')}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, color: '#6e6e73', display: 'block', marginBottom: 6 }}>{t.contact.interestedIn}</label>
                  <select
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
                  >
                    {Object.entries(t.contact.subjects).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 13, color: '#6e6e73', display: 'block', marginBottom: 6 }}>{t.contact.message}</label>
                  <textarea
                    required
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder={t.contact.messagePlaceholder}
                    rows={5}
                    style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                    onFocus={e => (e.target.style.borderColor = '#1d1d1f')}
                    onBlur={e => (e.target.style.borderColor = '#d2d2d7')}
                  />
                </div>

                <button
                  type="submit"
                  style={{ marginTop: 4, padding: '14px 32px', fontSize: 15, fontWeight: 500, background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 980, cursor: 'pointer', alignSelf: 'flex-start', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  {t.contact.send}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router'

type Prefill = { subject?: string; message?: string } | null

export function Contact() {
  const location = useLocation()
  const prefill = location.state as Prefill
  const empty = { name: '', email: '', subject: 'booking', message: '' }
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
    <div style={{ paddingTop: 52 }}>
      {/* Header */}
      <section style={{ padding: '80px 24px 56px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 12px' }}>Contact</p>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 600, letterSpacing: '-0.035em', color: '#1d1d1f', margin: 0, lineHeight: 1.05 }}>
            Get in touch.
          </h1>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: '64px 24px 96px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 80, alignItems: 'start' }}>

          {/* Left info */}
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: '0 0 16px' }}>We're here to help.</h2>
            <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.7, fontWeight: 300, margin: '0 0 48px' }}>
              Whether you're booking a car, listing your own, or have a question about a reservation — our team typically responds within a few hours.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {[
                { label: 'Email', value: 'hello@rentmotors.com' },
                { label: 'Phone', value: '+1 (415) 555 0192' },
                { label: 'Hours', value: 'Mon–Fri, 9am – 6pm CET' },
                { label: 'Address', value: '14 Rue de Rivoli, Paris, France' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 12, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500 }}>{item.label}</div>
                  <div style={{ fontSize: 15, color: '#1d1d1f', fontWeight: 400 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div>
            {sent ? (
              <div style={{ background: '#f5f5f7', borderRadius: 20, padding: '56px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
                <h3 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f', margin: '0 0 10px' }}>Message sent!</h3>
                <p style={{ fontSize: 15, color: '#6e6e73', fontWeight: 300 }}>We'll confirm your request within 24 hours.</p>
                <button
                  onClick={() => { setSent(false); setForm(empty) }}
                  style={{ marginTop: 24, fontSize: 14, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, color: '#6e6e73', display: 'block', marginBottom: 6, fontWeight: 400 }}>Name</label>
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Elena Rossi"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#1d1d1f')}
                      onBlur={e => (e.target.style.borderColor = '#d2d2d7')}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#6e6e73', display: 'block', marginBottom: 6, fontWeight: 400 }}>Email</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="elena@example.com"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#1d1d1f')}
                      onBlur={e => (e.target.style.borderColor = '#d2d2d7')}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, color: '#6e6e73', display: 'block', marginBottom: 6 }}>I'm interested in</label>
                  <select
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
                  >
                    <option value="booking">Booking a car</option>
                    <option value="reservation">An existing reservation</option>
                    <option value="hosting">Listing my car for rent</option>
                    <option value="partnership">Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 13, color: '#6e6e73', display: 'block', marginBottom: 6 }}>Message</label>
                  <textarea
                    required
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us about your trip: dates, car and pick-up location..."
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
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

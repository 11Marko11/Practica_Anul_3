import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

export function Login() {
  const { signIn, signUp } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const requested = (location.state as { from?: string } | null)?.from
  const from = requested && requested !== '/login' ? requested : '/'

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState<keyof typeof t.login.errors | null>(null)
  const [busy, setBusy] = useState(false)
  const [slow, setSlow] = useState(false)

  // The free server sleeps when idle and can take up to a minute to answer the first request.
  useEffect(() => {
    if (!busy) return setSlow(false)
    const timer = setTimeout(() => setSlow(true), 4000)
    return () => clearTimeout(timer)
  }, [busy])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signin') await signIn(form.email, form.password)
      else await signUp(form.name, form.email, form.password)
      navigate(from, { replace: true })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : ''
      setError(code in t.login.errors ? (code as keyof typeof t.login.errors) : 'unknown')
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next: 'signin' | 'signup') {
    setMode(next)
    setError(null)
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
  const labelStyle = { fontSize: 13, color: '#6e6e73', display: 'block', marginBottom: 6 }
  const focus = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = '#1d1d1f'),
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = '#d2d2d7'),
  }

  return (
    <div style={{ paddingTop: 52, minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c1c1e' }}>
      <section style={{ width: '100%', maxWidth: 420, margin: '64px 24px', background: '#fff', borderRadius: 24, padding: '40px 32px', boxShadow: '0 12px 40px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '0 0 8px' }}>
          {mode === 'signin' ? t.login.welcome : t.login.create}
        </h1>
        <p style={{ fontSize: 15, color: '#6e6e73', fontWeight: 300, margin: '0 0 28px', lineHeight: 1.6 }}>
          {mode === 'signin' ? t.login.signInText : t.login.signUpText}
        </p>

        <div style={{ display: 'flex', background: '#f5f5f7', borderRadius: 980, padding: 4, marginBottom: 24 }}>
          {([['signin', t.login.signInTab], ['signup', t.login.signUpTab]] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => switchMode(value)}
              style={{ flex: 1, fontSize: 14, fontWeight: 500, padding: '8px 0', borderRadius: 980, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: mode === value ? '#fff' : 'transparent', color: mode === value ? '#1d1d1f' : '#6e6e73', boxShadow: mode === value ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" style={labelStyle}>{t.login.fullName}</label>
              <input id="name" required minLength={2} autoComplete="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Elena Rossi" style={inputStyle} {...focus} />
            </div>
          )}
          <div>
            <label htmlFor="email" style={labelStyle}>{t.login.email}</label>
            <input id="email" required type="email" autoComplete="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="elena@example.com" style={inputStyle} {...focus} />
          </div>
          <div>
            <label htmlFor="password" style={labelStyle}>{t.login.password}</label>
            <input
              id="password"
              required
              type="password"
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={mode === 'signup' ? t.login.passwordHint : ''}
              style={inputStyle}
              {...focus}
            />
          </div>

          {error && <p role="alert" style={{ fontSize: 14, color: '#d70015', margin: 0 }}>{t.login.errors[error]}</p>}
          {slow && <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>{t.login.slow}</p>}

          <button
            type="submit"
            disabled={busy}
            style={{ marginTop: 4, padding: '14px 0', fontSize: 15, fontWeight: 500, background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 980, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, transition: 'opacity 0.15s' }}
          >
            {mode === 'signin' ? t.login.signIn : t.login.createAccount}
          </button>
        </form>

        <p style={{ fontSize: 14, color: '#6e6e73', textAlign: 'center', margin: '24px 0 0' }}>
          {mode === 'signin' ? t.login.noAccount : t.login.haveAccount}
          <button type="button" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} style={{ fontSize: 14, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {mode === 'signin' ? t.login.signUpLink : t.login.signInLink}
          </button>
        </p>
      </section>
    </div>
  )
}

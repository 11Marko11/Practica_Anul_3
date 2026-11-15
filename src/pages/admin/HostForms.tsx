import { useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import { ApiError } from '../../lib/api'
import type { AccountInput, AdminHost, HostInput } from '../../lib/hosts'

// Name and phone of a host, for adding a new one (with the email and password of their
// account) or editing one.
export function HostEditor({ host, withAccount = false, onSave, onCancel }: {
  host?: AdminHost
  withAccount?: boolean
  onSave: (input: HostInput & AccountInput) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useI18n()
  const h = t.adminHosts
  const [name, setName] = useState(host?.name ?? '')
  const [phone, setPhone] = useState(host?.phone ?? '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ready = name.trim() && (!withAccount || (email.trim() && password.length >= 8))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    try {
      await onSave({ name: name.trim(), phone: phone.trim() || undefined, email: email.trim(), ...(withAccount ? { password } : {}) })
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'email-taken' ? h.emailTaken : h.error)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <label style={field}>
        {h.name}
        <input value={name} onChange={e => setName(e.target.value)} autoFocus required maxLength={80} style={{ ...control, borderRadius: 10 }} />
      </label>
      <label style={field}>
        {h.phone}
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} placeholder="+373…" style={{ ...control, borderRadius: 10 }} />
      </label>
      {withAccount && <AccountFields email={email} password={password} onEmail={setEmail} onPassword={setPassword} passwordLabel={h.password} />}
      <button type="submit" disabled={busy || !ready} style={{ fontSize: 14, fontWeight: 500, padding: '10px 20px', borderRadius: 980, background: '#1d1d1f', color: '#fff', border: 'none', cursor: 'pointer', opacity: busy || !ready ? 0.5 : 1 }}>
        {h.save}
      </button>
      <button type="button" onClick={onCancel} className="btn-action btn-action--neutral" style={{ height: 38 }}>{h.cancel}</button>
      {error && <p style={{ flexBasis: '100%', fontSize: 13, color: '#d70015', margin: 0 }}>{error}</p>}
    </form>
  )
}

// Email and password of a host's account. Without an account yet, a password is required.
export function AccountEditor({ host, onSave, onCancel }: { host: AdminHost; onSave: (input: AccountInput) => Promise<void>; onCancel: () => void }) {
  const { t } = useI18n()
  const h = t.adminHosts
  const [email, setEmail] = useState(host.account?.email ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const needsPassword = !host.account
  const ready = email.trim() && (password ? password.length >= 8 : !needsPassword)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    try {
      await onSave({ email: email.trim(), ...(password ? { password } : {}) })
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'email-taken' ? h.emailTaken : h.error)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <p style={{ flexBasis: '100%', fontSize: 15, fontWeight: 600, color: '#1d1d1f', margin: 0 }}>{h.accountEdit}: {host.name}</p>
      <AccountFields email={email} password={password} onEmail={setEmail} onPassword={setPassword} passwordLabel={needsPassword ? h.password : h.newPassword} />
      <button type="submit" disabled={busy || !ready} style={{ fontSize: 14, fontWeight: 500, padding: '10px 20px', borderRadius: 980, background: '#1d1d1f', color: '#fff', border: 'none', cursor: 'pointer', opacity: busy || !ready ? 0.5 : 1 }}>
        {h.save}
      </button>
      <button type="button" onClick={onCancel} className="btn-action btn-action--neutral" style={{ height: 38 }}>{h.cancel}</button>
      {error && <p style={{ flexBasis: '100%', fontSize: 13, color: '#d70015', margin: 0 }}>{error}</p>}
    </form>
  )
}

export function AccountFields({ email, password, onEmail, onPassword, passwordLabel }: {
  email: string
  password: string
  onEmail: (v: string) => void
  onPassword: (v: string) => void
  passwordLabel: string
}) {
  const { t } = useI18n()
  const h = t.adminHosts
  return (
    <>
      <label style={field}>
        {h.email}
        <input type="email" value={email} onChange={e => onEmail(e.target.value)} required maxLength={254} autoComplete="off" style={{ ...control, borderRadius: 10 }} />
      </label>
      <label style={field}>
        {passwordLabel}
        <input type="text" value={password} onChange={e => onPassword(e.target.value)} minLength={8} maxLength={200} autoComplete="new-password" style={{ ...control, borderRadius: 10 }} />
        <span style={{ fontSize: 11, color: '#86868b' }}>{h.passwordHint}</span>
      </label>
    </>
  )
}

export const control: React.CSSProperties = { fontSize: 14, padding: '9px 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none' }
export const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73', flex: '1 1 200px' }

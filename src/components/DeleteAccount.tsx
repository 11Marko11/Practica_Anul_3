import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { api, ApiError } from '../lib/api'

// "Your account" section on My bookings: the customer deletes their account, confirming
// with their password. The server refuses while bookings are still in progress.
export function DeleteAccount() {
  const { t } = useI18n()
  const a = t.account
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) dialog.current?.showModal()
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/account', { method: 'DELETE', body: { password } })
      await signOut()
      alert(a.deleted)
      navigate('/', { replace: true })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown'
      setError(code in a.errors ? a.errors[code as keyof typeof a.errors] : a.errors.unknown)
      setBusy(false)
    }
  }

  return (
    <section style={{ marginTop: 72, paddingTop: 28, borderTop: '1px solid #f0f0f0' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: '0 0 6px' }}>{a.sectionTitle}</h2>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '16px 18px', border: '1px solid #f3d0d0', borderRadius: 16, marginTop: 12 }}>
        <div style={{ flex: '1 1 280px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{a.deleteTitle}</div>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: '4px 0 0', lineHeight: 1.5 }}>{a.deleteText}</p>
        </div>
        <button onClick={() => setOpen(true)} style={{ fontSize: 14, fontWeight: 500, padding: '10px 18px', borderRadius: 980, border: '1px solid #f0c4c4', background: '#fff', color: '#d70015', cursor: 'pointer' }}>
          {a.deleteButton}
        </button>
      </div>

      {open && (
        // margin: auto centres the dialog (the site's CSS reset sets every margin to 0).
        <dialog ref={dialog} onClose={() => { setOpen(false); setPassword(''); setError('') }} style={{ margin: 'auto', width: 'min(440px, calc(100vw - 32px))', border: 'none', borderRadius: 20, padding: 0, boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
          <form onSubmit={submit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: 0 }}>{a.deleteConfirmTitle}</h2>
            <p style={{ fontSize: 14, color: '#424245', margin: 0, lineHeight: 1.5 }}>{a.deleteConfirmText}</p>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73' }}>
              {a.password}
              <input type="password" required autoComplete="current-password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} autoFocus style={{ fontSize: 15, padding: '10px 12px', border: '1px solid #d2d2d7', borderRadius: 12, fontFamily: 'inherit' }} />
            </label>
            {error && <p role="alert" style={{ fontSize: 13, color: '#d70015', margin: 0, lineHeight: 1.5 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => dialog.current?.close()} style={{ fontSize: 14, fontWeight: 500, padding: '11px 20px', borderRadius: 980, border: 'none', background: '#f5f5f7', color: '#1d1d1f', cursor: 'pointer' }}>{a.cancel}</button>
              <button type="submit" disabled={busy} style={{ fontSize: 14, fontWeight: 500, padding: '11px 20px', borderRadius: 980, border: 'none', background: '#d70015', color: '#fff', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? a.deleting : a.confirmDelete}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </section>
  )
}

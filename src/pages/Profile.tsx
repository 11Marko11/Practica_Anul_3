import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth, type VerificationStatus } from '../auth/AuthContext'
import { DeleteAccount } from '../components/DeleteAccount'
import { useI18n } from '../i18n/I18nContext'
import { ApiError } from '../lib/api'
import { formatPhone } from '../lib/phone'
import {
  changePassword,
  documentUrl,
  DOCUMENT_TYPES,
  getProfile,
  hasRequiredDocuments,
  removeDocument,
  submitVerification,
  updateProfile,
  uploadDocument,
  type DocumentType,
  type IdentityDocument,
  type Profile as ProfileData,
} from '../lib/profile'

export const VERIFICATION_COLORS: Record<VerificationStatus, { bg: string; fg: string }> = {
  UNVERIFIED: { bg: '#f2f2f4', fg: '#6e6e73' },
  PENDING: { bg: '#fff4e0', fg: '#9a5b00' },
  VERIFIED: { bg: '#e3f6e8', fg: '#1b7a35' },
  REJECTED: { bg: '#fdeaea', fg: '#b3261e' },
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const { t } = useI18n()
  const c = VERIFICATION_COLORS[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 980, whiteSpace: 'nowrap', background: c.bg, color: c.fg }}>
      {status === 'VERIFIED' && '✓ '}
      {t.profile.status[status]}
    </span>
  )
}

// /profile: personal details, identity documents and verification, password, account deletion.
export function Profile() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div style={{ minHeight: '80vh' }} />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <ProfileContent />
}

type ErrorKey = keyof ReturnType<typeof useI18n>['t']['profile']['errors']

function ProfileContent() {
  const { user, refreshUser } = useAuth()
  const { lang, t } = useI18n()
  const p = t.profile
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [documents, setDocuments] = useState<IdentityDocument[]>([])

  function apply(res: { profile: ProfileData; documents: IdentityDocument[] }) {
    setProfile(res.profile)
    setDocuments(res.documents)
    if (res.profile.verificationStatus !== user?.verificationStatus || res.profile.name !== user?.name) refreshUser()
  }

  useEffect(() => {
    getProfile().then(apply).catch(() => {})
  }, [])

  const errorText = (err: unknown) => {
    const code = err instanceof ApiError ? err.code : 'unknown'
    return code in p.errors ? p.errors[code as ErrorKey] : p.errors.unknown
  }

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '56px 24px 36px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 8px' }}>{p.eyebrow}</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{p.title}</h1>
          {profile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, color: '#f5f5f7' }}>{profile.name}</span>
              <VerificationBadge status={profile.verificationStatus} />
            </div>
          )}
        </div>
      </div>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '8px 24px 96px' }}>
        {!profile ? (
          <p style={{ fontSize: 15, color: '#6e6e73', marginTop: 32 }}>{t.bookings.loading}</p>
        ) : (
          <>
            <Verification profile={profile} documents={documents} onChange={apply} onDocuments={setDocuments} errorText={errorText} lang={lang} />
            <PersonalDetails profile={profile} onSaved={apply} errorText={errorText} />
            <PasswordForm errorText={errorText} />
            {user?.role !== 'ADMIN' && <DeleteAccount />}
          </>
        )}
      </main>
    </div>
  )
}

function Verification({ profile, documents, onChange, onDocuments, errorText, lang }: {
  profile: ProfileData
  documents: IdentityDocument[]
  onChange: (res: { profile: ProfileData; documents: IdentityDocument[] }) => void
  onDocuments: (docs: IdentityDocument[]) => void
  errorText: (err: unknown) => string
  lang: string
}) {
  const { t } = useI18n()
  const p = t.profile
  const status = profile.verificationStatus
  const locked = status === 'PENDING' || status === 'VERIFIED'
  const [type, setType] = useState<DocumentType>(documents.some(d => d.type === 'DRIVING_LICENSE') ? 'ID_CARD' : 'DRIVING_LICENSE')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState<'upload' | 'submit' | null>(null)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const colors = VERIFICATION_COLORS[status]

  async function upload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    if (file.size > 8 * 1024 * 1024) return setError(p.errors['file-too-large'])
    setBusy('upload')
    setError('')
    try {
      const doc = await uploadDocument(type, file)
      onDocuments([...documents, doc])
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
      // Uploading after verification sends the account back for review.
      if (status === 'VERIFIED') onChange(await getProfile())
    } catch (err) {
      setError(errorText(err))
    }
    setBusy(null)
  }

  async function remove(id: string) {
    if (!confirm(p.removeAsk)) return
    try {
      onChange(await removeDocument(id))
    } catch (err) {
      setError(errorText(err))
    }
  }

  async function submit() {
    setBusy('submit')
    setError('')
    try {
      onChange(await submitVerification())
    } catch (err) {
      setError(errorText(err))
    }
    setBusy(null)
  }

  return (
    <Section title={p.verification}>
      <div style={{ padding: '16px 18px', borderRadius: 16, background: colors.bg, color: colors.fg }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{status === 'VERIFIED' ? '✓ ' : ''}{p.status[status]}</div>
        <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 4, color: '#1d1d1f' }}>{p.statusText[status]}</div>
        {status === 'REJECTED' && profile.verificationNote && (
          <div style={{ fontSize: 14, marginTop: 8, color: '#1d1d1f' }}>
            <strong style={{ fontWeight: 600 }}>{p.adminNote}:</strong> {profile.verificationNote}
          </div>
        )}
      </div>
      {status !== 'VERIFIED' && <p style={{ fontSize: 14, color: '#424245', lineHeight: 1.6, margin: 0 }}>{p.verificationIntro}</p>}

      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', margin: '8px 0 0' }}>{p.documents}</h3>
      {documents.length === 0 && <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>{p.noDocuments}</p>}
      <div className="document-grid">
        {documents.map(d => (
          <div key={d.id} style={{ border: '1px solid #e5e5ea', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
            <a href={documentUrl(d.id)} target="_blank" rel="noreferrer" style={{ display: 'block', aspectRatio: '4/3', background: '#f5f5f7' }}>
              {d.mimeType.startsWith('image/') ? (
                <img src={documentUrl(d.id)} alt={p.docTypes[d.type]} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 15, fontWeight: 600, color: '#b3261e' }}>PDF</span>
              )}
            </a>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{p.docTypes[d.type]}</div>
              <div style={{ fontSize: 12, color: '#86868b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.fileName} · {fileSize(d.size)} · {new Date(d.createdAt).toLocaleDateString(lang)}
              </div>
              {!locked && (
                <button onClick={() => remove(d.id)} style={{ marginTop: 6, fontSize: 13, color: '#d70015', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  {p.remove}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {status === 'PENDING' ? (
        <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>{p.locked}</p>
      ) : (
        <form onSubmit={upload} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', padding: 16, border: '1px dashed #c7c7cc', borderRadius: 16 }}>
          <label style={{ ...labelStyle, flex: '1 1 180px' }}>
            {p.docType}
            <select value={type} onChange={e => setType(e.target.value as DocumentType)} style={inputStyle}>
              {DOCUMENT_TYPES.map(dt => <option key={dt} value={dt}>{p.docTypes[dt]}</option>)}
            </select>
          </label>
          <label style={{ ...labelStyle, flex: '2 1 260px' }}>
            {p.chooseFile}
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => { setFile(e.target.files?.[0] ?? null); setError('') }} style={{ ...inputStyle, padding: '8px 10px' }} />
          </label>
          <button type="submit" disabled={!file || busy !== null} style={{ ...buttonStyle, background: '#1d1d1f', color: '#fff', opacity: !file || busy ? 0.4 : 1 }}>
            {busy === 'upload' ? p.uploading : p.uploadButton}
          </button>
        </form>
      )}
      <p style={{ fontSize: 12, color: '#86868b', margin: 0 }}>{p.required}</p>

      {error && <p role="alert" style={{ fontSize: 14, color: '#d70015', margin: 0 }}>{error}</p>}

      {(status === 'UNVERIFIED' || status === 'REJECTED') && (
        <div>
          <button onClick={submit} disabled={!hasRequiredDocuments(documents) || busy !== null} style={{ ...buttonStyle, background: '#0071e3', color: '#fff', opacity: hasRequiredDocuments(documents) && !busy ? 1 : 0.4 }}>
            {busy === 'submit' ? p.submitting : p.submit}
          </button>
          {!hasRequiredDocuments(documents) && <p style={{ fontSize: 13, color: '#6e6e73', margin: '8px 0 0' }}>{p.missing}</p>}
        </div>
      )}
    </Section>
  )
}

function PersonalDetails({ profile, onSaved, errorText }: { profile: ProfileData; onSaved: (res: { profile: ProfileData; documents: IdentityDocument[] }) => void; errorText: (err: unknown) => string }) {
  const { t } = useI18n()
  const p = t.profile
  const [form, setForm] = useState({ name: profile.name, phone: formatPhone(profile.phone), birthDate: profile.birthDate ?? '' })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setError('')
    try {
      const res = await updateProfile(form)
      onSaved(res)
      setForm(f => ({ ...f, phone: formatPhone(res.profile.phone) }))
      setStatus('saved')
    } catch (err) {
      setError(errorText(err))
      setStatus('idle')
    }
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    setStatus('idle')
  }

  return (
    <Section title={p.personal}>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="admin-fields">
          <label style={labelStyle}>{p.name}<input required minLength={2} value={form.name} onChange={set('name')} autoComplete="name" style={inputStyle} /></label>
          <label style={labelStyle}>
            {p.email}
            <input value={profile.email} disabled style={{ ...inputStyle, background: '#f5f5f7', color: '#6e6e73' }} />
          </label>
          <label style={labelStyle}>{p.phone}<input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="+373 69 123 456" style={inputStyle} /></label>
          <label style={labelStyle}>{p.birthDate}<input type="date" value={form.birthDate} onChange={set('birthDate')} max={new Date().toISOString().slice(0, 10)} style={inputStyle} /></label>
        </div>
        <p style={{ fontSize: 12, color: '#86868b', margin: 0 }}>{p.emailHint}</p>
        {error && <p role="alert" style={{ fontSize: 14, color: '#d70015', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="submit" disabled={status === 'saving'} style={{ ...buttonStyle, background: '#1d1d1f', color: '#fff' }}>{status === 'saving' ? p.saving : p.save}</button>
          {status === 'saved' && <span role="status" style={{ fontSize: 13, color: '#1b7a35' }}>✓ {p.saved}</span>}
        </div>
      </form>
    </Section>
  )
}

function PasswordForm({ errorText }: { errorText: (err: unknown) => string }) {
  const { t } = useI18n()
  const p = t.profile
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      await changePassword(current, next)
      setCurrent('')
      setNext('')
      setMessage({ ok: true, text: p.passwordChanged })
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
    }
    setBusy(false)
  }

  return (
    <Section title={p.password}>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="admin-fields">
          <label style={labelStyle}>{p.currentPassword}<input type="password" required value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" style={inputStyle} /></label>
          <label style={labelStyle}>{p.newPassword}<input type="password" required minLength={8} value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" style={inputStyle} /></label>
        </div>
        {message && <p role={message.ok ? 'status' : 'alert'} style={{ fontSize: 14, color: message.ok ? '#1b7a35' : '#d70015', margin: 0 }}>{message.ok ? '✓ ' : ''}{message.text}</p>}
        <div><button type="submit" disabled={busy} style={{ ...buttonStyle, background: '#f5f5f7', color: '#1d1d1f' }}>{p.changePassword}</button></div>
      </form>
    </Section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f', margin: 0 }}>{title}</h2>
      {children}
    </section>
  )
}

// "240 KB" below a megabyte, "2.4 MB" above.
const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73', minWidth: 0 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', fontSize: 15, border: '1px solid #d2d2d7', borderRadius: 12, background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none' }
const buttonStyle: React.CSSProperties = { fontSize: 15, fontWeight: 500, padding: '12px 24px', borderRadius: 980, border: 'none', cursor: 'pointer' }

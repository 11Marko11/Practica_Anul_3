import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { ApiError } from '../lib/api'
import {
  getHostApplication,
  HOST_DOCUMENT_TYPES,
  hostDocumentUrl,
  removeHostDocument,
  sendHostApplication,
  uploadHostDocument,
  withdrawHostApplication,
  type HostApplication,
  type HostDocumentType,
  type PrivateDocument,
} from '../lib/privateDocuments'
import { formatDate } from '../lib/rental'
import { DocumentCards, DocumentUploadForm } from './PrivateDocuments'

type HostErrorKey = keyof ReturnType<typeof useI18n>['t']['hostApply']['errors']
type ProfileErrorKey = keyof ReturnType<typeof useI18n>['t']['profile']['errors']

// "Become a host" on the profile: extra documents and a request the admin approves or rejects.
// `identityVerified` comes from the profile so the section updates with the verification above.
export function HostApplicationSection({ identityVerified }: { identityVerified: boolean }) {
  const { t, lang } = useI18n()
  const h = t.hostApply
  const { user, refreshUser } = useAuth()
  const [application, setApplication] = useState<HostApplication | null>(null)
  const [documents, setDocuments] = useState<PrivateDocument<HostDocumentType>[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function apply(res: { application: HostApplication; documents: PrivateDocument<HostDocumentType>[] }) {
    setApplication(res.application)
    setDocuments(res.documents)
    // Approved since the page was opened: the menu needs the host link.
    if (res.application.isHost !== !!user?.host) refreshUser()
  }
  useEffect(() => {
    getHostApplication().then(apply).catch(() => {})
  }, [])

  const errorText = (err: unknown) => {
    const code = err instanceof ApiError ? err.code : 'unknown'
    if (code in h.errors) return h.errors[code as HostErrorKey]
    return code in t.profile.errors ? t.profile.errors[code as ProfileErrorKey] : t.profile.errors.unknown
  }

  async function run(action: () => Promise<{ application: HostApplication; documents: PrivateDocument<HostDocumentType>[] }>) {
    setBusy(true)
    setError('')
    try {
      apply(await action())
    } catch (err) {
      setError(errorText(err))
    }
    setBusy(false)
  }

  if (!application) return null
  const label = (type: HostDocumentType) => h.docTypes[type]

  if (application.isHost) {
    return (
      <Section title={h.title}>
        <div style={{ padding: '16px 18px', borderRadius: 16, background: '#e8f1fd', color: '#0058b8', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: '#1d1d1f', flex: '1 1 260px' }}>✓ {h.isHost}</span>
          <Link to="/host" className="btn-action btn-action--primary">{h.openPanel}</Link>
        </div>
      </Section>
    )
  }

  const status = application.status
  const pending = status === 'PENDING'
  const has = new Set(documents.map(d => d.type))
  const complete = HOST_DOCUMENT_TYPES.every(type => has.has(type))
  const canSend = identityVerified && complete && !busy

  return (
    <Section title={h.title}>
      {pending ? (
        <StatusBox bg="#fff4e0" fg="#9a5b00" title={h.pending} text={h.pendingText}>
          {application.submittedAt && <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 6 }}>{h.submittedOn(formatDate(application.submittedAt.slice(0, 10), lang))}</div>}
        </StatusBox>
      ) : status === 'REJECTED' ? (
        <StatusBox bg="#fdeaea" fg="#b3261e" title={h.rejected} text={h.rejectedText}>
          {application.note && (
            <div style={{ fontSize: 14, marginTop: 8, color: '#1d1d1f' }}>
              <strong style={{ fontWeight: 600 }}>{h.reason}:</strong> {application.note}
            </div>
          )}
        </StatusBox>
      ) : (
        <p style={{ fontSize: 14, color: '#424245', lineHeight: 1.6, margin: 0 }}>{h.intro}</p>
      )}

      <p style={{ fontSize: 14, margin: 0, color: identityVerified ? '#1b7a35' : '#9a5b00' }}>
        {identityVerified ? `✓ ${h.identityOk}` : h.needIdentity}
      </p>

      {documents.length === 0 ? (
        <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>{h.noDocuments}</p>
      ) : (
        <DocumentCards
          documents={documents}
          label={label}
          url={hostDocumentUrl}
          onRemove={pending ? undefined : id => confirm(t.profile.removeAsk) && run(() => removeHostDocument(id))}
        />
      )}

      {pending ? (
        <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>{h.locked}</p>
      ) : (
        <DocumentUploadForm
          key={documents.length} // after an upload, start again on the next missing type
          types={HOST_DOCUMENT_TYPES}
          label={label}
          initialType={HOST_DOCUMENT_TYPES.find(type => !has.has(type))}
          errorText={errorText}
          onUpload={async (type, file) => {
            const doc = await uploadHostDocument(type, file)
            setDocuments(docs => [...docs, doc])
          }}
        />
      )}
      <p style={{ fontSize: 12, color: '#86868b', margin: 0 }}>{h.required}</p>

      {pending ? (
        <div>
          <button onClick={() => confirm(h.withdrawAsk) && run(withdrawHostApplication)} disabled={busy} className="btn-action btn-action--neutral">{h.withdraw}</button>
        </div>
      ) : (
        <>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73' }}>
            {h.message}
            <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} rows={3} placeholder={h.messagePlaceholder} style={{ fontSize: 15, padding: '11px 14px', border: '1px solid #d2d2d7', borderRadius: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }} />
          </label>
          <div>
            <button onClick={() => run(() => sendHostApplication(message.trim()))} disabled={!canSend} style={{ fontSize: 15, fontWeight: 500, padding: '12px 24px', borderRadius: 980, border: 'none', cursor: 'pointer', background: '#0071e3', color: '#fff', opacity: canSend ? 1 : 0.4 }}>
              {busy ? h.sending : h.send}
            </button>
            {identityVerified && !complete && <p style={{ fontSize: 13, color: '#6e6e73', margin: '8px 0 0' }}>{h.missing}</p>}
          </div>
        </>
      )}
      {error && <p role="alert" style={{ fontSize: 14, color: '#d70015', margin: 0 }}>{error}</p>}
    </Section>
  )
}

function StatusBox({ bg, fg, title, text, children }: { bg: string; fg: string; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div style={{ padding: '16px 18px', borderRadius: 16, background: bg, color: fg }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 4, color: '#1d1d1f' }}>{text}</div>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f', margin: 0 }}>{title}</h2>
      {children}
    </section>
  )
}

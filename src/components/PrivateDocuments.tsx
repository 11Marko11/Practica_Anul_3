import { useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import type { PrivateDocument } from '../lib/privateDocuments'

const MAX_BYTES = 8 * 1024 * 1024

const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)

// Cards for private documents: a preview (image or "PDF") that opens the file, its type, name and
// date, and a remove button when `onRemove` is given.
export function DocumentCards<T extends string>({ documents, label, url, onRemove }: {
  documents: PrivateDocument<T>[]
  label: (type: T) => string
  url: (id: string) => string
  onRemove?: (id: string) => void
}) {
  const { lang, t } = useI18n()
  return (
    <div className="document-grid">
      {documents.map(d => (
        <div key={d.id} style={{ border: '1px solid #e5e5ea', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
          <a href={url(d.id)} target="_blank" rel="noreferrer" style={{ display: 'block', aspectRatio: '4/3', background: '#f5f5f7' }}>
            {d.mimeType.startsWith('image/') ? (
              <img src={url(d.id)} alt={label(d.type)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 15, fontWeight: 600, color: '#b3261e' }}>PDF</span>
            )}
          </a>
          <div style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{label(d.type)}</div>
            <div style={{ fontSize: 12, color: '#86868b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.fileName} · {fileSize(d.size)} · {new Date(d.createdAt).toLocaleDateString(lang)}
            </div>
            {onRemove && (
              <button type="button" onClick={() => onRemove(d.id)} className="btn-action btn-action--danger" style={{ marginTop: 10, height: 28, padding: '0 12px' }}>
                {t.profile.remove}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Choose a document type and a file (image or PDF, up to 8 MB), then upload it.
export function DocumentUploadForm<T extends string>({ types, label, initialType, onUpload, errorText }: {
  types: T[]
  label: (type: T) => string
  initialType?: T
  onUpload: (type: T, file: File) => Promise<void>
  errorText: (err: unknown) => string
}) {
  const { t } = useI18n()
  const p = t.profile
  const [type, setType] = useState<T>(initialType ?? types[0])
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)

  async function upload() {
    if (!file) return
    if (file.size > MAX_BYTES) return setError(p.errors['file-too-large'])
    setBusy(true)
    setError('')
    try {
      await onUpload(type, file)
      setFile(null)
      if (input.current) input.current.value = ''
    } catch (err) {
      setError(errorText(err))
    }
    setBusy(false)
  }

  // A div, not a form: it may sit inside another form (the car form).
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', padding: 16, border: '1px dashed #c7c7cc', borderRadius: 16 }}>
        <label style={{ ...labelStyle, flex: '1 1 180px' }}>
          {p.docType}
          <select value={type} onChange={e => setType(e.target.value as T)} style={inputStyle}>
            {types.map(dt => <option key={dt} value={dt}>{label(dt)}</option>)}
          </select>
        </label>
        <label style={{ ...labelStyle, flex: '2 1 260px' }}>
          {p.chooseFile}
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => { setFile(e.target.files?.[0] ?? null); setError('') }} style={{ ...inputStyle, padding: '8px 10px' }} />
        </label>
        <button type="button" onClick={upload} disabled={!file || busy} style={{ fontSize: 15, fontWeight: 500, padding: '12px 24px', borderRadius: 980, border: 'none', cursor: 'pointer', background: '#1d1d1f', color: '#fff', opacity: !file || busy ? 0.4 : 1 }}>
          {busy ? p.uploading : p.uploadButton}
        </button>
      </div>
      {error && <p role="alert" style={{ fontSize: 14, color: '#d70015', margin: 0 }}>{error}</p>}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73', minWidth: 0 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', fontSize: 15, border: '1px solid #d2d2d7', borderRadius: 12, background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none' }

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { CAR_CONDITIONS, CONDITION_COLORS, setCarCondition, type CarCondition } from '../lib/carCondition'

// The host says whether the car can be rented now; any other state takes it off the site,
// with a reason the host can write (required for "other").
export function CarConditionDialog({ car, onClose, onDone }: {
  car: { id: number; brand: string; model: string; condition: CarCondition; conditionNote: string | null }
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useI18n()
  const c = t.carCondition
  const dialog = useRef<HTMLDialogElement>(null)
  const [condition, setCondition] = useState<CarCondition>(car.condition === 'READY' ? 'CLEANING' : car.condition)
  const [note, setNote] = useState(car.conditionNote ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (condition === 'OTHER' && !note.trim()) return setError(c.noteRequired)
    setBusy(true)
    try {
      await setCarCondition(car.id, condition, condition === 'READY' ? undefined : note.trim())
      onDone()
    } catch {
      setError(c.saveError)
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={e => e.target === dialog.current && dialog.current?.close()}
      style={{ margin: 'auto', width: 'min(480px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', border: 'none', borderRadius: 20, padding: 0, boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}
    >
      <form onSubmit={submit} style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: '0 0 6px' }}>{c.title}</h2>
          <p style={{ fontSize: 14, color: '#424245', margin: 0, lineHeight: 1.5 }}>{car.brand} {car.model} · {c.intro}</p>
        </div>

        <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <legend style={{ fontSize: 13, color: '#6e6e73', padding: 0, marginBottom: 8 }}>{c.state}</legend>
          {CAR_CONDITIONS.map(k => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#1d1d1f', cursor: 'pointer', padding: '6px 10px', borderRadius: 12, background: condition === k ? '#f5f5f7' : 'transparent' }}>
              <input type="radio" name="condition" checked={condition === k} onChange={() => { setCondition(k); setError('') }} style={{ accentColor: '#1d1d1f' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: CONDITION_COLORS[k].color, flexShrink: 0 }} aria-hidden="true" />
              {c.names[k]}
              {k === 'READY' && <span style={{ fontSize: 12, color: '#86868b' }}>· {c.onSite}</span>}
            </label>
          ))}
        </fieldset>

        {condition !== 'READY' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73' }}>
            {condition === 'OTHER' ? c.noteLabelRequired : c.noteLabel}
            <textarea rows={3} maxLength={300} value={note} onChange={e => { setNote(e.target.value); setError('') }} placeholder={c.notePlaceholder} style={{ width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid #d2d2d7', borderRadius: 12, background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
          </label>
        )}
        {condition !== 'READY' && <p style={{ fontSize: 13, color: '#9a5b00', background: '#fff4e0', padding: '10px 12px', borderRadius: 12, margin: 0 }}>{c.offSiteHint}</p>}

        {error && <p role="alert" style={{ fontSize: 13, color: '#d70015', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
          <button type="button" onClick={() => dialog.current?.close()} className="btn-action btn-action--neutral" style={{ height: 40, padding: '0 20px', fontSize: 14 }}>{c.cancel}</button>
          <button type="submit" disabled={busy} className="btn-action btn-action--primary" style={{ height: 40, padding: '0 20px', fontSize: 14 }}>{busy ? c.saving : c.save}</button>
        </div>
      </form>
    </dialog>
  )
}

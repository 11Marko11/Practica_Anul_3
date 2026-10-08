import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { LANGS, useI18n, type Lang } from '../../i18n/I18nContext'
import {
  resetSiteContent,
  saveSiteContent,
  useSiteContent,
  type AboutContent,
  type AboutText,
  type ContactContent,
  type ContactText,
  type ContentKey,
} from '../../lib/siteContent'
import { AdminGuard } from './AdminGuard'
import { AdminTabs } from './AdminTabs'

// Editors for the About and Contact pages, in every language. /admin/pages?page=contact
export function AdminPages() {
  return (
    <AdminGuard>
      <AdminPagesContent />
    </AdminGuard>
  )
}

function AdminPagesContent() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const page: ContentKey = params.get('page') === 'contact' ? 'contact' : 'about'
  const [dirty, setDirty] = useState(false)

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function switchPage(next: ContentKey) {
    if (next === page || (dirty && !confirm(t.adminPages.leaveConfirm))) return
    setDirty(false)
    setParams({ page: next })
  }

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '40px 24px 28px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <AdminTabs />
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{t.adminPages.title}</h1>
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 120px' }}>
        <Segmented
          value={page}
          options={[{ value: 'about', label: t.adminPages.about }, { value: 'contact', label: t.adminPages.contact }]}
          onChange={switchPage}
        />
        {page === 'about' ? <AboutEditor key="about" onDirty={setDirty} /> : <ContactEditor key="contact" onDirty={setDirty} />}
      </main>
    </div>
  )
}

// Shared editing logic: a draft copy of the page, saved or reset as a whole.
function useDraft<K extends ContentKey>(key: K, onDirty: (dirty: boolean) => void) {
  const { content, loaded } = useSiteContent(key)
  const [draft, setDraft] = useState(content)
  const [lang, setLang] = useState<Lang>(useI18n().lang)
  const [dirty, setDirtyState] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  // Start from the saved content once it has arrived.
  useEffect(() => {
    if (loaded && !dirty) setDraft(content)
  }, [loaded])

  function markDirty(value: boolean) {
    setDirtyState(value)
    onDirty(value)
  }

  function update(change: (d: typeof draft) => typeof draft) {
    setDraft(d => change(d))
    markDirty(true)
    setStatus('idle')
  }

  async function save(validate?: () => string | null) {
    const problem = validate?.()
    if (problem) {
      setError(problem)
      return setStatus('error')
    }
    setStatus('saving')
    try {
      await saveSiteContent(key, draft)
      markDirty(false)
      setStatus('saved')
    } catch {
      setError('') // shows the general "couldn't save" message
      setStatus('error')
    }
  }

  async function reset(question: string) {
    if (!confirm(question)) return
    await resetSiteContent(key)
    markDirty(false)
    setStatus('idle')
  }

  return { draft, update, lang, setLang, dirty, status, error, save, reset, loaded, content }
}

function AboutEditor({ onDirty }: { onDirty: (dirty: boolean) => void }) {
  const { t } = useI18n()
  const d = useDraft('about', onDirty)
  const text = d.draft[d.lang]
  const setText = (change: Partial<AboutText>) => d.update(c => ({ ...c, [d.lang]: { ...c[d.lang], ...change } }) as AboutContent)
  const setValues = (values: AboutText['values']) => setText({ values })
  const f = t.adminPages.fields

  if (!d.loaded) return <Loading />

  return (
    <EditorLayout d={d} path="/about">
      <Section title={t.adminPages.sections.hero}>
        <Field label={f.imageUrl} hint={t.adminPages.shared}>
          <input value={d.draft.imageUrl} onChange={e => d.update(c => ({ ...c, imageUrl: e.target.value }))} style={input} />
        </Field>
        {d.draft.imageUrl && <img src={d.draft.imageUrl} alt="" style={{ width: 240, aspectRatio: '4/3', objectFit: 'cover', borderRadius: 12, background: '#f5f5f7' }} />}
        <Field label={f.eyebrow}><input value={text.eyebrow} onChange={e => setText({ eyebrow: e.target.value })} style={input} /></Field>
        <div className="admin-fields">
          <Field label={f.titleLine1}><input value={text.titleLine1} onChange={e => setText({ titleLine1: e.target.value })} style={input} /></Field>
          <Field label={f.titleLine2}><input value={text.titleLine2} onChange={e => setText({ titleLine2: e.target.value })} style={input} /></Field>
        </div>
        <Field label={f.intro}><textarea rows={5} value={text.intro} onChange={e => setText({ intro: e.target.value })} style={area} /></Field>
        <Field label={f.imageAlt}><input value={text.imageAlt} onChange={e => setText({ imageAlt: e.target.value })} style={input} /></Field>
      </Section>

      <Section title={t.adminPages.sections.values}>
        <div className="admin-fields">
          <Field label={f.valuesEyebrow}><input value={text.valuesEyebrow} onChange={e => setText({ valuesEyebrow: e.target.value })} style={input} /></Field>
          <Field label={f.valuesTitle}><input value={text.valuesTitle} onChange={e => setText({ valuesTitle: e.target.value })} style={input} /></Field>
        </div>
        {text.values.map((v, i) => {
          const replace = (change: Partial<typeof v>) => setValues(text.values.map((x, j) => (j === i ? { ...x, ...change } : x)))
          const move = (to: number) => {
            const next = [...text.values]
            next.splice(to, 0, next.splice(i, 1)[0])
            setValues(next)
          }
          return (
            <div key={i} style={{ border: '1px solid #e5e5ea', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 13, color: '#86868b' }}>{String(i + 1).padStart(2, '0')}</strong>
                <div style={{ display: 'flex', gap: 6 }}>
                  <SmallButton label={t.adminPages.moveUp} disabled={i === 0} onClick={() => move(i - 1)}>↑</SmallButton>
                  <SmallButton label={t.adminPages.moveDown} disabled={i === text.values.length - 1} onClick={() => move(i + 1)}>↓</SmallButton>
                  <SmallButton label={t.adminPages.removeValue} danger onClick={() => setValues(text.values.filter((_, j) => j !== i))}>{t.adminPages.removeValue}</SmallButton>
                </div>
              </div>
              <Field label={f.valueTitle}><input value={v.title} onChange={e => replace({ title: e.target.value })} style={input} /></Field>
              <Field label={f.valueDesc}><textarea rows={3} value={v.desc} onChange={e => replace({ desc: e.target.value })} style={area} /></Field>
            </div>
          )
        })}
        {text.values.length < 8 && (
          <button type="button" onClick={() => setValues([...text.values, { title: '', desc: '' }])} style={{ alignSelf: 'flex-start', fontSize: 14, color: '#0071e3', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            {t.adminPages.addValue}
          </button>
        )}
      </Section>

      <Section title={t.adminPages.sections.cta}>
        <Field label={f.ctaTitle}><input value={text.ctaTitle} onChange={e => setText({ ctaTitle: e.target.value })} style={input} /></Field>
        <Field label={f.ctaText}><textarea rows={2} value={text.ctaText} onChange={e => setText({ ctaText: e.target.value })} style={area} /></Field>
        <Field label={f.ctaButton}><input value={text.ctaButton} onChange={e => setText({ ctaButton: e.target.value })} style={input} /></Field>
      </Section>
    </EditorLayout>
  )
}

function ContactEditor({ onDirty }: { onDirty: (dirty: boolean) => void }) {
  const { t } = useI18n()
  const d = useDraft('contact', onDirty)
  const text = d.draft[d.lang]
  const setText = (change: Partial<ContactText>) => d.update(c => ({ ...c, [d.lang]: { ...c[d.lang], ...change } }) as ContactContent)
  const f = t.adminPages.fields

  if (!d.loaded) return <Loading />

  const validate = () => (d.draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.draft.email) ? t.adminPages.invalidEmail : null)

  return (
    <EditorLayout d={d} path="/contact" validate={validate}>
      <Section title={t.adminPages.sections.info}>
        <div className="admin-fields">
          <Field label={f.email} hint={t.adminPages.shared}>
            <input type="email" value={d.draft.email} onChange={e => d.update(c => ({ ...c, email: e.target.value }))} style={input} />
          </Field>
          <Field label={f.phone} hint={t.adminPages.shared}>
            <input type="tel" value={d.draft.phone} onChange={e => d.update(c => ({ ...c, phone: e.target.value }))} style={input} />
          </Field>
        </div>
        <Field label={f.hours}><input value={text.hours} onChange={e => setText({ hours: e.target.value })} style={input} /></Field>
        <Field label={f.address}><textarea rows={2} value={text.address} onChange={e => setText({ address: e.target.value })} style={area} /></Field>
      </Section>
      <Section title={t.adminPages.sections.hero}>
        <Field label={f.eyebrow}><input value={text.eyebrow} onChange={e => setText({ eyebrow: e.target.value })} style={input} /></Field>
        <Field label={f.title}><input value={text.title} onChange={e => setText({ title: e.target.value })} style={input} /></Field>
      </Section>
      <Section title={t.adminPages.sections.box}>
        <Field label={f.helpTitle}><input value={text.helpTitle} onChange={e => setText({ helpTitle: e.target.value })} style={input} /></Field>
        <Field label={f.helpText}><textarea rows={4} value={text.helpText} onChange={e => setText({ helpText: e.target.value })} style={area} /></Field>
      </Section>
    </EditorLayout>
  )
}

// Language switch at the top, the page's sections, and a sticky Save bar at the bottom.
type EditorControls = {
  lang: Lang
  setLang: (lang: Lang) => void
  dirty: boolean
  status: 'idle' | 'saving' | 'saved' | 'error'
  error: string
  save: (validate?: () => string | null) => void
  reset: (question: string) => void
}

function EditorLayout({ d, path, validate, children }: { d: EditorControls; path: string; validate?: () => string | null; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 6 }}>{t.adminPages.editing}</div>
          <Segmented value={d.lang} options={LANGS.map(l => ({ value: l.code, label: l.label }))} onChange={d.setLang} />
        </div>
        <Link to={path} target="_blank" style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none' }}>{t.adminPages.view}</Link>
      </div>
      <p style={{ fontSize: 13, color: '#86868b', margin: '14px 0 0' }}>{t.adminPages.emptyHint}</p>

      {children}

      <div style={{ position: 'sticky', bottom: 0, marginTop: 32, padding: '14px 0', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => d.save(validate)}
          disabled={!d.dirty || d.status === 'saving'}
          style={{ fontSize: 15, fontWeight: 500, padding: '12px 28px', borderRadius: 980, border: 'none', background: '#1d1d1f', color: '#fff', cursor: d.dirty ? 'pointer' : 'default', opacity: d.dirty && d.status !== 'saving' ? 1 : 0.4 }}
        >
          {d.status === 'saving' ? t.adminPages.saving : t.adminPages.save}
        </button>
        {d.dirty && d.status !== 'error' && <span style={{ fontSize: 13, color: '#9a5b00' }}>● {t.adminPages.unsaved}</span>}
        {d.status === 'saved' && <span role="status" style={{ fontSize: 13, color: '#1b7a35' }}>✓ {t.adminPages.saved}</span>}
        {d.status === 'error' && <span role="alert" style={{ fontSize: 13, color: '#d70015' }}>{d.error || t.adminPages.error}</span>}
        <button onClick={() => d.reset(t.adminPages.resetConfirm)} style={{ marginLeft: 'auto', fontSize: 13, color: '#6e6e73', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          {t.adminPages.reset}
        </button>
      </div>
    </div>
  )
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" style={{ display: 'inline-flex', gap: 2, background: '#f0f0f2', borderRadius: 980, padding: 3 }}>
      {options.map(o => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          style={{ fontSize: 14, fontWeight: 500, padding: '8px 16px', borderRadius: 980, border: 'none', cursor: 'pointer', background: o.value === value ? '#fff' : 'transparent', color: o.value === value ? '#1d1d1f' : '#6e6e73', boxShadow: o.value === value ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: 0 }}>{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 13, color: '#6e6e73', marginBottom: 6 }}>
        {label}
        {hint && <span style={{ color: '#86868b' }}> · {hint}</span>}
      </span>
      {children}
    </label>
  )
}

function SmallButton({ label, danger, disabled, onClick, children }: { label: string; danger?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      style={{ fontSize: 13, minWidth: 32, height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid #d2d2d7', background: '#fff', color: danger ? '#d70015' : '#1d1d1f', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1 }}
    >
      {children}
    </button>
  )
}

function Loading() {
  return <div style={{ minHeight: 400 }} />
}

const input: React.CSSProperties = {
  width: '100%', padding: '11px 14px', fontSize: 15, border: '1px solid #d2d2d7', borderRadius: 12,
  background: '#fff', color: '#1d1d1f', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
}
const area: React.CSSProperties = { ...input, resize: 'vertical' }

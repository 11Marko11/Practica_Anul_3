import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Slide } from '../../components/PromoBanner'
import { LANGS, useI18n, type Lang } from '../../i18n/I18nContext'
import { api, ApiError } from '../../lib/api'
import { useAllCars, useFreshCatalog } from '../../lib/carStore'
import { PLACEMENTS, promoText, type Placement, type Promotion, type PromotionTexts } from '../../lib/promotions'
import { formatDate } from '../../lib/rental'
import { AdminGuard } from './AdminGuard'
import { AdminTabs } from './AdminTabs'

// /admin/promotions lists the ads; /admin/promotions/new and /admin/promotions/:id edit one.
export function AdminPromotions() {
  const { id } = useParams()
  return <AdminGuard>{id ? <PromotionEditor key={id} id={id} /> : <PromotionList />}</AdminGuard>
}

// Today in Moldova, to tell whether an ad is showing, scheduled or over (same rule as the server).
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Chisinau', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

function statusOf(p: Promotion): 'live' | 'scheduled' | 'ended' | 'off' {
  if (!p.active) return 'off'
  if (p.startsOn && p.startsOn > today()) return 'scheduled'
  if (p.endsOn && p.endsOn < today()) return 'ended'
  return 'live'
}
const STATUS_COLORS = { live: ['#e3f6e8', '#1b7a35'], scheduled: ['#e6f0ff', '#0058b8'], ended: ['#f2f2f4', '#6e6e73'], off: ['#f2f2f4', '#6e6e73'] } as const

function Header({ title }: { title: string }) {
  return (
    <div style={{ padding: '40px 24px 28px', background: '#1c1c1e' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <AdminTabs />
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{title}</h1>
      </div>
    </div>
  )
}

const toInput = (p: Promotion) => ({
  placement: p.placement, texts: p.texts, imageUrl: p.imageUrl ?? '', linkUrl: p.linkUrl ?? '', active: p.active,
  startsOn: p.startsOn ?? '', endsOn: p.endsOn ?? '', position: p.position,
})

function PromotionList() {
  const { lang, t } = useI18n()
  const a = t.adminPromos
  const [promotions, setPromotions] = useState<Promotion[] | null>(null)

  const load = () => api<{ promotions: Promotion[] }>('/admin/promotions').then(r => setPromotions(r.promotions)).catch(() => setPromotions([]))
  useEffect(() => {
    load()
  }, [])

  async function toggle(p: Promotion) {
    await api(`/admin/promotions/${p.id}`, { method: 'PUT', body: { ...toInput(p), active: !p.active } }).catch(() => alert(a.errors.unknown))
    load()
  }

  async function remove(p: Promotion) {
    if (!confirm(a.deleteAsk)) return
    await api(`/admin/promotions/${p.id}`, { method: 'DELETE' }).catch(() => alert(a.errors.unknown))
    load()
  }

  const day = (d: string) => formatDate(d, lang)
  const dates = (p: Promotion) =>
    p.startsOn && p.endsOn ? a.dates(day(p.startsOn), day(p.endsOn)) : p.startsOn ? `${a.from(day(p.startsOn))} · ${a.always}` : p.endsOn ? a.until(day(p.endsOn)) : a.always

  return (
    <div style={{ paddingTop: 52 }}>
      <Header title={a.title} />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: 0, maxWidth: 620, lineHeight: 1.5 }}>{a.intro}</p>
          <Link to="/admin/promotions/new" style={{ fontSize: 15, fontWeight: 500, padding: '12px 24px', borderRadius: 980, background: '#1d1d1f', color: '#fff', textDecoration: 'none' }}>{a.add}</Link>
        </div>

        {!promotions && <p style={{ fontSize: 15, color: '#6e6e73', marginTop: 24 }}>{t.bookings.loading}</p>}
        {promotions?.length === 0 && <p style={{ fontSize: 15, color: '#6e6e73', padding: '40px 0' }}>{a.empty}</p>}

        {PLACEMENTS.map(placement => {
          const list = (promotions ?? []).filter(p => p.placement === placement)
          if (!list.length) return null
          return (
            <section key={placement} style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: '0 0 12px' }}>{a.placement[placement]}</h2>
              {list.map(p => {
                const status = statusOf(p)
                const [bg, fg] = STATUS_COLORS[status]
                return (
                  <div key={p.id} className="admin-row" style={{ padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ width: 150, aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', background: p.imageUrl ? `#1c1c1e center / cover no-repeat url("${p.imageUrl}")` : '#1c1c1e', flexShrink: 0, opacity: status === 'live' ? 1 : 0.55 }} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{promoText(p, lang, 'title')}</strong>
                        <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 9px', borderRadius: 980, background: bg, color: fg }}>{a.status[status]}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>{dates(p)} · #{p.position} · {a.clicks(p.clicks ?? 0)}</div>
                      {p.linkUrl && <div style={{ fontSize: 12, color: '#86868b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.linkUrl}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 14, flexShrink: 0 }}>
                      <button onClick={() => toggle(p)} style={linkButton('#6e6e73')}>{p.active ? a.turnOff : a.turnOn}</button>
                      <Link to={`/admin/promotions/${p.id}`} style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>{a.edit}</Link>
                      <button onClick={() => remove(p)} style={linkButton('#d70015')}>{a.delete}</button>
                    </div>
                  </div>
                )
              })}
            </section>
          )
        })}
      </main>
    </div>
  )
}

const EMPTY_TEXTS: PromotionTexts = { ro: { title: '', text: '', button: '' }, en: { title: '', text: '', button: '' }, ru: { title: '', text: '', button: '' } }

function PromotionEditor({ id }: { id: string }) {
  const { t } = useI18n()
  const a = t.adminPromos
  const f = a.fields
  const navigate = useNavigate()
  const isNew = id === 'new'
  const [form, setForm] = useState<ReturnType<typeof toInput> | null>(
    isNew ? { placement: 'HOME', texts: EMPTY_TEXTS, imageUrl: '', linkUrl: '/marketplace', active: true, startsOn: '', endsOn: '', position: 0 } : null,
  )
  const [lang, setLang] = useState<Lang>('ro')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fresh = useFreshCatalog()
  const cars = useAllCars()

  useEffect(() => {
    if (!isNew) api<{ promotions: Promotion[] }>('/admin/promotions').then(r => {
      const p = r.promotions.find(x => String(x.id) === id)
      if (p) setForm(toInput(p))
      else navigate('/admin/promotions', { replace: true })
    })
  }, [id])

  if (!form) return <div style={{ minHeight: '80vh' }} />

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => (prev ? { ...prev, [key]: value } : prev))
    setError('')
  }
  const setText = (field: 'title' | 'text' | 'button', value: string) => set('texts', { ...form.texts, [lang]: { ...form.texts[lang], [field]: value } })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    if (!form.texts.ro.title && !form.texts.en.title && !form.texts.ru.title) return setError(a.errors.title)
    setBusy(true)
    try {
      await api(isNew ? '/admin/promotions' : `/admin/promotions/${id}`, { method: isNew ? 'POST' : 'PUT', body: form })
      navigate('/admin/promotions')
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'validation' ? a.errors.validation : a.errors.unknown)
      setBusy(false)
    }
  }

  const preview = { id: 0, texts: form.texts, imageUrl: form.imageUrl || null, linkUrl: form.linkUrl || null }

  return (
    <div style={{ paddingTop: 52 }}>
      <Header title={isNew ? a.newTitle : a.editTitle} />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 96px' }}>
        <Link to="/admin/promotions" style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none' }}>{a.back}</Link>

        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#6e6e73', margin: '24px 0 10px' }}>{a.preview} · {LANGS.find(l => l.code === lang)?.label}</h2>
        <Slide promotion={preview} preview lang={lang} />

        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 28 }}>
          <div className="admin-fields">
            <Field label={f.placement}>
              <select value={form.placement} onChange={e => set('placement', e.target.value as Placement)} style={input}>
                {PLACEMENTS.map(p => <option key={p} value={p}>{a.placement[p]}</option>)}
              </select>
            </Field>
            <Field label={f.position}>
              <input type="number" min={0} max={999} value={form.position} onChange={e => set('position', Math.max(0, Number(e.target.value) || 0))} style={input} />
            </Field>
            <Field label={f.active}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#1d1d1f', padding: '10px 0' }}>
                <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} style={{ width: 18, height: 18, accentColor: '#1d1d1f' }} />
                {f.active}
              </label>
            </Field>
          </div>

          <div style={{ border: '1px solid #e5e5ea', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#6e6e73' }}>{f.language}</span>
              {LANGS.map(l => (
                <button key={l.code} type="button" onClick={() => setLang(l.code)} aria-pressed={lang === l.code}
                  style={{ fontSize: 13, padding: '6px 14px', borderRadius: 980, border: '1px solid', borderColor: lang === l.code ? '#1d1d1f' : '#d2d2d7', background: lang === l.code ? '#1d1d1f' : '#fff', color: lang === l.code ? '#fff' : '#1d1d1f', cursor: 'pointer' }}>
                  {l.label}{form.texts[l.code].title ? ' ✓' : ''}
                </button>
              ))}
            </div>
            <Field label={f.title}><input value={form.texts[lang].title} maxLength={120} onChange={e => setText('title', e.target.value)} style={input} /></Field>
            <Field label={f.text}><textarea rows={3} maxLength={300} value={form.texts[lang].text} onChange={e => setText('text', e.target.value)} style={{ ...input, resize: 'vertical' }} /></Field>
            <Field label={f.button}><input value={form.texts[lang].button} maxLength={40} onChange={e => setText('button', e.target.value)} style={input} /></Field>
            <p style={{ fontSize: 12, color: '#86868b', margin: 0 }}>{a.textsHint}</p>
          </div>

          <Field label={f.imageUrl}><input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value.trim())} placeholder="https://…" style={input} /></Field>
          <div className="admin-fields">
            <Field label={f.linkUrl} hint={f.linkHint}><input value={form.linkUrl} onChange={e => set('linkUrl', e.target.value.trim())} style={input} /></Field>
            <Field label={f.linkCar}>
              <select value="" onChange={e => e.target.value && set('linkUrl', `/cars/${e.target.value}`)} disabled={!fresh} style={input}>
                <option value="">—</option>
                {cars.map(c => <option key={c.id} value={c.slug}>{c.brand} {c.model}</option>)}
              </select>
            </Field>
          </div>
          <div className="admin-fields">
            <Field label={f.startsOn}><input type="date" value={form.startsOn} onChange={e => set('startsOn', e.target.value)} style={input} /></Field>
            <Field label={f.endsOn}><input type="date" value={form.endsOn} min={form.startsOn || undefined} onChange={e => set('endsOn', e.target.value)} style={input} /></Field>
          </div>
          <p style={{ fontSize: 12, color: '#86868b', margin: '-6px 0 0' }}>{f.datesHint}</p>

          {error && <p role="alert" style={{ fontSize: 14, color: '#d70015', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button type="submit" disabled={busy} style={{ fontSize: 15, fontWeight: 500, padding: '13px 30px', borderRadius: 980, border: 'none', background: '#1d1d1f', color: '#fff', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? a.saving : a.save}
            </button>
            <Link to="/admin/promotions" style={{ fontSize: 15, color: '#6e6e73', textDecoration: 'none' }}>{a.cancel}</Link>
          </div>
        </form>
      </main>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73', minWidth: 0 }}>
      {label}
      {children}
      {hint && <span style={{ fontSize: 12, color: '#86868b', lineHeight: 1.4 }}>{hint}</span>}
    </label>
  )
}

const input: React.CSSProperties = { width: '100%', padding: '11px 14px', fontSize: 15, border: '1px solid #d2d2d7', borderRadius: 12, background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none' }
const linkButton = (color: string): React.CSSProperties => ({ fontSize: 14, color, background: 'none', border: 'none', padding: 0, cursor: 'pointer' })

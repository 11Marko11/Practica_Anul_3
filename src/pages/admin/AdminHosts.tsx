import { useState } from 'react'
import { Link } from 'react-router'
import { useI18n } from '../../i18n/I18nContext'
import { ApiError } from '../../lib/api'
import { createHost, deleteHost, updateHost, useAdminHosts, type AdminHost, type HostInput } from '../../lib/hosts'
import { useUrlParams } from '../../lib/useUrlParams'
import { pageFrom, Pagination } from '../../components/Pagination'
import { AdminGuard } from './AdminGuard'
import { AdminTabs } from './AdminTabs'

const SORTS = ['name', 'rating', 'trips', 'cars'] as const
type Sort = (typeof SORTS)[number]
const COMPARE: Record<Sort, (a: AdminHost, b: AdminHost) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviews - a.reviews,
  trips: (a, b) => b.trips - a.trips,
  cars: (a, b) => b.cars.length - a.cars.length || a.name.localeCompare(b.name),
}
const PAGE_SIZE = 20

// /admin/hosts: the people who rent out the cars, with their rating, trips and cars.
export function AdminHosts() {
  return (
    <AdminGuard>
      <HostsContent />
    </AdminGuard>
  )
}

function HostsContent() {
  const { t } = useI18n()
  const h = t.adminHosts
  const { hosts, reload } = useAdminHosts()
  const [adding, setAdding] = useState(false)

  const { params, edit } = useUrlParams()
  const sort: Sort = SORTS.includes(params.get('sort') as Sort) ? (params.get('sort') as Sort) : 'name'
  const query = params.get('q') ?? ''
  const set = (key: string, value: string, fallback: string) => edit(p => { if (value && value !== fallback) p.set(key, value); else p.delete(key); p.delete('page') })

  const q = query.trim().toLowerCase()
  const list = (hosts ?? []).filter(x => !q || `${x.name} ${x.phone ?? ''}`.toLowerCase().includes(q)).sort(COMPARE[sort])
  const pages = Math.ceil(list.length / PAGE_SIZE)
  const page = pageFrom(params, pages)
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  function goToPage(n: number) {
    edit(p => (n > 1 ? p.set('page', String(n)) : p.delete('page')), { push: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function add(input: HostInput) {
    await createHost(input)
    setAdding(false)
    await reload()
  }

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '40px 24px 36px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <AdminTabs />
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{h.title}</h1>
              <p style={{ fontSize: 14, color: '#a1a1a6', margin: '10px 0 0', maxWidth: 560 }}>
                {hosts && `${h.count(hosts.length)} · `}{h.intro}
              </p>
            </div>
            <button onClick={() => setAdding(true)} style={{ fontSize: 15, fontWeight: 500, padding: '12px 24px', borderRadius: 980, background: '#f5f5f7', color: '#1c1c1e', border: 'none', cursor: 'pointer' }}>
              {h.add}
            </button>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 96px' }}>
        {adding && (
          <div style={{ padding: 20, borderRadius: 16, background: '#f5f5f7', marginBottom: 20 }}>
            <HostEditor onSave={add} onCancel={() => setAdding(false)} />
          </div>
        )}

        <div className="admin-car-toolbar">
          <input type="search" value={query} onChange={e => set('q', e.target.value, '')} placeholder={h.search} aria-label={h.search} style={{ ...control, flex: '1 1 220px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6e6e73' }}>
            {h.sortBy}
            <select value={sort} onChange={e => set('sort', e.target.value, 'name')} style={control}>
              {SORTS.map(o => <option key={o} value={o}>{h.sort[o]}</option>)}
            </select>
          </label>
        </div>

        {hosts && list.length === 0 && <p style={{ fontSize: 15, color: '#6e6e73', padding: '32px 0' }}>{h.empty}</p>}

        <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
          {shown.map(host => <HostRow key={host.id} host={host} onChanged={reload} />)}
        </ul>
        <Pagination page={page} pages={pages} total={list.length} pageSize={PAGE_SIZE} onChange={goToPage} />
      </main>
    </div>
  )
}

function HostRow({ host, onChanged }: { host: AdminHost; onChanged: () => Promise<unknown> }) {
  const { t } = useI18n()
  const h = t.adminHosts
  const [editing, setEditing] = useState(false)

  async function save(input: HostInput) {
    await updateHost(host.id, input)
    setEditing(false)
    await onChanged()
  }

  async function remove() {
    if (!confirm(h.deleteAsk(host.name))) return
    try {
      await deleteHost(host.id)
      await onChanged()
    } catch (err) {
      alert(err instanceof ApiError && err.code === 'host-has-cars' ? h.hasCars : h.error)
    }
  }

  return (
    <li style={{ padding: '18px 0', borderBottom: '1px solid #f0f0f0' }}>
      {editing ? (
        <HostEditor host={host} onSave={save} onCancel={() => setEditing(false)} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1d1d1f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 600, flexShrink: 0 }}>
            {host.name.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>{host.name}</span>
              {host.phone && <a href={`tel:${host.phone}`} style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none' }}>{host.phone}</a>}
            </div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 3 }}>
              {host.rating !== null ? `★ ${host.rating.toFixed(1)} (${h.ratings(host.reviews)})` : h.noRatings} · {t.common.trips(host.trips)} · {h.cars(host.cars.length)}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {host.cars.length === 0 && <span style={{ fontSize: 13, color: '#86868b' }}>{h.noCars}</span>}
              {host.cars.map(car => (
                <Link key={car.id} to={`/admin/cars/${car.slug}`} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 980, background: '#f5f5f7', color: car.status === 'HIDDEN' ? '#86868b' : '#1d1d1f', textDecoration: 'none' }}>
                  {car.brand} {car.model} {car.year}{car.status === 'HIDDEN' && ` · ${h.hidden}`}
                </Link>
              ))}
              <Link to={`/admin/cars/new?host=${host.id}`} style={{ fontSize: 12, padding: '4px 10px', color: '#0071e3', textDecoration: 'none' }}>{h.addCar}</Link>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 14, flexShrink: 0 }}>
            <button onClick={() => setEditing(true)} style={{ ...linkButton, color: '#0071e3', fontWeight: 500 }}>{h.edit}</button>
            <button onClick={remove} style={{ ...linkButton, color: '#d70015' }}>{h.delete}</button>
          </div>
        </div>
      )}
    </li>
  )
}

// Name and phone of a host, for adding a new one or editing one.
function HostEditor({ host, onSave, onCancel }: { host?: AdminHost; onSave: (input: HostInput) => Promise<void>; onCancel: () => void }) {
  const { t } = useI18n()
  const h = t.adminHosts
  const [name, setName] = useState(host?.name ?? '')
  const [phone, setPhone] = useState(host?.phone ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await onSave({ name: name.trim(), phone: phone.trim() || undefined })
    } catch {
      setError(h.error)
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
      <button type="submit" disabled={busy || !name.trim()} style={{ fontSize: 14, fontWeight: 500, padding: '10px 20px', borderRadius: 980, background: '#1d1d1f', color: '#fff', border: 'none', cursor: 'pointer', opacity: busy || !name.trim() ? 0.5 : 1 }}>
        {h.save}
      </button>
      <button type="button" onClick={onCancel} style={{ ...linkButton, color: '#6e6e73', padding: '10px 4px' }}>{h.cancel}</button>
      {error && <p style={{ flexBasis: '100%', fontSize: 13, color: '#d70015', margin: 0 }}>{error}</p>}
    </form>
  )
}

const control: React.CSSProperties = { fontSize: 14, padding: '9px 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none' }
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73', flex: '1 1 200px' }
const linkButton: React.CSSProperties = { fontSize: 14, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }

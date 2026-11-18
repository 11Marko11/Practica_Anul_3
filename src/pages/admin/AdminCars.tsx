import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { carImage } from '../../data/cars'
import { deleteCar, reloadCars, setCarStatus, useAllCars, useFreshCatalog } from '../../lib/carStore'
import { ApiError } from '../../lib/api'
import { fmt } from '../../lib/rental'
import { useI18n } from '../../i18n/I18nContext'
import { carText } from '../../i18n/cars'
import { AdminGuard } from './AdminGuard'
import { AdminTabs } from './AdminTabs'
import { CountBadge } from '../../components/CountBadge'
import { ResetButton } from '../../components/ResetButton'
import { useUrlParams } from '../../lib/useUrlParams'
import { CONDITION_COLORS } from '../../lib/carCondition'
import { HiddenVeil } from '../../components/HiddenVeil'
import { useKeepHeight } from '../../lib/useKeepHeight'
import { pageFrom, Pagination } from '../../components/Pagination'
import type { Car } from '../../data/cars'
import { api } from '../../lib/api'
import { refreshAwaitingCount } from '../../lib/adminNotifications'
import { DocumentCards } from '../../components/PrivateDocuments'
import { CAR_REVIEW_COLORS, hostDocumentUrl, type CarDocumentType, type CarReviewStatus, type PrivateDocument } from '../../lib/privateDocuments'

const SORTS = ['recent', 'oldest', 'name', 'price-asc', 'price-desc', 'year', 'power'] as const
type Sort = (typeof SORTS)[number]
const STATUS_FILTERS = ['all', 'REVIEW', 'NO_DOCS', 'ACTIVE', 'HIDDEN'] as const
const PAGE_SIZE = 20

// "To check": papers waiting for the admin; "Unverified": no papers yet, so off the site.
// "On the site" means shown by the host and approved.
const statusMatches = (f: (typeof STATUS_FILTERS)[number], c: Car) => {
  if (f === 'all') return true
  if (f === 'REVIEW') return c.reviewStatus === 'PENDING'
  if (f === 'NO_DOCS') return c.reviewStatus === 'NO_DOCUMENTS'
  if (f === 'ACTIVE') return (c.status ?? 'ACTIVE') === 'ACTIVE' && (c.reviewStatus ?? 'APPROVED') === 'APPROVED'
  return c.status === f
}

const name = (c: Car) => `${c.brand} ${c.model}`
const added = (c: Car) => c.createdAt ?? ''
const COMPARE: Record<Sort, (a: Car, b: Car) => number> = {
  recent: (a, b) => added(b).localeCompare(added(a)) || b.id - a.id,
  oldest: (a, b) => added(a).localeCompare(added(b)) || a.id - b.id,
  name: (a, b) => name(a).localeCompare(name(b)),
  'price-asc': (a, b) => a.pricePerDay - b.pricePerDay,
  'price-desc': (a, b) => b.pricePerDay - a.pricePerDay,
  year: (a, b) => b.year - a.year || name(a).localeCompare(name(b)),
  power: (a, b) => b.horsepower - a.horsepower,
}

export function AdminCars() {
  return (
    <AdminGuard>
      <AdminCarsContent />
    </AdminGuard>
  )
}

function AdminCarsContent() {
  // Cars their hosts deleted are kept only for the booking history; they don't show here.
  const allCars = useAllCars().filter(c => c.status !== 'REMOVED')
  const fresh = useFreshCatalog()
  const { lang, t } = useI18n()
  const s = t.adminCarsList

  // Sorting and filters live in the URL, so they are kept after adding or editing a car.
  const { params, edit } = useUrlParams()
  // Typing in the search doesn't make the page jump up as the list gets shorter.
  const keep = useKeepHeight<HTMLElement>()
  const sort: Sort = SORTS.includes(params.get('sort') as Sort) ? (params.get('sort') as Sort) : 'recent'
  const status = STATUS_FILTERS.includes(params.get('status') as never) ? (params.get('status') as (typeof STATUS_FILTERS)[number]) : 'all'
  const brand = params.get('brand') ?? ''
  const hostId = params.get('host') ?? ''
  const query = params.get('q') ?? ''
  // Any change of search, filter or sorting goes back to the first page.
  const set = (key: string, value: string, fallback: string) => edit(p => { if (value && value !== fallback) p.set(key, value); else p.delete(key); p.delete('page') })

  const brands = [...new Set(allCars.map(c => c.brand))].sort((a, b) => a.localeCompare(b))
  // Every host with a car in the list, with how many cars they have.
  const hosts = [...allCars.reduce((m, c) => {
    if (c.host.id) m.set(c.host.id, { name: c.host.name, cars: (m.get(c.host.id)?.cars ?? 0) + 1 })
    return m
  }, new Map<number, { name: string; cars: number }>())].sort((a, b) => a[1].name.localeCompare(b[1].name))
  const q = query.trim().toLowerCase()
  const cars = allCars
    .filter(c => statusMatches(status, c) && (!brand || c.brand === brand) && (!hostId || String(c.host.id) === hostId))
    .filter(c => !q || `${name(c)} ${c.location} ${c.host.name}`.toLowerCase().includes(q))
    .sort(COMPARE[sort])
  const pages = Math.ceil(cars.length / PAGE_SIZE)
  const page = pageFrom(params, pages)
  const shown = cars.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  function goToPage(n: number) {
    edit(p => (n > 1 ? p.set('page', String(n)) : p.delete('page')), { push: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const count = (f: (typeof STATUS_FILTERS)[number]) => allCars.filter(c => statusMatches(f, c) && (!hostId || String(c.host.id) === hostId)).length
  const [reviewing, setReviewing] = useState<number | null>(null)

  async function remove(id: number, name: string) {
    if (!confirm(t.admin.deleteConfirm(name))) return
    try {
      await deleteCar(id)
    } catch (err) {
      alert(err instanceof ApiError && err.code === 'car-has-bookings' ? t.admin.hasBookings : t.admin.deleteError)
    }
  }

  if (!fresh) return <div style={{ minHeight: '80vh' }} />

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '40px 24px 36px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <AdminTabs />
        </div>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{t.admin.title}</h1>
            <p style={{ fontSize: 14, color: '#a1a1a6', margin: '10px 0 0' }}>{t.admin.count(allCars.length)} · {t.admin.carsByHosts}</p>
          </div>
          {/* Every car with all its details, photos and hosts, as an Excel file. */}
          <a href="/api/admin/export/cars.xlsx" download style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 500, padding: '12px 24px', borderRadius: 980, background: '#f5f5f7', color: '#1c1c1e', textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M7 2v7M3.5 6 7 9.5 10.5 6M2.5 12h9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {t.admin.exportExcel}
          </a>
        </div>
      </div>

      <main ref={keep.ref} style={{ minHeight: keep.minHeight, maxWidth: 1000, margin: '0 auto', padding: '24px 24px 96px' }}>
        <div className="admin-car-toolbar">
          <input
            type="search"
            value={query}
            onChange={e => set('q', e.target.value, '')}
            placeholder={s.search}
            aria-label={s.search}
            style={{ ...control, flex: '1 1 220px' }}
          />
          <select value={brand} onChange={e => set('brand', e.target.value, '')} aria-label={t.marketplace.brand} style={control}>
            <option value="">{s.allBrands}</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={hostId} onChange={e => set('host', e.target.value, '')} aria-label={s.host} style={control}>
            <option value="">{s.allHosts}</option>
            {hosts.map(([id, h]) => <option key={id} value={id}>{h.name} ({h.cars})</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6e6e73' }}>
            {s.sortBy}
            <select value={sort} onChange={e => set('sort', e.target.value, 'recent')} style={control}>
              {SORTS.map(o => <option key={o} value={o}>{s.sort[o]}</option>)}
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', margin: '12px 0 4px' }}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => set('status', f, 'all')}
              aria-pressed={status === f}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 14px', borderRadius: 980, border: '1px solid', borderColor: status === f ? '#1d1d1f' : '#d2d2d7', background: status === f ? '#1d1d1f' : 'transparent', color: status === f ? '#fff' : '#6e6e73', cursor: 'pointer' }}
            >
              {f === 'REVIEW' ? t.carPapers.admin.filter : f === 'NO_DOCS' ? t.carPapers.admin.noDocsFilter : s.status[f]}
              {/* Cars whose papers wait for the admin stand out with a red counter. */}
              {f === 'REVIEW' && count(f) > 0 ? <CountBadge n={count(f)} /> : <span>({count(f)})</span>}
            </button>
          ))}
          {(q || brand || hostId || status !== 'all') && (
            <ResetButton onClick={() => edit(p => { p.delete('q'); p.delete('brand'); p.delete('host'); p.delete('status'); p.delete('page') })}>{s.reset}</ResetButton>
          )}
        </div>

        {allCars.length === 0 && <p style={{ fontSize: 16, color: '#6e6e73', textAlign: 'center', padding: '48px 0' }}>{t.admin.empty}</p>}
        {allCars.length > 0 && cars.length === 0 && <p style={{ fontSize: 15, color: '#6e6e73', padding: '32px 0' }}>{s.noMatch}</p>}

        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {shown.map(car => {
            const name = `${car.brand} ${car.model}`
            return (
              <li key={car.id} className="admin-row" style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div className="car-row__main">
                {car.status === 'HIDDEN' && <HiddenVeil label={t.admin.hidden} />}
                <div style={{ width: 120, aspectRatio: '16/10', borderRadius: 10, overflow: 'hidden', background: '#e8e8ed', flexShrink: 0 }}>
                  {car.photos.length > 0 && <img src={carImage(car, 240, 150)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>{name} <span style={{ fontWeight: 400, color: '#6e6e73' }}>· {car.year}</span>
                    {car.condition && car.condition !== 'READY' && (
                      <span title={car.conditionNote ?? undefined} style={{ display: 'inline-block', whiteSpace: 'nowrap', verticalAlign: 'middle', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: 8, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 980, ...CONDITION_COLORS[car.condition] }}>
                        {t.carCondition.names[car.condition]}{car.conditionNote && ` · ${car.conditionNote.length > 40 ? `${car.conditionNote.slice(0, 40)}…` : car.conditionNote}`}
                      </span>
                    )}
                    {car.reviewStatus && car.reviewStatus !== 'APPROVED' && (
                      <span style={{ display: 'inline-block', whiteSpace: 'nowrap', verticalAlign: 'middle', marginLeft: 8, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 980, ...CAR_REVIEW_COLORS[car.reviewStatus] }}>
                        {t.carPapers.status[car.reviewStatus]}
                      </span>
                    )}
                    <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: '#86868b' }}>· {car.host.name}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>
                    {fmt(car.pricePerDay)}{t.common.perDay} · {carText(car, lang).location} · {car.horsepower} {t.car.units.hp}
                    {car.createdAt && <span style={{ color: '#86868b' }}> · {t.adminCarsList.added(new Date(car.createdAt).toLocaleDateString(lang))}</span>}
                  </div>
                </div>
                </div>
                <div className="row-actions">
                  <button onClick={() => setReviewing(reviewing === car.id ? null : car.id)} className={`btn-action ${car.reviewStatus === 'PENDING' ? 'btn-action--primary' : 'btn-action--neutral'}`}>
                    {reviewing === car.id ? t.carPapers.admin.hide : t.carPapers.admin.review}
                  </button>
                  <Link to={`/cars/${car.slug}`} className="btn-action btn-action--neutral">{t.admin.view}</Link>
                  <button
                    onClick={() => setCarStatus(car.id, car.status === 'HIDDEN' ? 'ACTIVE' : 'HIDDEN').catch(() => alert(t.admin.saveError))}
                    className={`btn-action ${car.status === 'HIDDEN' ? 'btn-action--primary' : 'btn-action--neutral'}`}
                  >
                    {car.status === 'HIDDEN' ? t.admin.showCar : t.admin.hideCar}
                  </button>
                  <button onClick={() => remove(car.id, name)} className="btn-action btn-action--danger">{t.admin.delete}</button>
                </div>
                {reviewing === car.id && <CarReview carId={car.id} onDone={() => setReviewing(null)} />}
              </li>
            )
          })}
        </ul>
        <Pagination page={page} pages={pages} total={cars.length} pageSize={PAGE_SIZE} onChange={goToPage} />

      </main>
    </div>
  )
}

const control: React.CSSProperties = { fontSize: 14, padding: '9px 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none' }

type Review = { status: CarReviewStatus; note: string | null; submittedAt: string | null; documents: PrivateDocument<CarDocumentType>[] }

// The papers of one car (registration, RCA insurance, contract) and the admin's decision.
function CarReview({ carId, onDone }: { carId: number; onDone: () => void }) {
  const { lang, t } = useI18n()
  const a = t.carPapers.admin
  const [review, setReview] = useState<Review | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<Review>(`/admin/cars/${carId}/review`).then(setReview).catch(() => alert(a.error))
  }, [carId])

  async function decide(decision: 'approve' | 'reject') {
    setBusy(true)
    try {
      await api(`/admin/cars/${carId}/review`, { body: decision === 'reject' ? { decision, note: note.trim() } : { decision } })
      await reloadCars()
      refreshAwaitingCount()
      onDone()
    } catch {
      alert(a.error)
      setBusy(false)
    }
  }

  if (!review) return <div style={{ flexBasis: '100%', fontSize: 14, color: '#6e6e73' }}>{t.bookings.loading}</div>
  const button: React.CSSProperties = { fontSize: 14, fontWeight: 500, padding: '10px 18px', borderRadius: 980, border: 'none', cursor: 'pointer' }

  return (
    <div style={{ flexBasis: '100%', padding: 18, borderRadius: 16, background: '#f5f5f7', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13, color: '#6e6e73' }}>
        <strong style={{ fontSize: 14, color: CAR_REVIEW_COLORS[review.status].color }}>{t.carPapers.status[review.status]}</strong>
        {review.submittedAt && <span>{a.submitted(new Date(review.submittedAt).toLocaleString(lang, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}</span>}
      </div>
      {review.status === 'REJECTED' && review.note && <p style={{ fontSize: 14, color: '#b3261e', margin: 0 }}>{t.carPapers.reason}: {review.note}</p>}
      {review.documents.length === 0 ? (
        <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>{a.noDocuments}</p>
      ) : (
        <DocumentCards documents={review.documents} label={type => t.carPapers.docTypes[type]} url={hostDocumentUrl} />
      )}
      {rejecting ? (
        <form onSubmit={e => { e.preventDefault(); decide('reject') }} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73' }}>
            {a.rejectNote}
            <textarea required minLength={3} rows={3} value={note} onChange={e => setNote(e.target.value)} autoFocus style={{ fontSize: 15, padding: '10px 12px', border: '1px solid #d2d2d7', borderRadius: 12, fontFamily: 'inherit', resize: 'vertical' }} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={busy} style={{ ...button, background: '#d70015', color: '#fff' }}>{a.rejectSubmit}</button>
            <button type="button" onClick={() => setRejecting(false)} style={{ ...button, background: '#fff', color: '#1d1d1f' }}>{a.cancel}</button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {review.status !== 'APPROVED' && review.status !== 'NO_DOCUMENTS' && <button onClick={() => decide('approve')} disabled={busy} style={{ ...button, background: '#1b7a35', color: '#fff' }}>✓ {a.approve}</button>}
          {review.status !== 'REJECTED' && review.status !== 'NO_DOCUMENTS' && <button onClick={() => setRejecting(true)} style={{ ...button, background: '#fff', color: '#d70015', border: '1px solid #f0c4c4' }}>{a.reject}</button>}
        </div>
      )}
    </div>
  )
}

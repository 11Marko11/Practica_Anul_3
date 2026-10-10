import { useEffect, useState } from 'react'
import type { VerificationStatus } from '../../auth/AuthContext'
import { VerificationBadge } from '../Profile'
import { refreshAwaitingCount } from '../../lib/adminNotifications'
import { documentUrl, type IdentityDocument } from '../../lib/profile'
import { formatPhone } from '../../lib/phone'
import { Link, useParams } from 'react-router'
import { BookingCard } from '../../components/BookingCard'
import { Money } from '../../components/Money'
import { useI18n } from '../../i18n/I18nContext'
import { api } from '../../lib/api'
import type { Booking } from '../../lib/bookings'
import { formatDate } from '../../lib/rental'
import { AdminGuard } from './AdminGuard'
import { AdminTabs } from './AdminTabs'

type Customer = {
  id: string
  name: string
  email: string
  active: boolean
  verificationStatus: VerificationStatus
  verificationSubmittedAt: string | null
  createdAt: string
  deletedAt: string | null
  bookings: number
  completed: number
  spent: number
  lastBookingAt: string | null
  reviews: number
}
type Detail = {
  customer: Pick<Customer, 'id' | 'name' | 'email' | 'active' | 'createdAt' | 'deletedAt' | 'spent' | 'verificationStatus' | 'verificationSubmittedAt'> & {
    refunded: number
    phone: string | null
    birthDate: string | null
    verificationNote: string | null
    verifiedAt: string | null
  }
  documents: IdentityDocument[]
  bookings: Booking[]
  reviews: { id: string; rating: number; text: string; date: string; car: { slug: string; brand: string; model: string } }[]
}

const FILTERS = ['all', 'pending', 'active', 'deleted'] as const

// /admin/customers lists every customer; /admin/customers/:id shows one customer's history.
export function AdminCustomers() {
  const { id } = useParams()
  return <AdminGuard>{id ? <CustomerDetail key={id} id={id} /> : <CustomerList />}</AdminGuard>
}

function Header({ title }: { title: string }) {
  return (
    <div style={{ padding: '40px 24px 28px', background: '#1c1c1e' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <AdminTabs />
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05, overflowWrap: 'anywhere' }}>{title}</h1>
      </div>
    </div>
  )
}

export function StatusPill({ active }: { active: boolean }) {
  const { t } = useI18n()
  return (
    <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 980, whiteSpace: 'nowrap', background: active ? '#e3f6e8' : '#f2f2f4', color: active ? '#1b7a35' : '#6e6e73' }}>
      {active ? t.customers.active : t.customers.deleted}
    </span>
  )
}

function CustomerList() {
  const { lang, t } = useI18n()
  const c = t.customers
  const [customers, setCustomers] = useState<Customer[] | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')

  useEffect(() => {
    api<{ customers: Customer[] }>('/admin/customers').then(r => setCustomers(r.customers)).catch(() => setCustomers([]))
  }, [])

  const q = query.trim().toLowerCase()
  const matches = (f: (typeof FILTERS)[number], x: Customer) =>
    f === 'all' || (f === 'pending' ? x.active && x.verificationStatus === 'PENDING' : (f === 'active') === x.active)
  const list = (customers ?? []).filter(x => matches(filter, x) && (!q || x.name.toLowerCase().includes(q) || x.email.toLowerCase().includes(q)))
  const count = (f: (typeof FILTERS)[number]) => (customers ?? []).filter(x => matches(f, x)).length

  return (
    <div style={{ paddingTop: 52 }}>
      <Header title={c.title} />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 96px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={c.search}
            aria-label={c.search}
            style={{ flex: '1 1 260px', fontSize: 15, padding: '10px 16px', borderRadius: 980, border: '1px solid #d2d2d7', fontFamily: 'inherit', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                style={{ fontSize: 13, padding: '8px 14px', borderRadius: 980, border: '1px solid', borderColor: filter === f ? '#1d1d1f' : '#d2d2d7', background: filter === f ? '#1d1d1f' : 'transparent', color: filter === f ? '#fff' : '#6e6e73', cursor: 'pointer' }}
              >
                {f === 'pending' ? t.verificationAdmin.filter : c.filters[f]} {customers && <span style={{ opacity: 0.7 }}>({count(f)})</span>}
              </button>
            ))}
          </div>
        </div>

        {!customers && <p style={{ fontSize: 15, color: '#6e6e73', marginTop: 24 }}>{t.bookings.loading}</p>}
        {customers && list.length === 0 && <p style={{ fontSize: 15, color: '#6e6e73', padding: '32px 0' }}>{c.empty}</p>}

        <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0 }}>
          {list.map(x => (
            <li key={x.id}>
              <Link to={`/admin/customers/${x.id}`} className="customer-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span className="customer-avatar" style={{ background: x.active ? '#1c1c1e' : '#c7c7cc' }}>{x.name.charAt(0).toUpperCase()}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{x.name}</strong>
                    <StatusPill active={x.active} />
                    {x.active && <VerificationBadge status={x.verificationStatus} />}
                  </div>
                  <div style={{ fontSize: 13, color: '#6e6e73', overflowWrap: 'anywhere' }}>{x.email}</div>
                  <div style={{ fontSize: 12, color: '#86868b', marginTop: 2 }}>
                    {x.active ? c.since(formatDate(x.createdAt.slice(0, 10), lang)) : c.deletedOn(formatDate(x.deletedAt!.slice(0, 10), lang))}
                    {x.lastBookingAt && ` · ${c.lastBooking(formatDate(x.lastBookingAt.slice(0, 10), lang))}`}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#6e6e73', textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}><Money value={x.spent} /></div>
                  {c.bookings(x.bookings)} · {c.reviewsCount(x.reviews)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

function CustomerDetail({ id }: { id: string }) {
  const { lang, t } = useI18n()
  const c = t.customers
  const [data, setData] = useState<Detail | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    api<Detail>(`/admin/customers/${id}`).then(setData).catch(() => setMissing(true))
  }, [id])

  const date = (iso: string) => formatDate(iso.slice(0, 10), lang)

  return (
    <div style={{ paddingTop: 52 }}>
      <Header title={data?.customer.name ?? (missing ? c.notFound : '…')} />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 96px' }}>
        <Link to="/admin/customers" style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none' }}>{c.back}</Link>

        {data && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
              <StatusPill active={data.customer.active} />
              <span style={{ fontSize: 14, color: '#424245', overflowWrap: 'anywhere' }}>
                {data.customer.active ? <a href={`mailto:${data.customer.email}`} style={{ color: '#0071e3', textDecoration: 'none' }}>{data.customer.email}</a> : data.customer.email}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#6e6e73', margin: '6px 0 0' }}>
              {c.since(date(data.customer.createdAt))}
              {data.customer.deletedAt && ` · ${c.deletedOn(date(data.customer.deletedAt))}`}
            </p>

            <div className="dashboard-tiles" style={{ marginTop: 20 }}>
              <Stat label={c.spent} value={<Money value={data.customer.spent} />} />
              <Stat label={c.refunded} value={<Money value={data.customer.refunded} />} />
              <Stat label={t.adminBookings.tabBookings} value={String(data.bookings.length)} />
              <Stat label={c.theirReviews} value={String(data.reviews.length)} />
            </div>

            <VerificationPanel data={data} onChange={() => api<Detail>(`/admin/customers/${id}`).then(setData)} />

            <h2 style={sectionTitle}>{c.history}</h2>
            {data.bookings.length === 0 && <p style={{ fontSize: 14, color: '#6e6e73' }}>{c.noBookings}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.bookings.map(b => (
                <BookingCard key={b.id} booking={b}>
                  <div style={{ fontSize: 12, color: '#86868b', marginTop: 8 }}>{t.bookings.bookedOn(date(b.createdAt))} · {b.phone}</div>
                  {b.cancelled?.reason && <div style={{ fontSize: 13, color: '#6e6e73' }}>{t.cancelReasons[b.cancelled.reason]}</div>}
                </BookingCard>
              ))}
            </div>

            <h2 style={sectionTitle}>{c.theirReviews}</h2>
            {data.reviews.length === 0 && <p style={{ fontSize: 14, color: '#6e6e73' }}>{c.noReviews}</p>}
            {data.reviews.map(r => (
              <div key={r.id} style={{ padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 14, color: '#1d1d1f' }}>
                  <strong style={{ fontWeight: 600 }}>{r.car.brand} {r.car.model}</strong> · {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} · <span style={{ color: '#86868b' }}>{formatDate(r.date, lang)}</span>
                </div>
                <p style={{ fontSize: 14, color: '#424245', margin: '4px 0 0', whiteSpace: 'pre-line' }}>{r.text}</p>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: '#f5f5f7', minWidth: 0, containerType: 'inline-size' }}>
      <div style={{ fontSize: 13, color: '#6e6e73' }}>{label}</div>
      <div className="tile-value" style={{ fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', marginTop: 4, whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  )
}

const sectionTitle: React.CSSProperties = { fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: '36px 0 14px' }

// The customer's documents and the admin's decision: verify, or reject with a reason.
function VerificationPanel({ data, onChange }: { data: Detail; onChange: () => void }) {
  const { lang, t } = useI18n()
  const v = t.verificationAdmin
  const c = data.customer
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const time = (iso: string) => new Date(iso).toLocaleString(lang, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  const age = c.birthDate ? Math.floor((Date.now() - new Date(`${c.birthDate}T00:00:00Z`).getTime()) / (365.25 * 86_400_000)) : null

  async function decide(action: 'verify' | 'reject') {
    if (action === 'verify' && !confirm(v.verifyAsk)) return
    setBusy(true)
    try {
      await api(`/admin/customers/${c.id}/${action}`, action === 'reject' ? { body: { note: note.trim() } } : { method: 'POST' })
      setRejecting(false)
      setNote('')
      onChange()
      refreshAwaitingCount()
    } catch {
      alert(v.error)
    }
    setBusy(false)
  }

  return (
    <>
      <h2 style={sectionTitle}>{v.section}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <VerificationBadge status={c.verificationStatus} />
        {c.verificationStatus === 'PENDING' && c.verificationSubmittedAt && <span style={{ fontSize: 13, color: '#6e6e73' }}>{v.submitted(time(c.verificationSubmittedAt))}</span>}
        {c.verificationStatus === 'VERIFIED' && c.verifiedAt && <span style={{ fontSize: 13, color: '#6e6e73' }}>{v.verifiedAt(time(c.verifiedAt))}</span>}
      </div>
      {c.verificationStatus === 'REJECTED' && c.verificationNote && <p style={{ fontSize: 14, color: '#b3261e', margin: '8px 0 0' }}>{c.verificationNote}</p>}
      <p style={{ fontSize: 14, color: '#424245', margin: '10px 0 0' }}>
        {v.phone}: {c.phone ? <a href={`tel:${c.phone}`} style={{ color: '#0071e3', textDecoration: 'none' }}>{formatPhone(c.phone)}</a> : '—'} · {v.birthDate}: {c.birthDate ? `${formatDate(c.birthDate, lang)} (${v.age(age!)})` : '—'}
      </p>

      {data.documents.length === 0 ? (
        <p style={{ fontSize: 14, color: '#6e6e73' }}>{v.noDocuments}</p>
      ) : (
        <div className="document-grid" style={{ marginTop: 14 }}>
          {data.documents.map(d => (
            <a key={d.id} href={documentUrl(d.id)} target="_blank" rel="noreferrer" style={{ display: 'block', border: '1px solid #e5e5ea', borderRadius: 14, overflow: 'hidden', textDecoration: 'none' }}>
              <div style={{ aspectRatio: '4/3', background: '#f5f5f7' }}>
                {d.mimeType.startsWith('image/') ? (
                  <img src={documentUrl(d.id)} alt={t.profile.docTypes[d.type]} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 15, fontWeight: 600, color: '#b3261e' }}>PDF</span>
                )}
              </div>
              <div style={{ padding: '8px 12px', fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>
                {t.profile.docTypes[d.type]}
                <div style={{ fontSize: 12, fontWeight: 400, color: '#86868b' }}>{new Date(d.createdAt).toLocaleDateString(lang)}</div>
              </div>
            </a>
          ))}
        </div>
      )}

      {c.active && (
        <div style={{ marginTop: 16 }}>
          {rejecting ? (
            <form onSubmit={e => { e.preventDefault(); decide('reject') }} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73' }}>
                {v.rejectNote}
                <textarea required minLength={3} rows={3} value={note} onChange={e => setNote(e.target.value)} autoFocus style={{ fontSize: 15, padding: '10px 12px', border: '1px solid #d2d2d7', borderRadius: 12, fontFamily: 'inherit', resize: 'vertical' }} />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={busy} style={{ ...actionButton, background: '#d70015', color: '#fff' }}>{v.rejectSubmit}</button>
                <button type="button" onClick={() => setRejecting(false)} style={{ ...actionButton, background: '#f5f5f7', color: '#1d1d1f' }}>{v.cancel}</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {c.verificationStatus !== 'VERIFIED' && (
                <button onClick={() => decide('verify')} disabled={busy || data.documents.length === 0} style={{ ...actionButton, background: '#1b7a35', color: '#fff', opacity: data.documents.length ? 1 : 0.4 }}>
                  ✓ {v.verify}
                </button>
              )}
              {c.verificationStatus !== 'REJECTED' && c.verificationStatus !== 'UNVERIFIED' && (
                <button onClick={() => setRejecting(true)} style={{ ...actionButton, background: '#fff', color: '#d70015', border: '1px solid #f0c4c4' }}>
                  {c.verificationStatus === 'VERIFIED' ? v.revoke : v.reject}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

const actionButton: React.CSSProperties = { fontSize: 14, fontWeight: 500, padding: '10px 18px', borderRadius: 980, border: 'none', cursor: 'pointer' }

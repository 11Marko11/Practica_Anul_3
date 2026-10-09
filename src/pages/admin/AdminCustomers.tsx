import { useEffect, useState } from 'react'
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
  createdAt: string
  deletedAt: string | null
  bookings: number
  completed: number
  spent: number
  lastBookingAt: string | null
  reviews: number
}
type Detail = {
  customer: Pick<Customer, 'id' | 'name' | 'email' | 'active' | 'createdAt' | 'deletedAt' | 'spent'> & { refunded: number }
  bookings: Booking[]
  reviews: { id: string; rating: number; text: string; date: string; car: { slug: string; brand: string; model: string } }[]
}

const FILTERS = ['all', 'active', 'deleted'] as const

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
  const list = (customers ?? []).filter(
    x => (filter === 'all' || (filter === 'active') === x.active) && (!q || x.name.toLowerCase().includes(q) || x.email.toLowerCase().includes(q)),
  )
  const count = (f: (typeof FILTERS)[number]) => (customers ?? []).filter(x => f === 'all' || (f === 'active') === x.active).length

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
                {c.filters[f]} {customers && <span style={{ opacity: 0.7 }}>({count(f)})</span>}
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

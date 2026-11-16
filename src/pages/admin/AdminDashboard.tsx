import { useEffect, useState, type ReactNode } from 'react'
import { same, useLivePoll } from '../../lib/livePoll'
import { Link } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { Money } from '../../components/Money'
import { useI18n } from '../../i18n/I18nContext'
import { api } from '../../lib/api'
import { useAwaitingCount } from '../../lib/adminNotifications'
import type { Booking } from '../../lib/bookings'
import { AdminGuard } from './AdminGuard'
import { AdminTabs } from './AdminTabs'

type Dashboard = {
  revenueThisMonth: number
  bookingsThisMonth: number
  cars: { active: number; hidden: number }
  users?: { total: number; customers: number; hosts: number }
  customers?: number // the same total, from an API that has not been updated yet
  reviews: { count: number; average: number | null }
  awaiting: Booking[]
  verifications: { id: string; name: string; email: string; verificationSubmittedAt: string | null }[]
  carReviews?: { id: number; slug: string; brand: string; model: string; year: number; host: string; reviewSubmittedAt: string | null }[]
  hostApplications?: { id: string; name: string; email: string; hostApplicationSubmittedAt: string | null }[]
  upcoming: Booking[]
  recent: Booking[]
}

// The admin's home: what needs attention now, the month's numbers, and links to everything else.
export function AdminDashboard() {
  return (
    <AdminGuard>
      <DashboardContent />
    </AdminGuard>
  )
}

function DashboardContent() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [data, setData] = useState<Dashboard | null>(null)
  const [failed, setFailed] = useState(false)
  // Reload when a new paid booking arrives (the notification count changes).
  const awaitingCount = useAwaitingCount(true)

  async function load() {
    try {
      setData(await api<Dashboard>('/admin/dashboard'))
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }

  useEffect(() => {
    load()
  }, [awaitingCount])
  useLivePoll(() => {
    api<Dashboard>('/admin/dashboard').then(next => setData(prev => (same(prev, next) ? prev : next))).catch(() => {})
  }, 30_000)

  const d = t.dashboard

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '40px 24px 28px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <AdminTabs />
          <p style={{ fontSize: 14, color: '#a1a1a6', margin: '0 0 6px' }}>{d.hello(user?.name.split(' ')[0] ?? '')}</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{d.title}</h1>
        </div>
      </div>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 96px' }}>
        {failed && !data && <p style={{ fontSize: 15, color: '#d70015' }}>{d.loadError}</p>}

        <div className="dashboard-tiles">
          <Tile label={d.tiles.awaiting} value={data ? String(data.awaiting.length) : '—'} />
          <Tile wide to="/admin/transactions" label={d.tiles.revenue} value={data ? <Money value={data.revenueThisMonth} /> : '—'} sub={data ? `${d.tiles.revenueSub(data.bookingsThisMonth)} · ${t.transactions.seeAll}` : undefined} />
          <Tile to="/admin/cars" label={d.tiles.cars} value={data ? String(data.cars.active) : '—'} sub={data ? d.tiles.carsSub(data.cars.hidden) : undefined} />
          <Tile to="/admin/users" label={d.tiles.users} value={data ? String(data.users?.total ?? data.customers ?? 0) : '—'} sub={data?.users ? d.tiles.usersSub(data.users.customers, data.users.hosts) : undefined} />
        </div>

      </main>
    </div>
  )
}

function Tile({ label, value, sub, to, highlight, wide }: { label: string; value: ReactNode; sub?: string; to?: string; highlight?: boolean; wide?: boolean }) {
  const body = (
    <>
      <div style={{ fontSize: 13, color: highlight ? '#0058b8' : '#6e6e73' }}>{label}</div>
      <div className="tile-value" style={{ fontWeight: 600, letterSpacing: '-0.03em', color: highlight ? '#0058b8' : '#1d1d1f', margin: '6px 0 2px', whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#86868b' }}>{sub}</div>}
    </>
  )
  // containerType lets the amount shrink with the tile's width (see .tile-value in index.css).
  const style: React.CSSProperties = { display: 'block', padding: '18px 20px', borderRadius: 18, background: highlight ? '#e6f0ff' : '#f5f5f7', textDecoration: 'none', minWidth: 0, containerType: 'inline-size' }
  const className = wide ? 'tile-wide' : undefined
  return to ? <Link to={to} className={className} style={style}>{body}</Link> : <div className={className} style={style}>{body}</div>
}

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
import { IncomeChart } from '../../components/IncomeChart'

type Stats = {
  income: { month: string; commission: number; turnover: number }[]
  unpaid: { amount: number; hosts: number }
  topHosts: { id: number; name: string; rate: number | null; turnover: number; commission: number; bookings: number }[]
  occupancy: { rented: number; listed: number }
  growth: { users: number; hostRequests: number; cars: number }
}

type Dashboard = {
  stats?: Stats // missing from an API older than the site
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

        {data?.stats && <Statistics stats={data.stats} />}

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

// Statistics under the tiles: income by month, commission not collected, cars rented now,
// this month's growth and the hosts who earned most this month.
function Statistics({ stats }: { stats: Stats }) {
  const { t } = useI18n()
  const s = t.stats
  const pct = stats.occupancy.listed ? Math.round((stats.occupancy.rented / stats.occupancy.listed) * 100) : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
      <section style={card}>
        <h2 style={cardTitle}>{s.incomeTitle}</h2>
        <p style={{ fontSize: 13, color: '#6e6e73', margin: '4px 0 18px' }}>{s.incomeHint}</p>
        <IncomeChart data={stats.income} />
      </section>

      <div className="stats-row">
        <Link to="/admin/transactions" style={{ ...card, textDecoration: 'none', background: stats.unpaid.amount ? '#fff4e0' : '#f5f5f7' }}>
          <div style={{ fontSize: 13, color: stats.unpaid.amount ? '#9a5b00' : '#6e6e73' }}>{s.unpaidTitle}</div>
          <div style={bigValue}><Money value={stats.unpaid.amount} /></div>
          <div style={{ fontSize: 12, color: '#86868b' }}>{s.unpaidSub(stats.unpaid.hosts)} · {s.seeTransactions} →</div>
        </Link>
        <div style={{ ...card, background: '#f5f5f7' }}>
          <div style={{ fontSize: 13, color: '#6e6e73' }}>{s.occupancyTitle}</div>
          <div style={bigValue}>{s.occupancyOf(stats.occupancy.rented, stats.occupancy.listed)}</div>
          <div aria-hidden style={{ height: 6, borderRadius: 3, background: '#e5e5ea', overflow: 'hidden', margin: '2px 0 6px' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: '#0071e3', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 12, color: '#86868b' }}>{s.occupancySub(pct)}</div>
        </div>
        <div style={{ ...card, background: '#f5f5f7' }}>
          <div style={{ fontSize: 13, color: '#6e6e73' }}>{s.growthTitle}</div>
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, color: '#1d1d1f' }}>
            <li><strong>+</strong> {s.growthUsers(stats.growth.users)}</li>
            <li><strong>+</strong> {s.growthRequests(stats.growth.hostRequests)}</li>
            <li><strong>+</strong> {s.growthCars(stats.growth.cars)}</li>
          </ul>
        </div>
      </div>

      <section style={card}>
        <h2 style={{ ...cardTitle, marginBottom: 12 }}>{s.topTitle}</h2>
        {stats.topHosts.length === 0 ? (
          <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>{s.topEmpty}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="income-table" style={{ minWidth: 520 }}>
              <thead><tr><th>#</th><th>{s.host}</th><th className="num">{s.bookings}</th><th className="num">{s.turnover}</th><th className="num">{s.commission}</th></tr></thead>
              <tbody>
                {stats.topHosts.map((h, i) => (
                  <tr key={h.id}>
                    <td style={{ color: '#86868b' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>
                      <Link to={`/hosts/${h.id}`} style={{ color: '#1d1d1f', textDecoration: 'none' }}>{h.name}</Link>
                      {h.rate !== null && <span style={{ fontWeight: 400, color: '#86868b' }}> · {h.rate}%</span>}
                    </td>
                    <td className="num">{h.bookings}</td>
                    <td className="num"><Money value={h.turnover} /></td>
                    <td className="num" style={{ fontWeight: 600 }}><Money value={h.commission} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

const card: React.CSSProperties = { display: 'block', padding: '18px 20px', borderRadius: 18, border: '1px solid #e5e5ea', minWidth: 0 }
const cardTitle: React.CSSProperties = { fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: 0 }
const bigValue: React.CSSProperties = { fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '6px 0 4px' }

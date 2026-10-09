import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { StatusBadge } from '../../components/BookingCard'
import { useI18n } from '../../i18n/I18nContext'
import { api, ApiError } from '../../lib/api'
import { refreshAwaitingCount, useAwaitingCount } from '../../lib/adminNotifications'
import { adminBookingAction, type Booking } from '../../lib/bookings'
import { fmt, formatDate } from '../../lib/rental'
import { AdminGuard } from './AdminGuard'
import { AdminTabs } from './AdminTabs'

type Dashboard = {
  revenueThisMonth: number
  bookingsThisMonth: number
  cars: { active: number; hidden: number }
  customers: number
  reviews: { count: number; average: number | null }
  awaiting: Booking[]
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
  const { lang, t } = useI18n()
  const [data, setData] = useState<Dashboard | null>(null)
  const [failed, setFailed] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
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

  async function act(b: Booking, action: 'confirm' | 'reject') {
    const question = action === 'confirm' ? t.adminBookings.confirmAsk(fmt(b.total)) : t.adminBookings.rejectAsk
    if (!confirm(question)) return
    setBusyId(b.id)
    try {
      await adminBookingAction(b.id, action)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown'
      alert(code in t.adminBookings.errors ? t.adminBookings.errors[code as keyof typeof t.adminBookings.errors] : t.adminBookings.errors.unknown)
    }
    setBusyId(null)
    await Promise.all([load(), refreshAwaitingCount()])
  }

  const d = t.dashboard
  const dates = (b: Booking) => `${formatDate(b.pickupDate, lang)} – ${formatDate(b.returnDate, lang)}`
  const time = (iso: string) => new Date(iso).toLocaleString(lang, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

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
          <Tile to="/admin/bookings" label={d.tiles.awaiting} value={data ? String(data.awaiting.length) : '—'} highlight={!!data?.awaiting.length} />
          <Tile wide label={d.tiles.revenue} value={data ? fmt(data.revenueThisMonth) : '—'} sub={data ? d.tiles.revenueSub(data.bookingsThisMonth) : undefined} />
          <Tile to="/admin/cars" label={d.tiles.cars} value={data ? String(data.cars.active) : '—'} sub={data ? d.tiles.carsSub(data.cars.hidden) : undefined} />
          <Tile label={d.tiles.customers} value={data ? String(data.customers) : '—'} />
          <Tile
            label={d.tiles.reviews}
            value={data?.reviews.average != null ? `★ ${data.reviews.average.toFixed(1)}` : '—'}
            sub={data ? d.tiles.reviewsSub(data.reviews.count) : undefined}
          />
        </div>

        <div className="dashboard-columns">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
            <Panel title={d.attention} link="/admin/bookings">
              {data?.awaiting.length === 0 && <Empty>✓ {d.allClear}</Empty>}
              {data?.awaiting.map(b => (
                <Row key={b.id}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <RowTitle>{b.car.brand} {b.car.model} · {fmt(b.total)}</RowTitle>
                    <RowText>{b.customer?.name} · <a href={`tel:${b.phone.replace(/[^+\d]/g, '')}`} style={linkStyle}>{b.phone}</a></RowText>
                    <RowText>{dates(b)} · {b.handover === 'DELIVERY' ? `${d.delivery}: ${b.deliveryAddress}` : d.pickup}</RowText>
                    {b.holdExpiresAt && <RowText color="#9a5b00">{t.adminBookings.holdUntil(time(b.holdExpiresAt))}</RowText>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <SmallAction primary disabled={busyId === b.id} onClick={() => act(b, 'confirm')}>{t.adminBookings.confirm}</SmallAction>
                    <SmallAction disabled={busyId === b.id} onClick={() => act(b, 'reject')}>{t.adminBookings.reject}</SmallAction>
                  </div>
                </Row>
              ))}
            </Panel>

            <Panel title={d.upcoming}>
              {data?.upcoming.length === 0 && <Empty>{d.noUpcoming}</Empty>}
              {data?.upcoming.map(b => (
                <Row key={b.id}>
                  <div style={{ width: 92, flexShrink: 0, fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{formatDate(b.pickupDate, lang)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <RowTitle>{b.car.brand} {b.car.model}</RowTitle>
                    <RowText>{b.customer?.name} · <a href={`tel:${b.phone.replace(/[^+\d]/g, '')}`} style={linkStyle}>{b.phone}</a></RowText>
                    <RowText>{b.handover === 'DELIVERY' ? `${d.delivery}: ${b.deliveryAddress}` : d.pickup}</RowText>
                  </div>
                </Row>
              ))}
            </Panel>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
            <Panel title={d.quick}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <QuickLink to="/admin/cars/new" primary>{d.addCar}</QuickLink>
                <QuickLink to="/admin/pages">{d.editPages}</QuickLink>
                <QuickLink to="/" external>{d.viewSite}</QuickLink>
              </div>
            </Panel>

            <Panel title={d.recent} link="/admin/bookings">
              {data?.recent.length === 0 && <Empty>{d.noRecent}</Empty>}
              {data?.recent.map(b => (
                <Row key={b.id}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <RowTitle>{b.car.brand} {b.car.model}</RowTitle>
                    <RowText>{b.customer?.name} · {fmt(b.total)}</RowText>
                    <div style={{ marginTop: 4 }}><StatusBadge status={b.status} /></div>
                  </div>
                </Row>
              ))}
            </Panel>
          </div>
        </div>
      </main>
    </div>
  )
}

function Tile({ label, value, sub, to, highlight, wide }: { label: string; value: string; sub?: string; to?: string; highlight?: boolean; wide?: boolean }) {
  const body = (
    <>
      <div style={{ fontSize: 13, color: highlight ? '#0058b8' : '#6e6e73' }}>{label}</div>
      <div className="tile-value" style={{ fontWeight: 600, letterSpacing: '-0.03em', color: highlight ? '#0058b8' : '#1d1d1f', margin: '6px 0 2px', whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#86868b' }}>{sub}</div>}
    </>
  )
  const style: React.CSSProperties = { display: 'block', padding: '18px 20px', borderRadius: 18, background: highlight ? '#e6f0ff' : '#f5f5f7', textDecoration: 'none', minWidth: 0 }
  const className = wide ? 'tile-wide' : undefined
  return to ? <Link to={to} className={className} style={style}>{body}</Link> : <div className={className} style={style}>{body}</div>
}

function Panel({ title, link, children }: { title: string; link?: string; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <h2 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: 0 }}>{title}</h2>
        {link && <Link to={link} style={{ ...linkStyle, fontSize: 14 }}>{t.dashboard.seeAll}</Link>}
      </div>
      <div style={{ borderTop: '1px solid #f0f0f0' }}>{children}</div>
    </section>
  )
}

const linkStyle: React.CSSProperties = { color: '#0071e3', textDecoration: 'none' }

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>{children}</div>
}

function RowTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{children}</div>
}

function RowText({ children, color = '#6e6e73' }: { children: ReactNode; color?: string }) {
  return <div style={{ fontSize: 13, color, marginTop: 2, overflowWrap: 'anywhere' }}>{children}</div>
}

function Empty({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 14, color: '#6e6e73', margin: 0, padding: '16px 0' }}>{children}</p>
}

function SmallAction({ primary, disabled, onClick, children }: { primary?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ fontSize: 13, fontWeight: 500, padding: '8px 14px', borderRadius: 980, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, border: primary ? 'none' : '1px solid #d2d2d7', background: primary ? '#1d1d1f' : '#fff', color: primary ? '#fff' : '#1d1d1f' }}
    >
      {children}
    </button>
  )
}

function QuickLink({ to, primary, external, children }: { to: string; primary?: boolean; external?: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      target={external ? '_blank' : undefined}
      style={{ display: 'block', fontSize: 14, fontWeight: 500, padding: '12px 16px', borderRadius: 12, textDecoration: 'none', background: primary ? '#1d1d1f' : '#f5f5f7', color: primary ? '#fff' : '#1d1d1f' }}
    >
      {children}
    </Link>
  )
}

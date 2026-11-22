import { useEffect, useState } from 'react'
import { PhoneInput } from '../../components/PhoneInput'
import type { VerificationStatus } from '../../auth/AuthContext'
import { VerificationBadge } from '../Profile'
import { refreshAwaitingCount } from '../../lib/adminNotifications'
import { documentUrl, hasRequiredDocuments, type IdentityDocument } from '../../lib/profile'
import { formatPhone } from '../../lib/phone'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { BookingCard } from '../../components/BookingCard'
import { Money } from '../../components/Money'
import { pageFrom, Pagination } from '../../components/Pagination'
import { useI18n } from '../../i18n/I18nContext'
import { api, ApiError } from '../../lib/api'
import { createHostWithAccount, deleteHost, updateCommission, updateHostAccount, useAdminHosts, type AccountInput, type AdminHost, type HostInput } from '../../lib/hosts'
import type { Booking } from '../../lib/bookings'
import { formatDate } from '../../lib/rental'
import { useUrlParams } from '../../lib/useUrlParams'
import { useKeepHeight } from '../../lib/useKeepHeight'
import { AdminGuard } from './AdminGuard'
import { AdminTabs } from './AdminTabs'
import { Avatar } from '../../components/Avatar'
import { CountBadge } from '../../components/CountBadge'
import { AccountEditor, CommissionSelect, control, field, HostEditor } from './HostForms'
import { DocumentCards } from '../../components/PrivateDocuments'
import { hostDocumentUrl, type HostApplicationStatus, type HostDocumentType, type PrivateDocument } from '../../lib/privateDocuments'

type Customer = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  active: boolean
  verificationStatus: VerificationStatus
  verificationSubmittedAt: string | null
  createdAt: string
  deletedAt: string | null
  lastSeenAt: string | null // when they last used the site while signed in
  bookings: number
  completed: number
  spent: number
  lastBookingAt: string | null
  reviews: number
  host: { id: number; name: string } | null
  hostApplicationStatus: HostApplicationStatus | null
}
type Detail = {
  customer: Pick<Customer, 'id' | 'name' | 'email' | 'avatarUrl' | 'active' | 'createdAt' | 'deletedAt' | 'spent' | 'verificationStatus' | 'verificationSubmittedAt' | 'host'> & {
    refunded: number
    phone: string | null
    birthDate: string | null
    verificationNote: string | null
    verifiedAt: string | null
    hasPassword: boolean
  }
  documents: IdentityDocument[]
  hostApplication: { status: HostApplicationStatus | null; message: string | null; note: string | null; submittedAt: string | null; documents: PrivateDocument<HostDocumentType>[] }
  bookings: Booking[]
  reviews: { id: string; rating: number; text: string; date: string; car: { slug: string; brand: string; model: string } }[]
}

// One row of the list: a user account (customer, or customer with the host role), or a host
// that has no account yet.
type Entry = { key: string; to: string; name: string; email: string; phone: string; createdAt: string; customer: Customer | null; host: AdminHost | null }

const ROLES = ['all', 'customer', 'host'] as const
const STATUSES = ['all', 'pending', 'hostRequests', 'active', 'deleted'] as const
type Role = (typeof ROLES)[number]
type Status = (typeof STATUSES)[number]
const PAGE_SIZE = 20
const SORTS = ['newest', 'name', 'rating'] as const
type Sort = (typeof SORTS)[number]
// Hosts by the average rating of their cars (more reviews first on a tie); people without one last.
const COMPARE: Record<Sort, (a: Entry, b: Entry) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  name: (a, b) => a.name.localeCompare(b.name),
  rating: (a, b) => (b.host?.rating ?? -1) - (a.host?.rating ?? -1) || (b.host?.reviews ?? 0) - (a.host?.reviews ?? 0) || a.name.localeCompare(b.name),
}

const roleMatches = (r: Role, e: Entry) => r === 'all' || (r === 'host') === !!e.host
const statusMatches = (s: Status, e: Entry) => {
  const active = e.customer ? e.customer.active : true
  if (s === 'all') return true
  if (s === 'pending') return active && e.customer?.verificationStatus === 'PENDING'
  if (s === 'hostRequests') return active && e.customer?.hostApplicationStatus === 'PENDING'
  if (s === 'deleted') return !active
  // Active: used the site (signed in) within the last day.
  return active && !!e.customer?.lastSeenAt && Date.now() - new Date(e.customer.lastSeenAt).getTime() <= DAY_MS
}
const DAY_MS = 86_400_000

// /admin/users lists customers and hosts together, filtered by role and status.
// /admin/users/:id is one user account; /admin/users/host/:hostId a host without an account.
export function AdminUsers() {
  const { id, hostId } = useParams()
  return (
    <AdminGuard>
      {hostId ? <HostOnlyDetail key={hostId} hostId={Number(hostId)} /> : id ? <UserDetail key={id} id={id} /> : <UserList />}
    </AdminGuard>
  )
}

function Header({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div style={{ padding: '40px 24px 28px', background: '#1c1c1e' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <AdminTabs />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05, overflowWrap: 'anywhere' }}>{title}</h1>
          {children}
        </div>
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

function Chip({ on, onClick, title, children }: { on: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={on}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 14px', borderRadius: 980, border: '1px solid', borderColor: on ? '#1d1d1f' : '#d2d2d7', background: on ? '#1d1d1f' : 'transparent', color: on ? '#fff' : '#6e6e73', cursor: 'pointer', whiteSpace: 'nowrap' }}
    >
      {children}
    </button>
  )
}

function UserList() {
  const { lang, t } = useI18n()
  const c = t.customers
  const u = t.users
  const [customers, setCustomers] = useState<Customer[] | null>(null)
  const { hosts, reload: reloadHosts } = useAdminHosts()
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()

  const { params, edit } = useUrlParams()
  // Typing in the search doesn't make the page jump up as the list gets shorter.
  const keep = useKeepHeight<HTMLElement>()
  const role: Role = ROLES.includes(params.get('role') as Role) ? (params.get('role') as Role) : 'all'
  const status: Status = STATUSES.includes(params.get('status') as Status) ? (params.get('status') as Status) : 'all'
  const query = params.get('q') ?? ''
  const sort: Sort = SORTS.includes(params.get('sort') as Sort) ? (params.get('sort') as Sort) : 'newest'
  const set = (key: string, value: string) => edit(p => { if (value && value !== 'all') p.set(key, value); else p.delete(key); p.delete('page') })

  useEffect(() => {
    api<{ customers: Customer[] }>('/admin/customers').then(r => setCustomers(r.customers)).catch(() => setCustomers([]))
  }, [])

  const loaded = customers && hosts
  const hostById = new Map((hosts ?? []).map(h => [h.id, h]))
  const entries: Entry[] = loaded
    ? [
        ...customers.map(x => {
          const host = x.host ? hostById.get(x.host.id) ?? null : null
          return { key: x.id, to: `/admin/users/${x.id}`, name: x.name, email: x.email, phone: host?.phone ?? '', createdAt: x.createdAt, customer: x, host }
        }),
        ...hosts.filter(h => !h.account).map(h => ({ key: `host-${h.id}`, to: `/admin/users/host/${h.id}`, name: h.name, email: '', phone: h.phone ?? '', createdAt: h.createdAt, customer: null, host: h })),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : []

  const q = query.trim().toLowerCase()
  const searched = entries.filter(e => !q || `${e.name} ${e.email} ${e.phone} ${e.host?.name ?? ''}`.toLowerCase().includes(q))
  const list = searched.filter(e => roleMatches(role, e) && statusMatches(status, e)).sort(COMPARE[sort])
  const pages = Math.ceil(list.length / PAGE_SIZE)
  const page = pageFrom(params, pages)
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  function goToPage(n: number) {
    edit(p => (n > 1 ? p.set('page', String(n)) : p.delete('page')), { push: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function addHost(input: HostInput & AccountInput & { commissionRate?: number }) {
    const { id } = await createHostWithAccount({ ...input, password: input.password ?? '' })
    const r = await reloadHosts()
    const account = r?.find(h => h.id === id)?.account
    setAdding(false)
    if (account) navigate(`/admin/users/${account.id}`)
  }

  return (
    <div style={{ paddingTop: 64 }}>
      <Header title={u.title}>
        <button onClick={() => setAdding(true)} style={{ fontSize: 15, fontWeight: 500, padding: '12px 24px', borderRadius: 980, background: '#f5f5f7', color: '#1c1c1e', border: 'none', cursor: 'pointer' }}>
          {t.adminHosts.add}
        </button>
      </Header>
      <main ref={keep.ref} style={{ minHeight: keep.minHeight, maxWidth: 1200, margin: '0 auto', padding: '24px 24px 96px' }}>
        {adding && (
          <div style={{ padding: 20, borderRadius: 16, background: '#f5f5f7', marginBottom: 20 }}>
            <HostEditor withAccount onSave={addHost} onCancel={() => setAdding(false)} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          value={query}
          onChange={e => set('q', e.target.value)}
          placeholder={u.search}
          aria-label={u.search}
          style={{ flex: '1 1 260px', minWidth: 0, boxSizing: 'border-box', fontSize: 15, padding: '10px 16px', borderRadius: 980, border: '1px solid #d2d2d7', fontFamily: 'inherit', outline: 'none' }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6e6e73' }}>
          {u.sortBy}
          <select value={sort} onChange={e => set('sort', e.target.value === 'newest' ? '' : e.target.value)} style={{ ...control }}>
            {SORTS.map(o => <option key={o} value={o}>{u.sorts[o]}</option>)}
          </select>
        </label>
        </div>
        <div className="user-filters">
          <div className="user-filter-group" role="group" aria-label={u.roleLabel}>
            <span className="user-filter-label">{u.roleLabel}</span>
            {ROLES.map(r => (
              <Chip key={r} on={role === r} onClick={() => set('role', r)}>
                {u.roles[r]} {loaded && <span style={{ opacity: 0.7 }}>({searched.filter(e => roleMatches(r, e) && statusMatches(status, e)).length})</span>}
              </Chip>
            ))}
          </div>
          <div className="user-filter-group" role="group" aria-label={u.statusLabel}>
            <span className="user-filter-label">{u.statusLabel}</span>
            {STATUSES.map(s => {
              const n = searched.filter(e => statusMatches(s, e) && roleMatches(role, e)).length
              // What waits for the admin stands out with a red counter, like the tabs.
              const waiting = (s === 'pending' || s === 'hostRequests') && n > 0
              return (
                <Chip key={s} on={status === s} onClick={() => set('status', s)} title={s === 'active' ? c.activeHint : undefined}>
                  {s === 'pending' ? t.verificationAdmin.filter : s === 'hostRequests' ? t.hostApply.admin.filter : c.filters[s]}
                  {loaded && (waiting ? <CountBadge n={n} /> : <span style={{ opacity: 0.7 }}>({n})</span>)}
                </Chip>
              )
            })}
          </div>
        </div>

        {!loaded && <p style={{ fontSize: 15, color: '#6e6e73', marginTop: 24 }}>{t.bookings.loading}</p>}
        {loaded && list.length === 0 && <p style={{ fontSize: 15, color: '#6e6e73', padding: '32px 0' }}>{u.empty}</p>}

        {/* One card per person: a large photo and name, their badges and contact, their numbers, then "Edit". */}
        <ul className="user-grid">
          {shown.map(e => {
            const x = e.customer
            const active = x ? x.active : true
            return (
              <li key={e.key} className="user-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar name={e.name} url={x?.avatarUrl} size={64} background={!active ? '#c7c7cc' : e.host ? '#0071e3' : '#1c1c1e'} />
                  <div style={{ minWidth: 0 }}>
                    <Link to={e.to} className="user-row-link" style={{ display: 'block', fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: '#1d1d1f', textDecoration: 'none', overflowWrap: 'anywhere' }}>{e.name}</Link>
                    <div style={{ fontSize: 14, color: '#6e6e73', overflowWrap: 'anywhere', marginTop: 2 }}>
                      {e.email || <span style={{ color: '#b25000' }}>{t.adminHosts.noAccount}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
                  {e.host ? <HostBadge /> : <CustomerBadge />}
                  {x && !x.active && <StatusPill active={false} />}
                  {x?.active && <VerificationBadge status={x.verificationStatus} />}
                  {x?.active && x.hostApplicationStatus === 'PENDING' && !e.host && <RequestBadge />}
                </div>
                {/* Their numbers: the hosts' car rating, or what the customer spent. */}
                <div className="user-card__stats">
                  {e.host ? (
                    <>
                      <div><strong>{e.host.rating !== null ? `★ ${e.host.rating.toFixed(1)}` : '—'}</strong><span>{u.carsRating} · {c.reviewsCount(e.host.reviews)}</span></div>
                      <div><strong>{e.host.cars.filter(car => car.status !== 'REMOVED').length}</strong><span>{t.adminHosts.cars(e.host.cars.filter(car => car.status !== 'REMOVED').length).replace(/^\d+\s*/, '')} · {t.common.trips(e.host.trips)}</span></div>
                    </>
                  ) : x && (
                    <>
                      <div><strong><Money value={x.spent} /></strong><span>{c.bookings(x.bookings)}</span></div>
                      <div><strong>{x.reviews}</strong><span>{c.reviewsCount(x.reviews).replace(/^\d+\s*/, '')}</span></div>
                    </>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#86868b', marginTop: 12, lineHeight: 1.5 }}>
                  {e.host
                    ? <>{e.host.name !== e.name && <>{u.hostAs(e.host.name)} · </>}{t.commission.label}: {e.host.commissionRate}%</>
                    : x && (x.active ? c.since(formatDate(x.createdAt.slice(0, 10), lang)) : c.deletedOn(formatDate(x.deletedAt!.slice(0, 10), lang)))}
                  {x?.lastBookingAt && <div>{c.lastBooking(formatDate(x.lastBookingAt.slice(0, 10), lang))}</div>}
                  {x?.active && x.lastSeenAt && <div>{c.lastSeen(new Date(x.lastSeenAt).toLocaleString(lang, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}</div>}
                </div>
                {active && <Link to={`${e.to}?edit=1`} className="btn-action btn-action--primary user-card__edit">{u.edit}</Link>}
              </li>
            )
          })}
        </ul>
        <Pagination page={page} pages={pages} total={list.length} pageSize={PAGE_SIZE} onChange={goToPage} />
      </main>
    </div>
  )
}

function UserDetail({ id }: { id: string }) {
  const { lang, t } = useI18n()
  const c = t.customers
  const u = t.users
  const [data, setData] = useState<Detail | null>(null)
  const [missing, setMissing] = useState(false)
  const { hosts, reload: reloadHosts } = useAdminHosts()
  const navigate = useNavigate()

  const load = () => api<Detail>(`/admin/customers/${id}`).then(setData)
  useEffect(() => {
    load().catch(() => setMissing(true))
  }, [id])

  const date = (iso: string) => formatDate(iso.slice(0, 10), lang)
  const host = data?.customer.host ? hosts?.find(h => h.id === data.customer.host!.id) ?? null : null
  const reloadAll = () => Promise.all([load(), reloadHosts()])

  return (
    <div style={{ paddingTop: 64 }}>
      <Header title={data?.customer.name ?? (missing ? u.notFound : '…')} />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 96px' }}>
        {/* Back on the left; the customer's profile (rentals and reviews) on the right. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/admin/users" className="btn-action btn-action--neutral btn-back">{u.back}</Link>
          {data && <Link to={`/customers/${id}`} className="btn-action btn-action--primary">{t.customerProfile.open} →</Link>}
        </div>

        {data && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
              <Avatar name={data.customer.name} url={data.customer.avatarUrl} size={44} />
              {data.customer.host ? <HostBadge /> : <CustomerBadge />}
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

            <AccountPanel data={data} onChange={reloadAll} />

            {host ? (
              <HostCard
                host={host}
                onChanged={reloadAll}
                onDeleted={() => navigate('/admin/users', { replace: true })}
                extra={<HostRolePanel customer={data.customer} cars={host.cars.length} onChange={reloadAll} />}
              />
            ) : (
              !data.customer.host && <HostApplicationPanel data={data} onChange={reloadAll} />
            )}

            <VerificationPanel data={data} onChange={load} />

            <h2 style={sectionTitle}>{c.history}</h2>
            {data.bookings.length === 0 && <p style={{ fontSize: 14, color: '#6e6e73' }}>{c.noBookings}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.bookings.map(b => (
                <BookingCard key={b.id} booking={b}>
                  <div style={{ fontSize: 12, color: '#86868b', marginTop: 8 }}>{t.bookings.bookedOn(date(b.createdAt))} · {formatPhone(b.phone)}</div>
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

// A host without a user account: their host profile, and a form to create the account.
function HostOnlyDetail({ hostId }: { hostId: number }) {
  const { t } = useI18n()
  const u = t.users
  const { hosts, reload } = useAdminHosts()
  const navigate = useNavigate()
  const host = hosts?.find(h => h.id === hostId)

  useEffect(() => {
    if (host?.account) navigate(`/admin/users/${host.account.id}`, { replace: true })
  }, [host?.account?.id])

  async function createAccount(input: AccountInput) {
    await updateHostAccount(hostId, input)
    await reload()
  }

  return (
    <div style={{ paddingTop: 64 }}>
      <Header title={host?.name ?? (hosts ? u.notFound : '…')} />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 96px' }}>
        <Link to="/admin/users" className="btn-action btn-action--neutral btn-back">{u.back}</Link>
        {host && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
              <HostBadge />
              <span style={{ fontSize: 14, color: '#b25000' }}>{t.adminHosts.noAccount}</span>
            </div>
            <h2 style={sectionTitle}>{u.account}</h2>
            <p style={{ fontSize: 14, color: '#6e6e73', margin: '0 0 14px' }}>{u.noAccount}</p>
            <div style={{ padding: 20, borderRadius: 16, background: '#f5f5f7' }}>
              <AccountEditor host={host} onSave={createAccount} onCancel={() => navigate('/admin/users')} />
            </div>
            <HostCard host={host} onChanged={reload} onDeleted={() => navigate('/admin/users', { replace: true })} />
          </>
        )}
      </main>
    </div>
  )
}

// Name, email, phone and password of a user account, with an edit form.
function AccountPanel({ data, onChange }: { data: Detail; onChange: () => Promise<unknown> }) {
  const { t } = useI18n()
  const u = t.users
  const c = data.customer
  const [params, setParams] = useSearchParams()
  const editing = params.get('edit') === '1' && c.active
  const [name, setName] = useState(c.name)
  const [email, setEmail] = useState(c.email)
  const [phone, setPhone] = useState(c.phone ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function open(on: boolean) {
    setName(c.name)
    setEmail(c.email)
    setPhone(c.phone ?? '')
    setPassword('')
    setError('')
    setSaved(false)
    setParams(p => { if (on) p.set('edit', '1'); else p.delete('edit'); return p }, { replace: true })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api(`/admin/customers/${c.id}`, { method: 'PUT', body: { name: name.trim(), email: email.trim(), phone: phone.trim(), ...(password ? { password } : {}) } })
      await onChange()
      setParams(p => { p.delete('edit'); return p }, { replace: true })
      setSaved(true)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : ''
      setError(code === 'email-taken' ? u.errors.emailTaken : code === 'phone-taken' ? u.errors.phoneTaken : code === 'invalid-phone' ? u.errors.invalidPhone : code === 'account-deleted' ? u.errors.deleted : u.errors.unknown)
    }
    setBusy(false)
  }

  const ready = name.trim().length >= 2 && email.trim() && (!password || password.length >= 8)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '36px 0 14px' }}>
        <h2 style={{ ...sectionTitle, margin: 0 }}>{u.account}</h2>
        {c.active && !editing && <button onClick={() => open(true)} className="btn-action btn-action--primary">{u.edit}</button>}
      </div>
      {editing ? (
        <form onSubmit={submit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', padding: 20, borderRadius: 16, background: '#f5f5f7' }}>
          <label style={field}>
            {u.name}
            <input value={name} onChange={e => setName(e.target.value)} autoFocus required minLength={2} maxLength={100} style={{ ...control, borderRadius: 10 }} />
          </label>
          <label style={field}>
            {u.email}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} autoComplete="off" style={{ ...control, borderRadius: 10 }} />
          </label>
          <label style={field}>
            {u.phone}
            <PhoneInput value={phone} onChange={setPhone} style={{ ...control, borderRadius: 10 }} />
          </label>
          <label style={field}>
            {u.newPassword}
            {/* The hint sits above the field, so the field lines up with the others in the row. */}
            <span style={{ fontSize: 11, color: '#86868b', marginTop: -2 }}>{u.passwordHint}</span>
            <input type="text" value={password} onChange={e => setPassword(e.target.value)} minLength={8} maxLength={200} autoComplete="new-password" style={{ ...control, borderRadius: 10 }} />
          </label>
          <div style={{ flexBasis: '100%', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" disabled={busy || !ready} className="btn-action btn-action--primary" style={{ opacity: busy || !ready ? 0.5 : 1 }}>{u.save}</button>
            <button type="button" onClick={() => open(false)} className="btn-action btn-action--neutral">{u.cancel}</button>
          </div>
          {error && <p style={{ flexBasis: '100%', fontSize: 13, color: '#d70015', margin: 0 }}>{error}</p>}
        </form>
      ) : (
        <>
          <dl className="account-facts">
            <dt>{u.name}</dt><dd>{c.name}</dd>
            <dt>{u.email}</dt><dd>{c.email}</dd>
            <dt>{u.phone}</dt><dd>{c.phone ? formatPhone(c.phone) : '—'}</dd>
            <dt>{u.password}</dt><dd>{c.hasPassword ? u.passwordSet : <span style={{ color: '#b25000' }}>{u.passwordNotSet}</span>}</dd>
          </dl>
          {saved && <p style={{ fontSize: 13, color: '#1b7a35', margin: '10px 0 0' }}>✓ {u.saved}</p>}
        </>
      )}
    </>
  )
}

// The host profile tied to a user (or a host without an account): public name and phone,
// rating, trips and cars, with edit and delete.
function HostCard({ host, onDeleted, onChanged, extra }: { host: AdminHost; onDeleted: () => void; onChanged: () => Promise<unknown>; extra?: React.ReactNode }) {
  const { t } = useI18n()
  const h = t.adminHosts
  const u = t.users
  async function remove() {
    if (!confirm(h.deleteAsk(host.name, h.cars(host.cars.length)))) return
    try {
      await deleteHost(host.id)
      onDeleted()
    } catch (err) {
      alert(err instanceof ApiError && err.code === 'host-has-active-bookings' ? h.hasCars : h.error)
    }
  }

  return (
    <>
      <h2 style={sectionTitle}>{u.hostSection}</h2>
      <div style={{ padding: 20, borderRadius: 16, border: '1px solid #e5e5ea' }}>
        <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <Link to={`/hosts/${host.id}`} style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f', textDecoration: 'none' }}>{host.name}</Link>
              {host.phone && <a href={`tel:${host.phone}`} style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none' }}>{formatPhone(host.phone)}</a>}
            </div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 3 }}>
              {host.rating !== null ? `★ ${host.rating.toFixed(1)} (${h.ratings(host.reviews)})` : h.noRatings} · {t.common.trips(host.trips)} · {h.cars(host.cars.length)}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              {host.cars.length === 0 && <span style={{ fontSize: 13, color: '#86868b' }}>{h.noCars}</span>}
              {host.cars.map(car => (
                <Link key={car.id} to={`/cars/${car.slug}`} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 980, background: '#f5f5f7', color: car.status === 'ACTIVE' ? '#1d1d1f' : '#86868b', textDecoration: car.status === 'REMOVED' ? 'line-through' : 'none' }}>
                  {car.brand} {car.model} {car.year}{car.status === 'HIDDEN' && ` · ${h.hidden}`}{car.status === 'REMOVED' && ` · ${t.admin.removed}`}
                </Link>
              ))}
            </div>
            <CommissionEditor host={host} onChanged={onChanged} />
            <div className="row-actions" style={{ marginTop: 16 }}>
              <Link to={`/hosts/${host.id}`} className="btn-action btn-action--neutral">{u.publicProfile}</Link>
              <button onClick={remove} className="btn-action btn-action--danger">{u.deleteHost}</button>
            </div>
        </>
        {extra}
      </div>
    </>
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

  // Verified only with the ID card, the passport and the driving licence (the server checks it too).
  const complete = !!data && hasRequiredDocuments(data.documents)
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
                <button onClick={() => decide('verify')} disabled={busy || !complete} style={{ ...actionButton, background: '#1b7a35', color: '#fff', opacity: complete ? 1 : 0.4 }}>
                  ✓ {v.verify}
                </button>
              )}
              {c.verificationStatus !== 'VERIFIED' && !complete && <p style={{ flexBasis: '100%', fontSize: 13, color: '#6e6e73', margin: 0 }}>{v.needAllDocuments}</p>}
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

function HostBadge() {
  const { t } = useI18n()
  return <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 980, background: '#e8f1fd', color: '#0071e3', whiteSpace: 'nowrap' }}>{t.hostRole.badge}</span>
}

function CustomerBadge() {
  const { t } = useI18n()
  return <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 980, background: '#f2f2f4', color: '#424245', whiteSpace: 'nowrap' }}>{t.users.customerBadge}</span>
}

// Takes the host role away: the host profile and its cars are deleted, the user stays a customer.
function HostRolePanel({ customer, cars, onChange }: { customer: Detail['customer']; cars: number; onChange: () => unknown }) {
  const { t } = useI18n()
  const r = t.hostRole
  const [busy, setBusy] = useState(false)
  if (!customer.host) return null
  const host = customer.host

  async function remove() {
    if (!confirm(r.removeAsk(t.adminHosts.cars(cars)))) return
    setBusy(true)
    try {
      await api(`/admin/customers/${customer.id}/host`, { method: 'DELETE' })
      onChange()
    } catch (err) {
      alert(err instanceof ApiError && err.code === 'host-has-active-bookings' ? r.hasActiveBookings : r.error)
    }
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 18, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
      <p style={{ fontSize: 14, color: '#424245', margin: 0, flex: '1 1 300px' }}>{r.is(host.name)}</p>
      <button onClick={remove} disabled={busy} className="btn-action btn-action--neutral">{r.remove}</button>
    </div>
  )
}

function RequestBadge() {
  const { t } = useI18n()
  return <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 980, background: '#fff4e0', color: '#9a5b00', whiteSpace: 'nowrap' }}>{t.hostApply.admin.badge}</span>
}

// A customer's request to become a host: their message and documents, approve or reject with a reason.
function HostApplicationPanel({ data, onChange }: { data: Detail; onChange: () => Promise<unknown> }) {
  const { lang, t } = useI18n()
  const a = t.hostApply.admin
  const app = data.hostApplication
  const c = data.customer
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [rate, setRate] = useState(10)
  const time = (iso: string) => new Date(iso).toLocaleString(lang, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  async function decide(action: 'approve' | 'reject') {
    if (action === 'approve' && !confirm(a.approveAsk)) return
    setBusy(true)
    try {
      await api(`/admin/customers/${c.id}/host-application/${action}`, { body: action === 'reject' ? { note: note.trim() } : { commissionRate: rate } })
      setRejecting(false)
      setNote('')
      await onChange()
      refreshAwaitingCount()
    } catch {
      alert(a.error)
    }
    setBusy(false)
  }

  return (
    <>
      <h2 style={sectionTitle}>{a.section}</h2>
      {!app.status || app.status === 'APPROVED' ? (
        <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>{a.none}</p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {app.status === 'PENDING' ? <RequestBadge /> : <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 980, background: '#fdeaea', color: '#b3261e' }}>{a.rejected}</span>}
            {app.submittedAt && <span style={{ fontSize: 13, color: '#6e6e73' }}>{t.hostApply.submittedOn(time(app.submittedAt))}</span>}
          </div>
          {app.status === 'REJECTED' && app.note && <p style={{ fontSize: 14, color: '#b3261e', margin: '8px 0 0' }}>{app.note}</p>}
          <p style={{ fontSize: 14, color: '#424245', margin: '10px 0 0' }}>
            {a.identity}: <strong style={{ fontWeight: 600, color: c.verificationStatus === 'VERIFIED' ? '#1b7a35' : '#b25000' }}>{c.verificationStatus === 'VERIFIED' ? a.identityOk : a.identityNot}</strong>
          </p>
          {app.message && (
            <p style={{ fontSize: 14, color: '#424245', margin: '8px 0 0', whiteSpace: 'pre-line' }}>
              <strong style={{ fontWeight: 600 }}>{a.message}:</strong> {app.message}
            </p>
          )}
          <div style={{ marginTop: 14 }}>
            <DocumentCards documents={app.documents} label={type => t.hostApply.docTypes[type]} url={hostDocumentUrl} />
          </div>
          {app.status === 'PENDING' && c.active && (
            <div style={{ marginTop: 16 }}>
              {rejecting ? (
                <form onSubmit={e => { e.preventDefault(); decide('reject') }} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73' }}>
                    {a.rejectNote}
                    <textarea required minLength={3} rows={3} value={note} onChange={e => setNote(e.target.value)} autoFocus style={{ fontSize: 15, padding: '10px 12px', border: '1px solid #d2d2d7', borderRadius: 12, fontFamily: 'inherit', resize: 'vertical' }} />
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" disabled={busy} style={{ ...actionButton, background: '#d70015', color: '#fff' }}>{a.rejectSubmit}</button>
                    <button type="button" onClick={() => setRejecting(false)} style={{ ...actionButton, background: '#f5f5f7', color: '#1d1d1f' }}>{a.cancel}</button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '0 1 260px' }}><CommissionSelect value={rate} onChange={setRate} /></div>
                  <button onClick={() => decide('approve')} disabled={busy} style={{ ...actionButton, background: '#1b7a35', color: '#fff' }}>✓ {a.approve}</button>
                  <button onClick={() => setRejecting(true)} style={{ ...actionButton, background: '#fff', color: '#d70015', border: '1px solid #f0c4c4' }}>{a.reject}</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}

// The host's commission: shown, and changed by the admin (the host gets a notification).
function CommissionEditor({ host, onChanged }: { host: AdminHost; onChanged: () => Promise<unknown> }) {
  const { t } = useI18n()
  const c = t.commission
  const [rate, setRate] = useState(host.commissionRate)
  const [busy, setBusy] = useState(false)
  useEffect(() => setRate(host.commissionRate), [host.commissionRate])

  async function save() {
    if (!confirm(c.changeAsk(host.commissionRate, rate))) return
    setBusy(true)
    try {
      await updateCommission(host.id, rate)
      await onChanged()
    } catch {
      alert(c.error)
    }
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 14, padding: '12px 14px', borderRadius: 14, background: '#f5f5f7' }}>
      <div style={{ flex: '1 1 160px', fontSize: 13, color: '#6e6e73' }}>
        {c.label}
        <div style={{ fontSize: 22, fontWeight: 600, color: '#1d1d1f', marginTop: 2 }}>{c.rate(host.commissionRate)}</div>
      </div>
      <div style={{ flex: '0 1 240px' }}><CommissionSelect value={rate} onChange={setRate} /></div>
      <button onClick={save} disabled={busy || rate === host.commissionRate} className="btn-action btn-action--primary" style={{ opacity: rate === host.commissionRate ? 0.4 : 1 }}>{c.change}</button>
    </div>
  )
}

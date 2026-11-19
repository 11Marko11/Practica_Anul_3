import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { monthLabel, type IncomeMonth } from '../../components/IncomeTable'
import { Money } from '../../components/Money'
import { useI18n } from '../../i18n/I18nContext'
import { api } from '../../lib/api'
import { same, useLivePoll } from '../../lib/livePoll'
import { formatDate } from '../../lib/rental'

type CompanyMonth = { month: string; commission: number; paid: number; unpaid: number; charged: number; hosts: number; current: boolean }
type HostRow = IncomeMonth & { hostId: number; host: { id: number; name: string; rate: number | null } }
type Finances = { company: CompanyMonth[]; hosts: HostRow[] }

const getFinances = () => api<Finances>('/admin/finances')

export type IncomeFilters = { host: string; month: string; status: 'all' | 'unpaid' | 'paid' }

// Admin > Transactions, top: Rent Motors' income (the hosts' commission) by month, and every
// host's income month by month. Hosts pay the commission by card; a month turns paid by itself.
// The filters live in the page (the URL), which shows the money movements behind the rows shown;
// a click on a month in "By month" picks it (a second click lets it go).
export function CompanyIncome({ filters, onFilter, onRows }: {
  filters: IncomeFilters
  onFilter: (key: keyof IncomeFilters, value: string) => void
  // The "host|month" keys of the host rows shown.
  onRows: (keys: string[]) => void
}) {
  const { lang, t } = useI18n()
  const a = t.adminFinances
  const f = t.finances
  const [data, setData] = useState<Finances | null>(null)
  const { host, month, status } = filters
  const setHost = (v: string) => onFilter('host', v)
  const setMonth = (v: string) => onFilter('month', v)
  const setStatus = (v: string) => onFilter('status', v)

  const load = () => getFinances().then(next => setData(prev => (same(prev, next) ? prev : next)))
  useEffect(() => { load().catch(() => setData({ company: [], hosts: [] })) }, [])
  useLivePoll(() => { load().catch(() => {}) }, 30_000)

  const rows = (data?.hosts ?? []).filter(h =>
    (!host || String(h.host.id) === host) && (!month || h.month === month) &&
    (status === 'all' || (status === 'paid' ? !!h.paid : !h.paid && !h.current && h.commission > 0)))
  const rowKeys = rows.map(r => `${r.host.id}|${r.month}`).join(',')
  useEffect(() => { onRows(rowKeys ? rowKeys.split(',') : []) }, [rowKeys]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <p style={{ fontSize: 15, color: '#6e6e73' }}>{t.bookings.loading}</p>

  const current = data.company.find(c => c.current)
  const collected = data.company.reduce((s, c) => s + c.paid, 0)
  const toCollect = data.company.filter(c => !c.current).reduce((s, c) => s + c.unpaid, 0)
  const hosts = [...new Map(data.hosts.map(h => [h.host.id, h.host.name])).entries()].sort((x, y) => x[1].localeCompare(y[1]))
  const months = [...new Set(data.hosts.map(h => h.month))].sort().reverse()



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={title}>{a.title}</h2>
        <p style={{ fontSize: 14, color: '#6e6e73', margin: '6px 0 0', maxWidth: 720, lineHeight: 1.5 }}>{a.intro}</p>
      </div>
      <div className="dashboard-tiles">
        <Tile label={a.thisMonth} value={<Money value={current?.commission ?? 0} />} strong />
        <Tile label={a.collected} value={<Money value={collected} />} />
        <Tile label={a.toCollect} value={<Money value={toCollect} />} sub={a.toCollectHint} warn={toCollect > 0} />
        <Tile label={a.hostsTurnover} value={<Money value={current?.charged ?? 0} />} />
      </div>

      {data.company.length === 0 ? (
        <p style={{ fontSize: 15, color: '#6e6e73' }}>{a.empty}</p>
      ) : (
        <>
          <section>
            <h3 style={subtitle}>{a.byMonth}</h3>
            <div style={{ overflowX: 'auto', border: '1px solid #e5e5ea', borderRadius: 16 }}>
              <table className="income-table">
                <thead>
                  <tr><th>{f.month}</th><th className="num">{a.hosts}</th><th className="num">{a.turnover}</th><th className="num">{f.commission}</th><th className="num">{a.paidCol}</th><th className="num">{a.unpaidCol}</th></tr>
                </thead>
                <tbody>
                  {data.company.map(c => (
                    <tr
                      key={c.month}
                      className="income-row--pickable"
                      aria-selected={month === c.month}
                      tabIndex={0}
                      onClick={() => setMonth(month === c.month ? '' : c.month)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMonth(month === c.month ? '' : c.month) } }}
                    >
                      <td style={{ fontWeight: 600 }}>{monthLabel(c.month, lang, true)}{c.current && <span style={{ fontWeight: 400, color: '#86868b' }}> · {f.current}</span>}</td>
                      <td className="num">{c.hosts}</td>
                      <td className="num"><Money value={c.charged} /></td>
                      <td className="num" style={{ fontWeight: 600 }}><Money value={c.commission} /></td>
                      <td className="num" style={{ color: '#1b7a35' }}><Money value={c.paid} /></td>
                      <td className="num" style={{ color: c.unpaid && !c.current ? '#9a5b00' : undefined }}><Money value={c.unpaid} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <h3 style={{ ...subtitle, margin: 0 }}>{a.hostIncome}</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={host} onChange={e => setHost(e.target.value)} aria-label={a.host} style={control}>
                  <option value="">{a.allHosts}</option>
                  {hosts.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
                <select value={month} onChange={e => setMonth(e.target.value)} aria-label={f.month} style={control}>
                  <option value="">{a.allMonths}</option>
                  {months.map(m => <option key={m} value={m}>{monthLabel(m, lang)}</option>)}
                </select>
                <select value={status} onChange={e => setStatus(e.target.value as typeof status)} aria-label={f.status} style={control}>
                  <option value="all">{a.statusAll}</option>
                  <option value="unpaid">{a.statusUnpaid}</option>
                  <option value="paid">{a.statusPaid}</option>
                </select>
              </div>
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid #e5e5ea', borderRadius: 16 }}>
              <table className="income-table">
                <thead>
                  <tr><th>{a.host}</th><th>{f.month}</th><th className="num">{f.bookings}</th><th className="num">{f.charged}</th><th className="num">{f.refunded}</th><th className="num">{f.commission}</th><th className="num">{a.hostIncomeCol}</th><th>{f.status}</th></tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={8} style={{ color: '#6e6e73' }}>{a.empty}</td></tr>}
                  {rows.map(r => {
                    return (
                      <tr key={`${r.host.id}|${r.month}`}>
                        <td style={{ fontWeight: 600 }}>
                          <Link to={`/hosts/${r.host.id}`} style={{ color: '#1d1d1f', textDecoration: 'none' }}>{r.host.name}</Link>
                          {r.host.rate !== null && <span style={{ fontWeight: 400, color: '#86868b' }}> · {r.host.rate}%</span>}
                        </td>
                        <td>{monthLabel(r.month, lang, true)}</td>
                        <td className="num">{r.bookings}</td>
                        <td className="num"><Money value={r.charged} /></td>
                        <td className="num">{r.refunded ? <>−<Money value={r.refunded} /></> : f.nothing}</td>
                        <td className="num" style={{ fontWeight: 600 }}><Money value={r.commission} /></td>
                        <td className="num"><Money value={r.income} /></td>
                        <td>
                          {r.paid
                            ? <span style={{ ...pill, background: '#e3f6e8', color: '#1b7a35' }}>✓ {f.paid(formatDate(r.paid.paidAt.slice(0, 10), lang))}</span>
                            : r.current
                              ? <span style={{ ...pill, background: '#f2f2f4', color: '#6e6e73' }}>{f.current}</span>
                              : r.commission > 0
                                ? <span style={{ ...pill, background: '#fff4e0', color: '#9a5b00' }}>{f.unpaid}</span>
                                : f.nothing}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      <h2 style={{ ...title, marginTop: 16 }}>{a.allMovements}</h2>
    </div>
  )
}

function Tile({ label, value, sub, strong, warn }: { label: string; value: React.ReactNode; sub?: string; strong?: boolean; warn?: boolean }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: warn ? '#fff4e0' : strong ? '#1d1d1f' : '#f5f5f7', minWidth: 0, containerType: 'inline-size' }}>
      <div style={{ fontSize: 13, color: warn ? '#9a5b00' : strong ? '#a1a1a6' : '#6e6e73' }}>{label}</div>
      <div className="tile-value" style={{ fontWeight: 600, letterSpacing: '-0.03em', color: strong ? '#f5f5f7' : '#1d1d1f', marginTop: 4, whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#86868b', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

const title: React.CSSProperties = { fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: 0 }
const subtitle: React.CSSProperties = { fontSize: 18, fontWeight: 600, color: '#1d1d1f', margin: '0 0 12px' }
const control: React.CSSProperties = { fontSize: 14, padding: '9px 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none' }
const pill: React.CSSProperties = { display: 'inline-block', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 980, whiteSpace: 'nowrap' }

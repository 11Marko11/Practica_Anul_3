import { useEffect, useState } from 'react'
import { IncomeTable, monthLabel, type IncomeMonth } from '../components/IncomeTable'
import { Money } from '../components/Money'
import { useI18n } from '../i18n/I18nContext'
import { api } from '../lib/api'
import { same, useLivePoll } from '../lib/livePoll'
import { useUrlParams } from '../lib/useUrlParams'

type Entry = { id: string; type: 'hold' | 'charge' | 'refund' | 'release'; at: string; month: string; amount: number; rate: number; booking: { id: string; car: string; customer: string } }
type Finances = { rate: number; currentMonth: string; months: IncomeMonth[]; due: number; onHold: number; entries: Entry[] }

const getFinances = () => api<Finances>('/host/finances')

// Host panel > Finances: commission rate, income by month (by year) and the money movements
// of the host's cars (by month).
export function HostFinances() {
  const { lang, t } = useI18n()
  const f = t.finances
  const [data, setData] = useState<Finances | null>(null)
  const [paying, setPaying] = useState('')
  const [notice, setNotice] = useState('')
  const { params, edit } = useUrlParams()
  const year = params.get('year') ?? ''
  const month = params.get('month') ?? ''
  const set = (key: string, value: string) => edit(p => (value ? p.set(key, value) : p.delete(key)))

  useEffect(() => {
    getFinances().then(setData).catch(() => setData(null))
  }, [])

  // Back from the payment page: record the payment at once, then show the month as paid.
  const returned = params.get('commission')
  useEffect(() => {
    if (!returned) return
    api<{ month: string | null }>('/host/finances/sync', { body: { sessionId: returned } })
      .then(async res => {
        setData(await getFinances())
        if (res.month) setNotice(f.paidNow(monthLabel(res.month, lang)))
      })
      .catch(() => {})
      .finally(() => edit(p => p.delete('commission')))
  }, [returned])

  // Opens Stripe's payment page for one month's commission.
  async function pay(month: string) {
    setPaying(month)
    try {
      const { checkoutUrl } = await api<{ checkoutUrl: string }>(`/host/finances/${month}/pay`, { body: { lang } })
      window.location.href = checkoutUrl
    } catch {
      alert(f.payError)
      setPaying('')
    }
  }
  useLivePoll(() => { getFinances().then(next => setData(prev => (same(prev, next) ? prev : next))).catch(() => {}) }, 30_000)

  if (!data) return <p style={{ fontSize: 15, color: '#6e6e73' }}>{t.bookings.loading}</p>

  const years = [...new Set(data.months.map(m => m.month.slice(0, 4)))]
  const months = data.months.filter(m => !year || m.month.startsWith(year))
  const thisMonth = data.months.find(m => m.month === data.currentMonth)
  const entryMonths = [...new Set(data.entries.map(e => e.month))].sort().reverse()
  const entries = data.entries.filter(e => !month || e.month === month)
  const time = (iso: string) => new Date(iso).toLocaleString(lang, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div className="dashboard-tiles">
        <Tile label={f.rateNow} value={`${data.rate}%`} sub={f.rateHint} />
        <Tile label={f.thisMonth} value={<Money value={thisMonth?.income ?? 0} />} sub={monthLabel(data.currentMonth, lang)} />
        <Tile label={f.due} value={<Money value={data.due} />} sub={f.dueHint} warn={data.due > 0} />
        <Tile label={f.onHold} value={<Money value={data.onHold} />} />
      </div>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <h2 style={title}>{f.monthly}</h2>
          {years.length > 0 && (
            <label style={label}>
              {f.year}
              <select value={year} onChange={e => set('year', e.target.value)} style={control}>
                <option value="">{f.allYears}</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          )}
        </div>
        {notice && <p role="status" style={{ fontSize: 14, color: '#1b7a35', background: '#e3f6e8', padding: '10px 14px', borderRadius: 12, margin: '0 0 12px' }}>✓ {notice}</p>}
        {months.length === 0 ? (
          <p style={{ fontSize: 15, color: '#6e6e73' }}>{f.noIncome}</p>
        ) : (
          <IncomeTable
            months={months}
            selected={month}
            onSelect={m => set('month', m)}
            action={m => !m.paid && !m.current && m.commission > 0
              ? <button onClick={() => pay(m.month)} disabled={!!paying} className="btn-action btn-action--primary">{paying === m.month ? f.paying : f.pay}</button>
              : null}
          />
        )}
        <p style={{ fontSize: 12, color: '#86868b', margin: '10px 0 0' }}>{f.payHint}</p>
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <h2 style={title}>{f.transactions}</h2>
          {entryMonths.length > 0 && (
            <select value={month} onChange={e => set('month', e.target.value)} aria-label={f.month} style={control}>
              <option value="">{f.allMonths}</option>
              {entryMonths.map(m => <option key={m} value={m}>{monthLabel(m, lang)}</option>)}
            </select>
          )}
        </div>
        {entries.length === 0 && <p style={{ fontSize: 15, color: '#6e6e73' }}>{f.noTransactions}</p>}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {entries.map(e => (
            <li key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{t.transactions.type[e.type]} · {e.booking.car}</div>
                <div style={{ fontSize: 13, color: '#6e6e73' }}>
                  {e.booking.customer} · {time(e.at)}{(e.type === 'charge' || e.type === 'refund') && ` · ${f.entryRate(e.rate)}`}
                </div>
              </div>
              <strong style={{ fontSize: 15, color: e.type === 'refund' ? '#d70015' : e.type === 'charge' ? '#1b7a35' : '#86868b', textDecoration: e.type === 'release' ? 'line-through' : 'none' }}>
                {e.amount < 0 ? '−' : e.type === 'charge' ? '+' : ''}<Money value={Math.abs(e.amount)} />
              </strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Tile({ label, value, sub, warn }: { label: string; value: React.ReactNode; sub?: string; warn?: boolean }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: warn ? '#fff4e0' : '#f5f5f7', minWidth: 0, containerType: 'inline-size' }}>
      <div style={{ fontSize: 13, color: warn ? '#9a5b00' : '#6e6e73' }}>{label}</div>
      <div className="tile-value" style={{ fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', marginTop: 4, whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#86868b', marginTop: 4, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  )
}

const title: React.CSSProperties = { fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: 0 }
const label: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6e6e73' }
const control: React.CSSProperties = { fontSize: 14, padding: '9px 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', color: '#1d1d1f', fontFamily: 'inherit', outline: 'none' }

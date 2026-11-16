import { useI18n } from '../i18n/I18nContext'
import { formatDate } from '../lib/rental'
import { Money } from './Money'

export type IncomeMonth = {
  month: string // "2026-11"
  bookings: number
  charged: number
  refunded: number
  net: number
  commission: number
  income: number
  paid: { amount: number; paidAt: string } | null
  current: boolean
}

// "noiembrie 2026"
export function monthLabel(month: string, lang: string) {
  const [y, m] = month.split('-').map(Number)
  const text = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// A host's income month by month: charged, refunded, Rent Motors' commission, what the host
// keeps and whether the commission was paid. `action` adds a cell per month (the admin's button).
export function IncomeTable({ months, action }: { months: IncomeMonth[]; action?: (m: IncomeMonth) => React.ReactNode }) {
  const { lang, t } = useI18n()
  const f = t.finances
  const sum = (key: 'bookings' | 'charged' | 'refunded' | 'commission' | 'income') => months.reduce((s, m) => s + m[key], 0)

  const status = (m: IncomeMonth) => {
    if (m.paid) return <span style={{ ...pill, background: '#e3f6e8', color: '#1b7a35' }}>✓ {f.paid(formatDate(m.paid.paidAt.slice(0, 10), lang))}</span>
    if (m.current) return <span style={{ ...pill, background: '#f2f2f4', color: '#6e6e73' }}>{f.current}</span>
    if (m.commission > 0) return <span style={{ ...pill, background: '#fff4e0', color: '#9a5b00' }}>{f.unpaid}</span>
    return <span style={{ color: '#86868b' }}>{f.nothing}</span>
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #e5e5ea', borderRadius: 16 }}>
      <table className="income-table">
        <thead>
          <tr>
            <th>{f.month}</th>
            <th className="num">{f.bookings}</th>
            <th className="num">{f.charged}</th>
            <th className="num">{f.refunded}</th>
            <th className="num">{f.commission}</th>
            <th className="num">{f.income}</th>
            <th>{f.status}</th>
            {action && <th />}
          </tr>
        </thead>
        <tbody>
          {months.map(m => (
            <tr key={m.month}>
              <td style={{ fontWeight: 600 }}>{monthLabel(m.month, lang)}</td>
              <td className="num">{m.bookings}</td>
              <td className="num"><Money value={m.charged} /></td>
              <td className="num">{m.refunded ? <>−<Money value={m.refunded} /></> : f.nothing}</td>
              <td className="num"><Money value={m.commission} /></td>
              <td className="num" style={{ fontWeight: 600 }}><Money value={m.income} /></td>
              <td>{status(m)}</td>
              {action && <td style={{ textAlign: 'right' }}>{action(m)}</td>}
            </tr>
          ))}
        </tbody>
        {months.length > 1 && (
          <tfoot>
            <tr>
              <td>{f.total}</td>
              <td className="num">{sum('bookings')}</td>
              <td className="num"><Money value={sum('charged')} /></td>
              <td className="num">{sum('refunded') ? <>−<Money value={sum('refunded')} /></> : f.nothing}</td>
              <td className="num"><Money value={sum('commission')} /></td>
              <td className="num"><Money value={sum('income')} /></td>
              <td />
              {action && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

const pill: React.CSSProperties = { display: 'inline-block', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 980, whiteSpace: 'nowrap' }

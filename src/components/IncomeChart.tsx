import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { fmt } from '../lib/rental'
import { monthLabel } from './IncomeTable'

type Point = { month: string; commission: number; turnover: number }

const H = 200 // plot height (px)
const GAP = 6 // between bars (%)

// Rent Motors' income (the hosts' commission) month by month, as bars. Hovering or focusing a
// month shows its commission and the hosts' turnover; a table view is one click away.
export function IncomeChart({ data }: { data: Point[] }) {
  const { lang, t } = useI18n()
  const s = t.stats
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(...data.map(d => d.commission), 0)
  // A round top for the axis: 1, 2 or 5 × a power of ten.
  const step = (() => {
    if (!max) return 1
    const raw = max / 4
    const p = 10 ** Math.floor(Math.log10(raw))
    return [1, 2, 5, 10].map(k => k * p).find(v => v >= raw) ?? raw
  })()
  const top = step * 4
  const latest = data.length - 1
  const short = (m: string) => monthLabel(m, lang, true).replace(/\s\d{4}$/, '')

  if (!max) return <p style={{ fontSize: 15, color: '#6e6e73', margin: 0 }}>{s.noIncome}</p>

  return (
    <div>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '56px 1fr', gap: 8 }}>
        {/* y axis */}
        <div style={{ position: 'relative', height: H }}>
          {[0, 1, 2, 3, 4].map(i => (
            <span key={i} style={{ position: 'absolute', right: 0, bottom: (H * i) / 4 - 7, fontSize: 11, color: '#86868b', fontVariantNumeric: 'tabular-nums' }}>
              {(step * i).toLocaleString('en-US').replace(/,/g, ' ')}
            </span>
          ))}
        </div>
        <div style={{ position: 'relative', height: H }} onMouseLeave={() => setActive(null)}>
          {/* grid */}
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: (H * i) / 4, borderTop: `1px solid ${i === 0 ? '#d2d2d7' : '#f0f0f0'}` }} />
          ))}
          {/* bars */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: `${GAP}%`, padding: '0 1%' }}>
            {data.map((d, i) => {
              const h = d.commission ? Math.max(3, (d.commission / top) * H) : 0
              return (
                <button
                  key={d.month}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`${monthLabel(d.month, lang)}: ${s.commission} ${fmt(d.commission)}, ${s.turnover} ${fmt(d.turnover)}`}
                  style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', background: active === i ? 'rgba(0,113,227,0.06)' : 'transparent', border: 'none', padding: 0, cursor: 'default', borderRadius: 6 }}
                >
                  <span style={{ display: 'block', width: '100%', height: h, background: active === null || active === i ? '#0071e3' : '#7fb3ef', borderRadius: '4px 4px 0 0', transition: 'background 0.15s' }} />
                </button>
              )
            })}
          </div>
          {/* the latest month's value, so the chart reads without hovering */}
          {active === null && data[latest].commission > 0 && (
            <span style={{ position: 'absolute', right: '1%', bottom: (data[latest].commission / top) * H + 6, fontSize: 12, fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap' }}>
              {fmt(data[latest].commission)}
            </span>
          )}
          {/* tooltip */}
          {active !== null && (
            <div
              role="status"
              style={{
                position: 'absolute', top: 0, zIndex: 2, pointerEvents: 'none',
                left: `${((active + 0.5) / data.length) * 100}%`, transform: `translateX(${active > data.length - 4 ? '-100%' : active < 3 ? '0' : '-50%'})`,
                background: '#1d1d1f', color: '#f5f5f7', borderRadius: 10, padding: '8px 12px', fontSize: 12, lineHeight: 1.5, whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ fontWeight: 600 }}>{monthLabel(data[active].month, lang)}</div>
              <div>{s.commission}: <strong>{fmt(data[active].commission)}</strong></div>
              <div style={{ color: '#a1a1a6' }}>{s.turnover}: {fmt(data[active].turnover)}</div>
            </div>
          )}
        </div>
        {/* x axis */}
        <div />
        <div style={{ display: 'flex', gap: `${GAP}%`, padding: '0 1%' }}>
          {data.map((d, i) => (
            <span key={d.month} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: i === latest ? '#1d1d1f' : '#86868b', fontWeight: i === latest ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {short(d.month)}
            </span>
          ))}
        </div>
      </div>
      <details style={{ marginTop: 12 }}>
        <summary style={{ fontSize: 13, color: '#0071e3', cursor: 'pointer' }}>{s.table}</summary>
        <div style={{ overflowX: 'auto', border: '1px solid #e5e5ea', borderRadius: 12, marginTop: 8 }}>
          <table className="income-table" style={{ minWidth: 0 }}>
            <thead><tr><th>{t.finances.month}</th><th className="num">{s.commission}</th><th className="num">{s.turnover}</th></tr></thead>
            <tbody>
              {[...data].reverse().map(d => (
                <tr key={d.month}><td>{monthLabel(d.month, lang, true)}</td><td className="num">{fmt(d.commission)}</td><td className="num">{fmt(d.turnover)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

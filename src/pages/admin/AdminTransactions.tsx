import { useEffect, useState } from 'react'
import { StatusBadge } from '../../components/BookingCard'
import { Money } from '../../components/Money'
import { useI18n } from '../../i18n/I18nContext'
import { api } from '../../lib/api'
import type { BookingStatus } from '../../lib/bookings'
import { fmt } from '../../lib/rental'
import { AdminGuard } from './AdminGuard'
import { AdminTabs } from './AdminTabs'

type EntryType = 'hold' | 'charge' | 'refund' | 'release'
type Entry = {
  id: string
  type: EntryType
  at: string
  amount: number
  booking: { id: string; status: BookingStatus; car: string; customer: string; email: string }
}
type Response = {
  entries: Entry[]
  totals: { charged: number; refunded: number; net: number; onHold: number }
  months: string[]
}

const FILTERS = ['all', 'charge', 'refund', 'hold', 'release'] as const
const TYPE_COLORS: Record<EntryType, string> = { charge: '#1b7a35', refund: '#b3261e', hold: '#0058b8', release: '#86868b' }

// History of every money movement from bookings (/admin/transactions), opened from the
// dashboard's "Charged this month" tile. Defaults to the current month.
export function AdminTransactions() {
  return (
    <AdminGuard>
      <TransactionsContent />
    </AdminGuard>
  )
}

function TransactionsContent() {
  const { lang, t } = useI18n()
  const tr = t.transactions
  // The current month in Moldova (not UTC), like the server's dashboard.
  const thisMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Chisinau', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7)
  const [month, setMonth] = useState<string>(thisMonth)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')
  const [data, setData] = useState<Response | null>(null)

  useEffect(() => {
    setData(null)
    api<Response>(`/admin/transactions${month ? `?month=${month}` : ''}`).then(setData).catch(() => setData({ entries: [], totals: { charged: 0, refunded: 0, net: 0, onHold: 0 }, months: [] }))
  }, [month])

  const entries = (data?.entries ?? []).filter(e => filter === 'all' || e.type === filter)
  const months = [...new Set([thisMonth, ...(data?.months ?? [])])].sort().reverse()
  const monthName = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString(lang, { month: 'long', year: 'numeric' })
  const time = (iso: string) => new Date(iso).toLocaleString(lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // A spreadsheet-friendly copy of what is on screen.
  function downloadCsv() {
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const rows = [tr.csvHeader, ...entries.map(e => [e.at.slice(0, 16).replace('T', ' '), tr.type[e.type], e.type === 'release' || e.type === 'hold' ? 0 : e.amount, e.booking.car, e.booking.customer, e.booking.email, e.booking.id])]
    const blob = new Blob(['﻿' + rows.map(r => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `rent-motors-transactions-${month || 'all'}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '40px 24px 28px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <AdminTabs />
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{tr.title}</h1>
          <p style={{ fontSize: 14, color: '#a1a1a6', margin: '10px 0 0', maxWidth: 640, lineHeight: 1.5 }}>{tr.intro}</p>
        </div>
      </div>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73' }}>
            {tr.month}
            <select value={month} onChange={e => setMonth(e.target.value)} style={{ fontSize: 14, padding: '9px 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', fontFamily: 'inherit' }}>
              {months.map(m => <option key={m} value={m}>{monthName(m)}</option>)}
              <option value="">{tr.allTime}</option>
            </select>
          </label>
          <button onClick={downloadCsv} disabled={!entries.length} style={{ fontSize: 14, fontWeight: 500, padding: '10px 18px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', color: '#1d1d1f', cursor: entries.length ? 'pointer' : 'default', opacity: entries.length ? 1 : 0.4 }}>
            ⬇ {tr.exportCsv}
          </button>
        </div>

        <div className="dashboard-tiles" style={{ marginTop: 20 }}>
          <Total label={tr.totals.charged} value={data?.totals.charged} />
          <Total label={tr.totals.refunded} value={data ? -data.totals.refunded : undefined} />
          <Total label={tr.totals.net} value={data?.totals.net} strong />
          <Total label={tr.totals.onHold} value={data?.totals.onHold} muted />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '28px 0 8px' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              style={{ fontSize: 13, padding: '7px 14px', borderRadius: 980, border: '1px solid', borderColor: filter === f ? '#1d1d1f' : '#d2d2d7', background: filter === f ? '#1d1d1f' : 'transparent', color: filter === f ? '#fff' : '#6e6e73', cursor: 'pointer' }}
            >
              {tr.filters[f]}
            </button>
          ))}
        </div>

        {!data && <p style={{ fontSize: 15, color: '#6e6e73' }}>{t.bookings.loading}</p>}
        {data && entries.length === 0 && <p style={{ fontSize: 15, color: '#6e6e73', padding: '32px 0' }}>{tr.empty}</p>}

        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {entries.map(e => (
            <li key={e.id} className="transaction-row">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: TYPE_COLORS[e.type] }}>{tr.type[e.type]}</div>
                <div style={{ fontSize: 12, color: '#86868b' }}>{tr.typeHint[e.type]}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#1d1d1f' }}>{e.booking.car}</div>
                <div style={{ fontSize: 13, color: '#6e6e73', overflowWrap: 'anywhere' }}>{e.booking.customer} · {e.booking.email}</div>
              </div>
              <div style={{ fontSize: 13, color: '#6e6e73' }}>
                {time(e.at)}
                <div style={{ marginTop: 4 }}><StatusBadge status={e.booking.status} /></div>
              </div>
              <div className="transaction-amount" style={{ color: TYPE_COLORS[e.type], textDecoration: e.type === 'release' ? 'line-through' : 'none' }}>
                {e.type === 'charge' ? '+' : ''}{fmt(e.amount)}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

function Total({ label, value, strong, muted }: { label: string; value?: number; strong?: boolean; muted?: boolean }) {
  return (
    <div style={{ padding: '16px 18px', borderRadius: 16, background: strong ? '#1c1c1e' : '#f5f5f7', minWidth: 0, containerType: 'inline-size' }}>
      <div style={{ fontSize: 13, color: strong ? '#a1a1a6' : '#6e6e73' }}>{label}</div>
      <div className="tile-value" style={{ fontWeight: 600, letterSpacing: '-0.03em', color: strong ? '#f5f5f7' : muted ? '#0058b8' : '#1d1d1f', marginTop: 6, whiteSpace: 'nowrap' }}>
        {value === undefined ? '—' : <Money value={value} />}
      </div>
    </div>
  )
}

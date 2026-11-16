import { prisma } from '../db.js'
import type { LedgerEntry } from '../bookings/ledger.js'

// "2026-11" for a moment, in Moldova's time zone.
export function moldovaMonth(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Chisinau', year: 'numeric', month: '2-digit' }).format(d).slice(0, 7)
}

// One host's money for one month. Charges count in the month they were taken, refunds in the
// month they were sent back. Rent Motors' commission is each booking's own rate of what was kept.
export type HostMonth = {
  hostId: number
  month: string
  bookings: number // charged this month
  charged: number
  refunded: number
  net: number // charged − refunded
  commission: number // due to Rent Motors
  income: number // net − commission: what the host keeps
  paid: { amount: number; paidAt: string } | null // the admin marked this month's commission as paid
  current: boolean // the month is not over yet
}

export async function hostMonths(entries: LedgerEntry[]): Promise<HostMonth[]> {
  const byKey = new Map<string, HostMonth>()
  const now = moldovaMonth(new Date())
  for (const e of entries) {
    if (e.type !== 'charge' && e.type !== 'refund') continue
    const month = moldovaMonth(e.at)
    const key = `${e.hostId}|${month}`
    const m = byKey.get(key) ?? { hostId: e.hostId, month, bookings: 0, charged: 0, refunded: 0, net: 0, commission: 0, income: 0, paid: null, current: month === now }
    if (e.type === 'charge') {
      m.bookings += 1
      m.charged += e.amount
    } else {
      m.refunded -= e.amount
    }
    // Exact share per booking; rounded once per month below.
    m.commission += (e.amount * e.rate) / 100
    byKey.set(key, m)
  }
  const months = [...byKey.values()]
  const payments = await prisma.hostCommissionPayment.findMany({ where: { hostId: { in: [...new Set(months.map(m => m.hostId))] } } })
  const paid = new Map(payments.map(p => [`${p.hostId}|${p.month}`, { amount: p.amount, paidAt: p.paidAt.toISOString() }]))
  for (const m of months) {
    m.net = m.charged - m.refunded
    m.commission = Math.max(0, Math.round(m.commission))
    m.income = m.net - m.commission
    m.paid = paid.get(`${m.hostId}|${m.month}`) ?? null
  }
  return months.sort((a, b) => b.month.localeCompare(a.month) || a.hostId - b.hostId)
}

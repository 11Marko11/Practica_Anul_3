import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../auth/guards.js'
import { moldovaTime } from '../bookings/dates.js'
import { ledger, netBetween } from '../bookings/ledger.js'
import { prisma } from '../db.js'
import { hostMonths } from '../finance/hostIncome.js'

const query = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() })

// Start of a month ('2026-10') in Moldova's time zone, and of the month after it.
function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return { from: moldovaTime(`${month}-01`, 0), to: moldovaTime(`${next}-01`, 0) }
}

// GET /api/admin/transactions?month=2026-10: every money movement (or one month's), with totals.
export async function transactionRoutes(app: FastifyInstance) {
  app.get('/admin/transactions', { preHandler: requireAdmin }, async request => {
    const { month } = query.parse(request.query)
    const all = await ledger()
    const range = month ? monthRange(month) : { from: new Date(0), to: new Date(8.64e15) }
    const entries = all.filter(e => e.at >= range.from && e.at < range.to)
    return {
      entries: entries.map(e => ({ ...e, at: e.at.toISOString() })),
      totals: { ...netBetween(entries, range.from, range.to), onHold: all.filter(e => e.type === 'hold').reduce((s, e) => s + e.amount, 0) },
      // Months that have any movement, newest first, for the month picker.
      months: [...new Set(all.map(e => moldovaMonth(e.at)))].sort().reverse(),
    }
  })
}

// Rent Motors' income is the hosts' commission. GET /api/admin/finances: by month (due, paid,
// still to collect) and every host's income month by month. Hosts pay it by card themselves.
export async function financeRoutes(app: FastifyInstance) {
  app.get('/admin/finances', { preHandler: requireAdmin }, async () => {
    const [months, hosts] = await Promise.all([hostMonths(await ledger()), prisma.host.findMany({ select: { id: true, name: true, commissionRate: true } })])
    const hostById = new Map(hosts.map(h => [h.id, h]))
    const company = new Map<string, { month: string; commission: number; paid: number; unpaid: number; charged: number; hosts: number; current: boolean }>()
    for (const m of months) {
      const c = company.get(m.month) ?? { month: m.month, commission: 0, paid: 0, unpaid: 0, charged: 0, hosts: 0, current: m.current }
      c.commission += m.commission
      c.charged += m.net
      c.hosts += 1
      if (m.paid) c.paid += m.paid.amount
      else c.unpaid += m.commission
      company.set(m.month, c)
    }
    return {
      company: [...company.values()].sort((a, b) => b.month.localeCompare(a.month)),
      hosts: months.map(m => ({ ...m, host: { id: m.hostId, name: hostById.get(m.hostId)?.name ?? '—', rate: hostById.get(m.hostId)?.commissionRate ?? null } })),
    }
  })
  // Commissions are paid by the hosts by card and recorded from Stripe (finance/commissionPayment.ts).
}

function moldovaMonth(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Chisinau', year: 'numeric', month: '2-digit' }).format(d).slice(0, 7)
}

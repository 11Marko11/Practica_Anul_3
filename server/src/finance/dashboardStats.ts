import { fromIsoDate } from '../bookings/dates.js'
import { ledger } from '../bookings/ledger.js'
import { LISTED } from '../cars/dto.js'
import { prisma } from '../db.js'
import { hostMonths, moldovaMonth } from './hostIncome.js'

// The last `n` months, oldest first: ["2025-12", …, "2026-11"].
function lastMonths(now: string, n: number) {
  const [y, m] = now.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1))
    return d.toISOString().slice(0, 7)
  })
}

// Statistics for the admin dashboard: Rent Motors' income month by month, commission not paid
// yet, the hosts who earned most this month, how many cars are rented now and this month's growth.
export async function dashboardStats(monthStart: Date, today: string) {
  const now = moldovaMonth(new Date())
  const [months, hosts, listed, rentedNow, newUsers, newHostRequests, newCars] = await Promise.all([
    ledger().then(hostMonths),
    prisma.host.findMany({ select: { id: true, name: true, commissionRate: true } }),
    prisma.car.count({ where: LISTED }),
    prisma.booking.findMany({
      where: { status: 'CONFIRMED', pickupDate: { lte: fromIsoDate(today) }, returnDate: { gte: fromIsoDate(today) }, car: LISTED },
      distinct: ['carId'],
      select: { carId: true },
    }),
    prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { hostApplicationSubmittedAt: { gte: monthStart } } }),
    prisma.car.count({ where: { createdAt: { gte: monthStart }, status: { not: 'REMOVED' } } }),
  ])
  const hostById = new Map(hosts.map(h => [h.id, h]))

  const byMonth = new Map<string, { commission: number; turnover: number }>()
  for (const m of months) {
    const row = byMonth.get(m.month) ?? { commission: 0, turnover: 0 }
    row.commission += m.commission
    row.turnover += m.net
    byMonth.set(m.month, row)
  }
  const unpaid = months.filter(m => !m.current && !m.paid && m.commission > 0)

  return {
    income: lastMonths(now, 12).map(month => ({ month, ...(byMonth.get(month) ?? { commission: 0, turnover: 0 }) })),
    unpaid: { amount: unpaid.reduce((s, m) => s + m.commission, 0), hosts: new Set(unpaid.map(m => m.hostId)).size },
    topHosts: months
      .filter(m => m.month === now && m.net > 0)
      .sort((a, b) => b.net - a.net)
      .slice(0, 5)
      .map(m => ({ id: m.hostId, name: hostById.get(m.hostId)?.name ?? '—', rate: hostById.get(m.hostId)?.commissionRate ?? null, turnover: m.net, commission: m.commission, bookings: m.bookings })),
    occupancy: { rented: rentedNow.length, listed },
    growth: { users: newUsers, hostRequests: newHostRequests, cars: newCars },
  }
}

import type { FastifyInstance } from 'fastify'
import { requireAdmin } from '../auth/guards.js'
import { addDays, fromIsoDate, moldovaTime, todayInMoldova } from '../bookings/dates.js'
import { bookingInclude, toBookingDto } from '../bookings/dto.js'
import { ledger, netBetween } from '../bookings/ledger.js'
import { hostMonths, moldovaMonth } from '../finance/hostIncome.js'
import { LISTED } from '../cars/dto.js'
import { prisma } from '../db.js'

// Everything the admin dashboard shows, in one request.
export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/admin/dashboard', { preHandler: requireAdmin }, async () => {
    const today = todayInMoldova()
    const monthStart = moldovaTime(`${today.slice(0, 7)}-01`, 0)
    const inAWeek = fromIsoDate(addDays(today, 7))
    const forAdmin = { forAdmin: true }

    const [awaiting, upcoming, recent, charged, activeCars, hiddenCars, customers, reviews, verifications, hostApplications, carReviews, hosts] = await Promise.all([
      prisma.booking.findMany({ where: { status: 'AWAITING_CONFIRMATION' }, include: bookingInclude, orderBy: { authorizedAt: 'asc' } }),
      prisma.booking.findMany({
        where: { status: 'CONFIRMED', pickupDate: { gte: fromIsoDate(today), lt: inAWeek } },
        include: bookingInclude,
        orderBy: { pickupDate: 'asc' },
      }),
      prisma.booking.findMany({ where: { status: { not: 'PENDING_PAYMENT' } }, include: bookingInclude, orderBy: { createdAt: 'desc' }, take: 6 }),
      // This month: what the hosts' cars brought in, and Rent Motors' income (the commission).
      ledger().then(async entries => {
        const month = moldovaMonth(new Date())
        const commission = (await hostMonths(entries)).filter(m => m.month === month).reduce((s, m) => s + m.commission, 0)
        return { ...netBetween(entries, monthStart), commission }
      }),
      prisma.car.count({ where: LISTED }),
      prisma.car.count({ where: { status: 'HIDDEN' } }),
      prisma.user.count({ where: { role: 'CUSTOMER', deletedAt: null } }),
      prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
      prisma.user.findMany({
        where: { verificationStatus: 'PENDING', deletedAt: null },
        select: { id: true, name: true, email: true, verificationSubmittedAt: true },
        orderBy: { verificationSubmittedAt: 'asc' },
      }),
      prisma.user.findMany({
        where: { hostApplicationStatus: 'PENDING', deletedAt: null },
        select: { id: true, name: true, email: true, hostApplicationSubmittedAt: true },
        orderBy: { hostApplicationSubmittedAt: 'asc' },
      }),
      prisma.car.findMany({
        where: { reviewStatus: 'PENDING', status: { not: 'REMOVED' } },
        select: { id: true, slug: true, brand: true, model: true, year: true, reviewSubmittedAt: true, host: { select: { name: true } } },
        orderBy: { reviewSubmittedAt: 'asc' },
      }),
      // Active accounts with the host role (the others are plain customers).
      prisma.user.count({ where: { role: 'CUSTOMER', deletedAt: null, host: { isNot: null } } }),
    ])

    return {
      revenueThisMonth: charged.commission, // Rent Motors' income: the hosts' commission
      hostsRevenueThisMonth: charged.net,
      bookingsThisMonth: charged.charges,
      cars: { active: activeCars, hidden: hiddenCars },
      // Active user accounts (admins excluded), and how many of them are hosts.
      users: { total: customers, customers: customers - hosts, hosts },
      reviews: { count: reviews._count._all, average: reviews._avg.rating === null ? null : Math.round(reviews._avg.rating * 10) / 10 },
      awaiting: awaiting.map(b => toBookingDto(b, forAdmin)),
      upcoming: upcoming.map(b => toBookingDto(b, forAdmin)),
      recent: recent.map(b => toBookingDto(b, forAdmin)),
      verifications: verifications.map(u => ({ ...u, verificationSubmittedAt: u.verificationSubmittedAt?.toISOString() ?? null })),
      carReviews: carReviews.map(c => ({ ...c, host: c.host.name, reviewSubmittedAt: c.reviewSubmittedAt?.toISOString() ?? null })),
      hostApplications: hostApplications.map(u => ({ ...u, hostApplicationSubmittedAt: u.hostApplicationSubmittedAt?.toISOString() ?? null })),
    }
  })
}

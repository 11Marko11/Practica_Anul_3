import type { FastifyInstance } from 'fastify'
import { requireAdmin } from '../auth/guards.js'
import { addDays, fromIsoDate, moldovaTime, todayInMoldova } from '../bookings/dates.js'
import { bookingInclude, toBookingDto } from '../bookings/dto.js'
import { ledger, netBetween } from '../bookings/ledger.js'
import { LISTED } from '../cars/dto.js'
import { prisma } from '../db.js'

// Everything the admin dashboard shows, in one request.
export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/admin/dashboard', { preHandler: requireAdmin }, async () => {
    const today = todayInMoldova()
    const monthStart = moldovaTime(`${today.slice(0, 7)}-01`, 0)
    const inAWeek = fromIsoDate(addDays(today, 7))
    const forAdmin = { forAdmin: true }

    const [awaiting, upcoming, recent, charged, activeCars, hiddenCars, customers, reviews, verifications, hostApplications, carReviews] = await Promise.all([
      prisma.booking.findMany({ where: { status: 'AWAITING_CONFIRMATION' }, include: bookingInclude, orderBy: { authorizedAt: 'asc' } }),
      prisma.booking.findMany({
        where: { status: 'CONFIRMED', pickupDate: { gte: fromIsoDate(today), lt: inAWeek } },
        include: bookingInclude,
        orderBy: { pickupDate: 'asc' },
      }),
      prisma.booking.findMany({ where: { status: { not: 'PENDING_PAYMENT' } }, include: bookingInclude, orderBy: { createdAt: 'desc' }, take: 6 }),
      // Charged this month minus refunded this month, the same numbers as the Transactions page.
      ledger().then(entries => netBetween(entries, monthStart)),
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
    ])

    return {
      revenueThisMonth: charged.net,
      bookingsThisMonth: charged.charges,
      cars: { active: activeCars, hidden: hiddenCars },
      customers,
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

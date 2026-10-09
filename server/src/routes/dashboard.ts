import type { FastifyInstance } from 'fastify'
import { requireAdmin } from '../auth/guards.js'
import { addDays, fromIsoDate, moldovaTime, todayInMoldova } from '../bookings/dates.js'
import { bookingInclude, toBookingDto } from '../bookings/dto.js'
import { prisma } from '../db.js'

// Everything the admin dashboard shows, in one request.
export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/admin/dashboard', { preHandler: requireAdmin }, async () => {
    const today = todayInMoldova()
    const monthStart = moldovaTime(`${today.slice(0, 7)}-01`, 0)
    const inAWeek = fromIsoDate(addDays(today, 7))
    const forAdmin = { forAdmin: true }

    const [awaiting, upcoming, recent, charged, activeCars, hiddenCars, customers, reviews] = await Promise.all([
      prisma.booking.findMany({ where: { status: 'AWAITING_CONFIRMATION' }, include: bookingInclude, orderBy: { authorizedAt: 'asc' } }),
      prisma.booking.findMany({
        where: { status: 'CONFIRMED', pickupDate: { gte: fromIsoDate(today), lt: inAWeek } },
        include: bookingInclude,
        orderBy: { pickupDate: 'asc' },
      }),
      prisma.booking.findMany({ where: { status: { not: 'PENDING_PAYMENT' } }, include: bookingInclude, orderBy: { createdAt: 'desc' }, take: 6 }),
      // Money kept from bookings confirmed this month (refunds already subtracted).
      prisma.booking.findMany({ where: { confirmedAt: { gte: monthStart } }, select: { total: true, refundedAmount: true } }),
      prisma.car.count({ where: { status: 'ACTIVE' } }),
      prisma.car.count({ where: { status: 'HIDDEN' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
    ])

    return {
      revenueThisMonth: charged.reduce((sum, b) => sum + b.total - b.refundedAmount, 0),
      bookingsThisMonth: charged.length,
      cars: { active: activeCars, hidden: hiddenCars },
      customers,
      reviews: { count: reviews._count._all, average: reviews._avg.rating === null ? null : Math.round(reviews._avg.rating * 10) / 10 },
      awaiting: awaiting.map(b => toBookingDto(b, forAdmin)),
      upcoming: upcoming.map(b => toBookingDto(b, forAdmin)),
      recent: recent.map(b => toBookingDto(b, forAdmin)),
    }
  })
}

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../auth/guards.js'
import { bookingInclude, toBookingDto } from '../bookings/dto.js'
import { prisma } from '../db.js'

const listQuery = z.object({
  status: z.enum(['PENDING_PAYMENT', 'AWAITING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'EXPIRED', 'REJECTED', 'CANCELLED']).optional(),
})

export async function adminBookingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)

  // For the notification badges: paid bookings and customer documents waiting for the admin.
  app.get('/admin/bookings/summary', async () => ({
    awaitingConfirmation: await prisma.booking.count({ where: { status: 'AWAITING_CONFIRMATION' } }),
    pendingVerifications: await prisma.user.count({ where: { verificationStatus: 'PENDING', deletedAt: null } }),
    pendingCarReviews: await prisma.car.count({ where: { reviewStatus: 'PENDING', status: { not: 'REMOVED' } } }),
    pendingHostApplications: await prisma.user.count({ where: { hostApplicationStatus: 'PENDING', deletedAt: null } }),
  }))

  app.get('/admin/bookings', async request => {
    const { status } = listQuery.parse(request.query)
    const bookings = await prisma.booking.findMany({
      where: status ? { status } : {},
      include: bookingInclude,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    })
    return { bookings: bookings.map(b => toBookingDto(b, { forAdmin: true })) }
  })

  // Bookings are managed by the car's host (see hostPortal.ts): confirm, reject, end the trip
  // or cancel with a refund. The admin follows them here.
}

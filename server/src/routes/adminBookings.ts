import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../auth/guards.js'
import { bookingInclude, CANCEL_REASONS, toBookingDto } from '../bookings/dto.js'
import { completeBooking } from '../bookings/payment.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'
import { stripe, toStripeAmount } from '../payments/stripe.js'

const idParam = z.object({ id: z.uuid() })
const listQuery = z.object({
  status: z.enum(['PENDING_PAYMENT', 'AWAITING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'EXPIRED', 'REJECTED', 'CANCELLED']).optional(),
})

async function findBooking(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude })
  if (!booking) throw new HttpError(404, 'booking-not-found')
  return booking
}

async function reply(id: string) {
  return { booking: toBookingDto(await findBooking(id), { forAdmin: true }) }
}

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

  // Paid bookings are confirmed or rejected by the car's host (see hostPortal.ts); the admin
  // follows them, ends trips and cancels confirmed bookings with a refund.

  // The car was returned: the trip counts for the host, and the customer may now review the car.
  app.post('/admin/bookings/:id/complete', async request => {
    const { id } = idParam.parse(request.params)
    const booking = await findBooking(id)
    if (booking.status !== 'CONFIRMED') throw new HttpError(409, 'not-confirmed')
    await completeBooking(id)
    return reply(id)
  })

  // Cancel a confirmed booking: the admin picks a reason and how much of the charged money
  // goes back to the customer (all, part or nothing).
  app.post('/admin/bookings/:id/cancel', async request => {
    const { id } = idParam.parse(request.params)
    const body = z
      .object({ reason: z.enum(CANCEL_REASONS), note: z.string().trim().max(1000).optional(), refund: z.int().min(0) })
      .refine(b => b.reason !== 'other' || !!b.note, { path: ['note'], message: 'Explain the reason' })
      .parse(request.body)
    const booking = await findBooking(id)
    if (booking.status !== 'CONFIRMED' || !booking.stripePaymentIntentId) throw new HttpError(409, 'not-confirmed')
    const refundable = booking.total - booking.refundedAmount
    if (body.refund > refundable) throw new HttpError(422, 'refund-too-large')

    if (body.refund > 0) {
      await stripe().refunds.create(
        { payment_intent: booking.stripePaymentIntentId, amount: toStripeAmount(body.refund), metadata: { bookingId: id, reason: body.reason } },
        { idempotencyKey: `cancel-${id}` },
      )
    }
    await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED', cancelledBy: 'ADMIN', cancelledAt: new Date(), cancelReason: body.reason,
        cancelNote: body.note || null, refundedAmount: { increment: body.refund },
      },
    })
    return reply(id)
  })
}

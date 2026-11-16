import type { FastifyBaseLogger } from 'fastify'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'
import { carName, notify } from '../notifications/notify.js'
import { stripe, toStripeAmount } from '../payments/stripe.js'
import type { CANCEL_REASONS, REJECT_REASONS } from './dto.js'

// The car's host manages the bookings of their cars. Confirming takes the held money from the
// card; rejecting releases the hold, so the customer pays nothing; cancelling a confirmed booking
// refunds all, part or none of it. The customer gets a notification each time.

const withCar = { car: { select: { brand: true, model: true, host: { select: { commissionRate: true } } } } } as const

export async function confirmBooking(id: string, log: FastifyBaseLogger) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: withCar })
  if (!booking) throw new HttpError(404, 'booking-not-found')
  if (booking.status !== 'AWAITING_CONFIRMATION' || !booking.stripePaymentIntentId) throw new HttpError(409, 'not-awaiting-confirmation')
  try {
    await stripe().paymentIntents.capture(booking.stripePaymentIntentId)
  } catch (err) {
    log.warn(err, 'Capture failed')
    const intent = await stripe().paymentIntents.retrieve(booking.stripePaymentIntentId)
    if (intent.status === 'canceled') {
      // Released by Stripe after 7 days, or the customer cancelled at the same moment.
      await prisma.booking.updateMany({ where: { id, status: 'AWAITING_CONFIRMATION' }, data: { status: 'EXPIRED' } })
      const now = await prisma.booking.findUniqueOrThrow({ where: { id }, select: { status: true } })
      throw new HttpError(409, now.status === 'CANCELLED' ? 'not-awaiting-confirmation' : 'payment-hold-expired')
    }
    if (intent.status !== 'succeeded') throw new HttpError(502, 'payment-provider-error')
  }
  // The host's commission rate at this moment stays with the booking.
  await prisma.booking.update({ where: { id }, data: { status: 'CONFIRMED', confirmedAt: new Date(), commissionRate: booking.car.host.commissionRate } })
  await notify(booking.userId, 'booking-confirmed', { car: carName(booking.car) }, `/bookings/${id}`)
}

export async function rejectBooking(id: string, input: { reason: (typeof REJECT_REASONS)[number]; note?: string }) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: withCar })
  if (!booking) throw new HttpError(404, 'booking-not-found')
  if (booking.status !== 'AWAITING_CONFIRMATION' || !booking.stripePaymentIntentId) throw new HttpError(409, 'not-awaiting-confirmation')
  const intent = await stripe().paymentIntents.retrieve(booking.stripePaymentIntentId)
  if (intent.status === 'requires_capture') await stripe().paymentIntents.cancel(intent.id)
  await prisma.booking.update({
    where: { id },
    data: { status: 'REJECTED', cancelledBy: 'HOST', cancelledAt: new Date(), cancelReason: input.reason, cancelNote: input.note || null },
  })
  await notify(booking.userId, 'booking-rejected', { car: carName(booking.car), reason: input.reason }, `/bookings/${id}`)
}

export async function cancelBooking(id: string, input: { reason: (typeof CANCEL_REASONS)[number]; note?: string; refund: number }) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: withCar })
  if (!booking) throw new HttpError(404, 'booking-not-found')
  if (booking.status !== 'CONFIRMED' || !booking.stripePaymentIntentId) throw new HttpError(409, 'not-confirmed')
  if (input.refund > booking.total - booking.refundedAmount) throw new HttpError(422, 'refund-too-large')
  if (input.refund > 0) {
    await stripe().refunds.create(
      { payment_intent: booking.stripePaymentIntentId, amount: toStripeAmount(input.refund), metadata: { bookingId: id, reason: input.reason } },
      { idempotencyKey: `cancel-${id}` },
    )
  }
  await prisma.booking.update({
    where: { id },
    data: {
      status: 'CANCELLED', cancelledBy: 'HOST', cancelledAt: new Date(), cancelReason: input.reason,
      cancelNote: input.note || null, refundedAmount: { increment: input.refund },
    },
  })
  await notify(booking.userId, 'booking-cancelled', { car: carName(booking.car), refund: input.refund }, `/bookings/${id}`)
}

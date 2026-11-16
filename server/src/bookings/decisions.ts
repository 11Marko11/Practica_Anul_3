import type { FastifyBaseLogger } from 'fastify'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'
import { stripe } from '../payments/stripe.js'
import type { REJECT_REASONS } from './dto.js'

// The car's host answers a paid booking. Confirming takes the held money from the card;
// rejecting releases the hold, so the customer pays nothing.

export async function confirmBooking(id: string, log: FastifyBaseLogger) {
  const booking = await prisma.booking.findUnique({ where: { id } })
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
  await prisma.booking.update({ where: { id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } })
}

export async function rejectBooking(id: string, input: { reason: (typeof REJECT_REASONS)[number]; note?: string }) {
  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) throw new HttpError(404, 'booking-not-found')
  if (booking.status !== 'AWAITING_CONFIRMATION' || !booking.stripePaymentIntentId) throw new HttpError(409, 'not-awaiting-confirmation')
  const intent = await stripe().paymentIntents.retrieve(booking.stripePaymentIntentId)
  if (intent.status === 'requires_capture') await stripe().paymentIntents.cancel(intent.id)
  await prisma.booking.update({
    where: { id },
    data: { status: 'REJECTED', cancelledBy: 'HOST', cancelledAt: new Date(), cancelReason: input.reason, cancelNote: input.note || null },
  })
}

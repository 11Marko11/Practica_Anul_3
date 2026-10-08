import type Stripe from 'stripe'
import { prisma } from '../db.js'
import { stripe } from '../payments/stripe.js'

// Moves an unpaid booking forward from what Stripe reports about its Checkout Session.
// Called by the webhook and when the customer returns from Stripe, so either is enough.
export async function syncCheckout(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking || booking.status !== 'PENDING_PAYMENT' || !booking.stripeCheckoutSessionId) return
  const session = await stripe().checkout.sessions.retrieve(booking.stripeCheckoutSessionId, { expand: ['payment_intent'] })
  const intent = session.payment_intent as Stripe.PaymentIntent | null

  // The card was authorised but not charged: the money is on hold until the admin decides.
  if (session.status === 'complete' && intent?.status === 'requires_capture') {
    await prisma.booking.updateMany({
      where: { id: booking.id, status: 'PENDING_PAYMENT' },
      data: { status: 'AWAITING_CONFIRMATION', stripePaymentIntentId: intent.id, authorizedAt: new Date() },
    })
  } else if (session.status === 'expired') {
    await markUnpaidExpired(booking.id)
  }
}

export function markUnpaidExpired(bookingId: string) {
  return prisma.booking.updateMany({ where: { id: bookingId, status: 'PENDING_PAYMENT' }, data: { status: 'EXPIRED' } })
}

// Stripe released an unconfirmed hold (after 7 days): the booking can no longer be charged.
export function markHoldReleased(paymentIntentId: string) {
  return prisma.booking.updateMany({
    where: { stripePaymentIntentId: paymentIntentId, status: 'AWAITING_CONFIRMATION' },
    data: { status: 'EXPIRED' },
  })
}

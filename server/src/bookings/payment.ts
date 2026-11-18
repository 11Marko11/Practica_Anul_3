import type Stripe from 'stripe'
import { z } from 'zod'
import { cityOf } from '../cars/cities.js'
import { prisma } from '../db.js'
import { carName, notify } from '../notifications/notify.js'
import { stripe } from '../payments/stripe.js'

// Moves an unpaid booking forward from what Stripe reports about its Checkout Session.
// Called by the webhook and when the customer returns from Stripe, so either is enough.
export async function syncCheckout(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking || booking.status !== 'PENDING_PAYMENT' || !booking.stripeCheckoutSessionId) return
  const session = await stripe().checkout.sessions.retrieve(booking.stripeCheckoutSessionId, { expand: ['payment_intent'] })
  const intent = session.payment_intent as Stripe.PaymentIntent | null

  // The card was authorised but not charged: the money is on hold until the car's host decides.
  if (session.status === 'complete' && intent?.status === 'requires_capture') {
    const done = await prisma.booking.updateMany({
      where: { id: booking.id, status: 'PENDING_PAYMENT' },
      data: { status: 'AWAITING_CONFIRMATION', stripePaymentIntentId: intent.id, authorizedAt: new Date() },
    })
    if (done.count) {
      const car = await prisma.car.findUniqueOrThrow({ where: { id: booking.carId }, select: { brand: true, model: true, host: { select: { userId: true } } } })
      await notify(car.host.userId, 'booking-awaiting', { car: carName(car), from: booking.pickupDate.toISOString().slice(0, 10), to: booking.returnDate.toISOString().slice(0, 10) }, '/host?tab=bookings')
    }
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

// Where the car was left at the end of a trip. Only inside Moldova (a rough box around the country).
export const returnPlace = z.object({ address: z.string().trim().min(3).max(300), lat: z.number().min(45.4).max(48.6), lng: z.number().min(26.5).max(30.3) })
export type ReturnPlace = z.infer<typeof returnPlace>

// Ends a confirmed trip (the car was returned) with where the car was left; it then counts as a
// trip for the host and the customer may review the car. Only the customer who rented the car or
// the car's host can do it; only one wins if both do it at the same moment.
export async function completeBooking(bookingId: string, place: ReturnPlace, by: 'CUSTOMER' | 'HOST') {
  const done = await prisma.booking.updateMany({
    where: { id: bookingId, status: 'CONFIRMED' },
    data: { status: 'COMPLETED', returnAddress: place.address, returnLat: place.lat, returnLng: place.lng, completedAt: new Date(), completedBy: by },
  })
  if (!done.count) return
  const b = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, select: { userId: true, carId: true, car: { select: { brand: true, model: true, host: { select: { userId: true } } } } } })
  // The next customer picks the car up where it was left.
  await prisma.car.update({
    where: { id: b.carId },
    data: { pickupAddress: place.address, pickupLat: place.lat, pickupLng: place.lng, city: cityOf(place.address, place.lat, place.lng) },
  })
  // Tell the other side where the car is.
  if (by === 'CUSTOMER') await notify(b.car.host.userId, 'booking-returned', { car: carName(b.car), address: place.address }, '/host?tab=bookings')
  else await notify(b.userId, 'booking-completed', { car: carName(b.car), address: place.address }, `/bookings/${bookingId}`)
}

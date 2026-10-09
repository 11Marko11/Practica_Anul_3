import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireUser } from '../auth/guards.js'
import { blockingBookings, overlapping } from '../bookings/availability.js'
import { addDays, daysBetween, fromIsoDate, isoDate, todayInMoldova } from '../bookings/dates.js'
import { bookingInclude, customerCanCancel, customerCanComplete, toBookingDto } from '../bookings/dto.js'
import { completeBooking } from '../bookings/payment.js'
import { syncCheckout } from '../bookings/payment.js'
import { assertInMoldova, deliveryQuote } from '../bookings/pricing.js'
import { prisma } from '../db.js'
import { env } from '../env.js'
import { HttpError } from '../http/errors.js'
import { stripe, toStripeAmount } from '../payments/stripe.js'

const MAX_DAYS = 60
const BOOK_AHEAD_DAYS = 365
const PAYMENT_WINDOW_MS = 31 * 60_000 // Stripe Checkout must stay open at least 30 minutes

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const createBody = z.object({
  carSlug: z.string().max(200),
  pickupDate: date,
  returnDate: date,
  handover: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('PICKUP') }),
    z.object({ mode: z.literal('DELIVERY'), address: z.string().trim().min(3).max(300), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  ]),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{6,20}$/),
  note: z.string().trim().max(1000).optional(),
  lang: z.enum(['ro', 'en', 'ru']).default('ro'),
})
const idParam = z.object({ id: z.uuid() })
const slugParam = z.object({ slug: z.string().max(200) })

async function findOwnBooking(id: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude })
  if (!booking || booking.userId !== userId) throw new HttpError(404, 'booking-not-found')
  return booking
}

export async function bookingRoutes(app: FastifyInstance) {
  // Dates a car is already taken, so the website can warn before the customer books.
  app.get('/cars/:slug/availability', async request => {
    const { slug } = slugParam.parse(request.params)
    const car = await prisma.car.findUnique({ where: { slug }, select: { id: true } })
    if (!car) throw new HttpError(404, 'car-not-found')
    const taken = await prisma.booking.findMany({
      where: { carId: car.id, returnDate: { gt: fromIsoDate(todayInMoldova()) }, ...blockingBookings() },
      select: { pickupDate: true, returnDate: true },
      orderBy: { pickupDate: 'asc' },
    })
    return { taken: taken.map(b => ({ from: isoDate(b.pickupDate), to: isoDate(b.returnDate) })) }
  })

  // Cars that can't be rented for [from, to): already booked, or held by an unpaid booking.
  // The car list hides them so customers only see cars they can actually book.
  app.get('/cars/unavailable', async request => {
    const { from, to } = z.object({ from: date, to: date }).parse(request.query)
    if (to <= from) throw new HttpError(422, 'invalid-dates')
    const taken = await prisma.booking.findMany({
      where: { pickupDate: { lt: fromIsoDate(to) }, returnDate: { gt: fromIsoDate(from) }, ...blockingBookings() },
      select: { carId: true },
      distinct: ['carId'],
    })
    return { carIds: taken.map(b => b.carId) }
  })

  // Creates the booking and a Stripe Checkout page where the card is authorised, not charged.
  app.post('/bookings', { preHandler: requireUser, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = createBody.parse(request.body)
    const user = request.user!
    const payments = stripe() // fail early if payments are not configured

    const today = todayInMoldova()
    const days = daysBetween(body.pickupDate, body.returnDate)
    if (body.pickupDate < today || body.pickupDate > addDays(today, BOOK_AHEAD_DAYS)) throw new HttpError(422, 'invalid-dates')
    if (days < 1 || days > MAX_DAYS) throw new HttpError(422, 'invalid-dates')

    const car = await prisma.car.findUnique({ where: { slug: body.carSlug } })
    if (!car || car.status !== 'ACTIVE') throw new HttpError(404, 'car-not-found')

    let delivery: { address: string; lat: number; lng: number; km: number; fee: number } | null = null
    if (body.handover.mode === 'DELIVERY') {
      const { address, lat, lng } = body.handover
      await assertInMoldova({ lat, lng }, env.SITE_URL)
      delivery = { address, lat, lng, ...deliveryQuote({ lat: car.pickupLat, lng: car.pickupLng }, { lat, lng }) }
    }
    const rentalPrice = car.pricePerDay * days
    const total = rentalPrice + (delivery?.fee ?? 0)
    const paymentExpiresAt = new Date(Date.now() + PAYMENT_WINDOW_MS)

    // One booking at a time per car (advisory lock), so two customers can't take the same dates.
    const booking = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${car.id})`
      const pickupDate = fromIsoDate(body.pickupDate)
      const returnDate = fromIsoDate(body.returnDate)
      if (await tx.booking.findFirst({ where: overlapping(car.id, pickupDate, returnDate), select: { id: true } })) {
        throw new HttpError(409, 'dates-unavailable')
      }
      return tx.booking.create({
        data: {
          userId: user.id, carId: car.id, pickupDate, returnDate, days, handover: body.handover.mode,
          deliveryAddress: delivery?.address, deliveryLat: delivery?.lat, deliveryLng: delivery?.lng, deliveryKm: delivery?.km,
          rentalPrice, deliveryFee: delivery?.fee ?? 0, total, phone: body.phone, note: body.note || null, paymentExpiresAt,
        },
      })
    })

    let session
    try {
      session = await payments.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email,
        client_reference_id: booking.id,
        metadata: { bookingId: booking.id },
        payment_intent_data: {
          capture_method: 'manual',
          metadata: { bookingId: booking.id },
          description: `Rent Motors: ${car.brand} ${car.model}, ${body.pickupDate} → ${body.returnDate}`,
        },
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'mdl',
            unit_amount: toStripeAmount(total),
            product_data: { name: `${car.brand} ${car.model}`, description: `${body.pickupDate} → ${body.returnDate} (${days})` },
          },
        }],
        locale: body.lang,
        expires_at: Math.floor(paymentExpiresAt.getTime() / 1000),
        success_url: `${env.SITE_URL}/bookings/${booking.id}?payment=success`,
        cancel_url: `${env.SITE_URL}/bookings/${booking.id}?payment=cancelled`,
      })
    } catch (err) {
      request.log.error(err, 'Stripe Checkout session failed')
      await prisma.booking.delete({ where: { id: booking.id } })
      throw new HttpError(502, 'payment-provider-error')
    }
    await prisma.booking.update({ where: { id: booking.id }, data: { stripeCheckoutSessionId: session.id } })
    reply.code(201)
    return { bookingId: booking.id, checkoutUrl: session.url }
  })

  app.get('/bookings', { preHandler: requireUser }, async request => {
    const user = request.user!
    const pending = await prisma.booking.findMany({ where: { userId: user.id, status: 'PENDING_PAYMENT' }, select: { id: true } })
    await Promise.all(pending.map(b => syncCheckout(b.id).catch(err => request.log.warn(err, 'Checkout sync failed'))))
    const bookings = await prisma.booking.findMany({ where: { userId: user.id }, include: bookingInclude, orderBy: { createdAt: 'desc' } })
    return { bookings: bookings.map(b => toBookingDto(b)) }
  })

  app.get('/bookings/:id', { preHandler: requireUser }, async request => {
    const { id } = idParam.parse(request.params)
    await findOwnBooking(id, request.user!.id)
    await syncCheckout(id).catch(err => request.log.warn(err, 'Checkout sync failed'))
    return { booking: toBookingDto(await findOwnBooking(id, request.user!.id)) }
  })

  // Back to the Stripe page for a booking that is not paid yet.
  app.post('/bookings/:id/pay', { preHandler: requireUser }, async request => {
    const { id } = idParam.parse(request.params)
    const booking = await findOwnBooking(id, request.user!.id)
    if (booking.status !== 'PENDING_PAYMENT' || !booking.stripeCheckoutSessionId) throw new HttpError(409, 'not-payable')
    const session = await stripe().checkout.sessions.retrieve(booking.stripeCheckoutSessionId)
    if (session.status !== 'open' || !session.url) {
      await syncCheckout(id)
      throw new HttpError(409, 'payment-expired')
    }
    return { checkoutUrl: session.url }
  })

  // Customers can cancel only until the admin confirms. Nothing has been charged by then:
  // the unpaid Checkout page is closed, or the hold on the card is released.
  app.post('/bookings/:id/cancel', { preHandler: requireUser }, async request => {
    const { id } = idParam.parse(request.params)
    const booking = await findOwnBooking(id, request.user!.id)
    if (!customerCanCancel(booking)) throw new HttpError(409, 'cannot-cancel')
    const payments = stripe()

    if (booking.status === 'PENDING_PAYMENT' && booking.stripeCheckoutSessionId) {
      await payments.checkout.sessions.expire(booking.stripeCheckoutSessionId).catch(() => {})
      await syncCheckout(id) // it may have been paid in the meantime
    }
    const fresh = await prisma.booking.findUniqueOrThrow({ where: { id } })
    if (fresh.status === 'AWAITING_CONFIRMATION' && fresh.stripePaymentIntentId) {
      try {
        await payments.paymentIntents.cancel(fresh.stripePaymentIntentId)
      } catch {
        // The admin confirmed (and charged) at the same moment: too late to cancel.
        throw new HttpError(409, 'cannot-cancel')
      }
    }
    const done = await prisma.booking.updateMany({
      where: { id, status: { in: ['PENDING_PAYMENT', 'AWAITING_CONFIRMATION', 'EXPIRED'] } },
      data: { status: 'CANCELLED', cancelledBy: 'CUSTOMER', cancelledAt: new Date() },
    })
    if (done.count === 0) throw new HttpError(409, 'cannot-cancel')
    return { booking: toBookingDto(await findOwnBooking(id, request.user!.id)) }
  })

  // After confirmation the customer ends the booking once the car is returned (from the
  // pick-up day on). The trip then counts for the host and the customer can review the car.
  app.post('/bookings/:id/complete', { preHandler: requireUser }, async request => {
    const { id } = idParam.parse(request.params)
    const booking = await findOwnBooking(id, request.user!.id)
    if (!customerCanComplete(booking)) throw new HttpError(409, booking.status === 'CONFIRMED' ? 'too-early-to-complete' : 'not-confirmed')
    await completeBooking(id, booking.carId)
    return { booking: toBookingDto(await findOwnBooking(id, request.user!.id)) }
  })
}


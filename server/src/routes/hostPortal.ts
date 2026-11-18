import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { requireHost } from '../auth/guards.js'
import { isoDate, todayInMoldova } from '../bookings/dates.js'
import { cancelBooking, confirmBooking, rejectBooking } from '../bookings/decisions.js'
import { CANCEL_REASONS, customerCanComplete, REJECT_REASONS } from '../bookings/dto.js'
import { completeBooking, returnPlace } from '../bookings/payment.js'
import { ledger } from '../bookings/ledger.js'
import { hostMonths, moldovaMonth } from '../finance/hostIncome.js'
import { startCommissionCheckout, syncCommissionSession } from '../finance/commissionPayment.js'
import { carData, carInclude, hostCarInput, REQUIRED_CAR_DOCUMENTS, type CarInput } from '../cars/dto.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'
import { readDocumentUpload } from '../http/upload.js'
import { documentDto, hostDocumentMeta } from './hostApplication.js'
import { carDto, photoRows, uniqueSlug } from './cars.js'

// Bookings that matter to a host: paid ones, whether still waiting, going ahead, done or called off.
const SHOWN = ['AWAITING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED'] as const
// Money the host's car brought in: charged when the admin confirmed, minus refunds.
const earned = (b: { confirmedAt: Date | null; total: number; refundedAmount: number }) => (b.confirmedAt ? b.total - b.refundedAmount : 0)
const average = (ratings: number[]) => (ratings.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null)

const idParam = z.object({ id: z.coerce.number().int().positive() })
const hostId = (request: FastifyRequest) => request.user!.host!.id

// One of the signed-in host's cars (not one they removed).
async function ownCar(request: FastifyRequest) {
  const { id } = idParam.parse(request.params)
  const car = await prisma.car.findFirst({ where: { id, hostId: hostId(request), status: { not: 'REMOVED' } }, include: carInclude })
  if (!car) throw new HttpError(404, 'car-not-found')
  return car
}

const CAR_DOCUMENT_TYPES = ['CAR_REGISTRATION', 'CAR_INSURANCE', 'CAR_OWNERSHIP'] as const

// The papers sent with a car form: the host's own uploads, not yet tied to another car.
// Returns what to save, whether the required ones are all there (a car may be saved without
// them, but stays off the site) and whether they changed (then the admin checks the car again).
async function carPapers(request: FastifyRequest, input: CarInput, carId?: number) {
  const ids = [...new Set(input.documentIds)]
  const docs = await prisma.hostDocument.findMany({
    where: { id: { in: ids }, userId: request.user!.id, type: { in: [...CAR_DOCUMENT_TYPES] }, OR: [{ carId: null }, ...(carId ? [{ carId }] : [])] },
    select: { id: true, type: true, carId: true },
  })
  if (docs.length !== ids.length) throw new HttpError(400, 'invalid-documents')
  const types = new Set(docs.map(d => d.type))
  const complete = REQUIRED_CAR_DOCUMENTS.every(t => types.has(t))
  const before = carId ? (await prisma.hostDocument.findMany({ where: { carId }, select: { id: true } })).map(d => d.id) : []
  const changed = before.length !== ids.length || before.some(id => !ids.includes(id))
  return { ids, complete, changed }
}

// Sent to (or back to) the admin for a check of the papers.
const forReview = () => ({ reviewStatus: 'PENDING' as const, reviewNote: null, reviewSubmittedAt: new Date() })
// Without its papers the car is kept but not shown, and not sent to the admin yet.
const withoutPapers = () => ({ reviewStatus: 'NO_DOCUMENTS' as const, reviewNote: null, reviewSubmittedAt: null })

// GET /api/host: everything a host follows on their pages. Customer contact details are
// shown only once the admin has confirmed the booking. Hosts add, edit and remove their own cars.
export async function hostPortalRoutes(app: FastifyInstance) {
  app.get('/host', { preHandler: requireHost }, async request => {
    const host = await prisma.host.findUnique({
      where: { id: request.user!.host!.id },
      include: {
        cars: {
          orderBy: [{ brand: 'asc' }, { model: 'asc' }],
          include: {
            photos: { orderBy: { position: 'asc' }, take: 1 },
            bookings: { where: { status: { in: [...SHOWN] } }, include: { user: { select: { name: true, avatarUrl: true } } }, orderBy: { pickupDate: 'desc' } },
            reviews: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    })
    if (!host) throw new HttpError(404, 'host-not-found')

    const today = todayInMoldova()
    const bookings = host.cars.flatMap(car =>
      car.bookings.map(b => {
        const confirmed = b.status === 'CONFIRMED' || b.status === 'COMPLETED'
        return {
          id: b.id,
          car: { id: car.id, slug: car.slug, brand: car.brand, model: car.model, photo: car.photos[0]?.url ?? null },
          pickupDate: isoDate(b.pickupDate),
          returnDate: isoDate(b.returnDate),
          days: b.days,
          handover: b.handover,
          deliveryAddress: b.deliveryAddress,
          status: b.status,
          total: b.total,
          earned: earned(b),
          refundedAmount: b.refundedAmount,
          canComplete: customerCanComplete(b),
          returnLocation: b.returnAddress ? { address: b.returnAddress, lat: b.returnLat, lng: b.returnLng, by: b.completedBy } : null,
          commissionRate: b.commissionRate,
          // The name helps the host decide; the phone shows once the booking is confirmed.
          customer: { name: b.user.name, avatarUrl: b.user.avatarUrl, phone: confirmed ? b.phone : null },
          // Stripe releases the card hold after 7 days: the host must answer before then.
          holdExpiresAt: b.status === 'AWAITING_CONFIRMATION' && b.authorizedAt ? new Date(b.authorizedAt.getTime() + 7 * 86_400_000).toISOString() : null,
          createdAt: b.createdAt.toISOString(),
        }
      }),
    )
    const reviews = host.cars
      .flatMap(car => car.reviews.map(r => ({
        id: r.id, car: { id: car.id, slug: car.slug, brand: car.brand, model: car.model },
        name: r.authorName, rating: r.rating, text: r.text, date: isoDate(r.createdAt),
      })))
      .sort((a, b) => b.date.localeCompare(a.date))

    const allCars = host.cars.map(car => {
      const active = car.bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'AWAITING_CONFIRMATION')
      const now = active.find(b => isoDate(b.pickupDate) <= today && isoDate(b.returnDate) >= today)
      const next = active.filter(b => isoDate(b.pickupDate) > today).sort((a, b) => a.pickupDate.getTime() - b.pickupDate.getTime())[0]
      return {
        id: car.id, slug: car.slug, brand: car.brand, model: car.model, year: car.year,
        photo: car.photos[0]?.url ?? null, pricePerDay: car.pricePerDay, city: car.city, status: car.status,
        reviewStatus: car.reviewStatus, reviewNote: car.reviewNote,
        rating: average(car.reviews.map(r => r.rating)),
        reviews: car.reviews.length,
        trips: car.bookings.filter(b => b.status === 'COMPLETED').length,
        earned: car.bookings.reduce((s, b) => s + earned(b), 0),
        rentedNow: now ? { pickupDate: isoDate(now.pickupDate), returnDate: isoDate(now.returnDate) } : null,
        nextBooking: next ? { pickupDate: isoDate(next.pickupDate), returnDate: isoDate(next.returnDate) } : null,
      }
    })

    // Removed cars no longer show, but their trips and earnings still count.
    const cars = allCars.filter(c => c.status !== 'REMOVED')
    return {
      host: {
        id: host.id,
        name: host.name,
        phone: host.phone,
        rating: average(reviews.map(r => r.rating)),
        reviews: reviews.length,
        trips: allCars.reduce((s, c) => s + c.trips, 0),
        earned: allCars.reduce((s, c) => s + c.earned, 0),
        awaiting: bookings.filter(b => b.status === 'AWAITING_CONFIRMATION').length,
      },
      cars,
      bookings: bookings.sort((a, b) => b.pickupDate.localeCompare(a.pickupDate)),
      reviews,
    }
  })

  // The host's money: income per month (charged, refunded, Rent Motors' commission, what they
  // keep and whether the commission was paid) and every money movement of their cars.
  app.get('/host/finances', { preHandler: requireHost }, async request => {
    const id = hostId(request)
    const [host, entries] = await Promise.all([
      prisma.host.findUniqueOrThrow({ where: { id }, select: { commissionRate: true } }),
      ledger({ car: { hostId: id } }),
    ])
    const months = await hostMonths(entries)
    const now = moldovaMonth(new Date())
    return {
      rate: host.commissionRate,
      currentMonth: now,
      months: months.map(({ hostId: _, ...m }) => m),
      // Commission of finished months not paid yet.
      due: months.filter(m => !m.current && !m.paid && m.commission > 0).reduce((s, m) => s + m.commission, 0),
      onHold: entries.filter(e => e.type === 'hold').reduce((s, e) => s + e.amount, 0),
      entries: entries.map(e => ({ id: e.id, type: e.type, at: e.at.toISOString(), month: moldovaMonth(e.at), amount: e.amount, rate: e.rate, booking: { id: e.booking.id, car: e.booking.car, customer: e.booking.customer } })),
    }
  })

  // Pay a finished month's commission by card: answers with the Stripe payment page.
  app.post('/host/finances/:month/pay', { preHandler: requireHost, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async request => {
    const { month } = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(request.params)
    const { lang } = z.object({ lang: z.string().max(5).default('ro') }).parse(request.body ?? {})
    return { checkoutUrl: await startCommissionCheckout(hostId(request), month, request.user!.email, lang) }
  })

  // Back from the payment page: record the payment at once (the webhook does it too).
  app.post('/host/finances/sync', { preHandler: requireHost }, async request => {
    const { sessionId } = z.object({ sessionId: z.string().min(10).max(200) }).parse(request.body)
    const session = await prisma.hostCommissionPayment.findUnique({ where: { stripeSessionId: sessionId }, select: { hostId: true } })
    if (session && session.hostId !== hostId(request)) throw new HttpError(404, 'not-found')
    return { month: await syncCommissionSession(sessionId).catch(() => null) }
  })

  // How many paid bookings wait for this host's answer, for the menu badge.
  app.get('/host/summary', { preHandler: requireHost }, async request => ({
    awaiting: await prisma.booking.count({ where: { status: 'AWAITING_CONFIRMATION', car: { hostId: hostId(request) } } }),
  }))

  // The host answers a paid booking of one of their cars: confirm (the money is taken from the
  // card) or reject with a reason the customer sees (the card hold is released).
  async function ownBooking(request: FastifyRequest) {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const booking = await prisma.booking.findFirst({ where: { id, car: { hostId: hostId(request) } }, select: { id: true } })
    if (!booking) throw new HttpError(404, 'booking-not-found')
    return booking.id
  }

  app.post('/host/bookings/:id/confirm', { preHandler: requireHost }, async request => {
    await confirmBooking(await ownBooking(request), request.log)
    return { ok: true }
  })

  app.post('/host/bookings/:id/reject', { preHandler: requireHost }, async request => {
    const id = await ownBooking(request)
    const body = z
      .object({ reason: z.enum(REJECT_REASONS), note: z.string().trim().max(1000).optional() })
      .refine(b => b.reason !== 'other' || !!b.note, { path: ['note'], message: 'Explain the reason' })
      .parse(request.body)
    await rejectBooking(id, body)
    return { ok: true }
  })

  // The car was returned: the host ends the trip (from the pick-up day on), saying where the car
  // was left. The trip counts, and the customer may review the car.
  app.post('/host/bookings/:id/complete', { preHandler: requireHost }, async request => {
    const id = await ownBooking(request)
    const place = returnPlace.parse(request.body)
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id }, select: { status: true, pickupDate: true } })
    if (!customerCanComplete(booking)) throw new HttpError(409, booking.status === 'CONFIRMED' ? 'too-early-to-complete' : 'not-confirmed')
    await completeBooking(id, place, 'HOST')
    return { ok: true }
  })

  // Cancel a confirmed booking with a reason, refunding all, part or none of the money.
  app.post('/host/bookings/:id/cancel', { preHandler: requireHost }, async request => {
    const id = await ownBooking(request)
    const body = z
      .object({ reason: z.enum(CANCEL_REASONS), note: z.string().trim().max(1000).optional(), refund: z.int().min(0) })
      .refine(b => b.reason !== 'other' || !!b.note, { path: ['note'], message: 'Explain the reason' })
      .parse(request.body)
    await cancelBooking(id, body)
    return { ok: true }
  })

  // The full car with its papers, for the host's edit form.
  app.get('/host/cars/:id', { preHandler: requireHost }, async request => {
    const car = await ownCar(request)
    const documents = await prisma.hostDocument.findMany({ where: { carId: car.id }, select: hostDocumentMeta, orderBy: { createdAt: 'asc' } })
    return { car: await carDto(car), review: { status: car.reviewStatus, note: car.reviewNote }, documents: documents.map(documentDto) }
  })

  // One paper of a car (registration, RCA insurance, contract), sent later with the car form.
  app.post('/host/documents', { preHandler: requireHost, config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const userId = request.user!.id
    if ((await prisma.hostDocument.count({ where: { userId, carId: null, type: { in: [...CAR_DOCUMENT_TYPES] } } })) >= 30) throw new HttpError(409, 'too-many-documents')
    const upload = await readDocumentUpload(request, CAR_DOCUMENT_TYPES)
    const doc = await prisma.hostDocument.create({ data: { userId, ...upload }, select: hostDocumentMeta })
    reply.code(201)
    return { document: documentDto(doc) }
  })

  app.post('/host/cars', { preHandler: requireHost }, async (request, reply) => {
    const input = hostCarInput.parse(request.body)
    const papers = await carPapers(request, input)
    const car = await prisma.$transaction(async tx => {
      const created = await tx.car.create({
        data: { ...carData(input), ...(papers.complete ? forReview() : withoutPapers()), hostId: hostId(request), slug: await uniqueSlug(input.brand, input.model), photos: { create: photoRows(input.photos) } },
        include: carInclude,
      })
      await tx.hostDocument.updateMany({ where: { id: { in: papers.ids } }, data: { carId: created.id } })
      return created
    })
    reply.code(201)
    return { car: await carDto(car) }
  })

  app.put('/host/cars/:id', { preHandler: requireHost }, async request => {
    const current = await ownCar(request)
    const input = hostCarInput.parse(request.body)
    const papers = await carPapers(request, input, current.id)
    // New papers, another car (brand, model, year) or a rejected car being fixed: checked again.
    const recheck = papers.changed || current.reviewStatus === 'REJECTED' || current.reviewStatus === 'NO_DOCUMENTS' || current.brand !== input.brand || current.model !== input.model || current.year !== input.year
    const review = !papers.complete ? withoutPapers() : recheck ? forReview() : {}
    const credits = new Map(current.photos.map(p => [p.url, { credit: p.credit, creditUrl: p.creditUrl }]))
    const car = await prisma.$transaction(async tx => {
      await tx.hostDocument.deleteMany({ where: { carId: current.id, id: { notIn: papers.ids } } })
      await tx.hostDocument.updateMany({ where: { id: { in: papers.ids } }, data: { carId: current.id } })
      return tx.car.update({
        where: { id: current.id },
        data: { ...carData(input), ...review, photos: { deleteMany: {}, create: photoRows(input.photos, credits) } },
        include: carInclude,
      })
    })
    return { car: await carDto(car) }
  })

  // The car leaves the site at once. Not while a booking is still going on (the admin
  // handles those); cars with past bookings are kept for that history as REMOVED.
  app.delete('/host/cars/:id', { preHandler: requireHost }, async request => {
    const car = await ownCar(request)
    const active = await prisma.booking.count({
      where: {
        carId: car.id,
        OR: [{ status: { in: ['AWAITING_CONFIRMATION', 'CONFIRMED'] } }, { status: 'PENDING_PAYMENT', paymentExpiresAt: { gt: new Date() } }],
      },
    })
    if (active > 0) throw new HttpError(409, 'car-has-active-bookings')
    const past = await prisma.booking.count({ where: { carId: car.id } })
    if (past > 0) await prisma.car.update({ where: { id: car.id }, data: { status: 'REMOVED' } })
    else await prisma.car.delete({ where: { id: car.id } })
    return { ok: true }
  })
}

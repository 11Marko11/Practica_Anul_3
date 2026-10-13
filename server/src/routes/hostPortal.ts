import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { requireHost } from '../auth/guards.js'
import { isoDate, todayInMoldova } from '../bookings/dates.js'
import { carData, carInclude, hostCarInput } from '../cars/dto.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'
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
            bookings: { where: { status: { in: [...SHOWN] } }, include: { user: { select: { name: true } } }, orderBy: { pickupDate: 'desc' } },
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
          car: { id: car.id, slug: car.slug, brand: car.brand, model: car.model },
          pickupDate: isoDate(b.pickupDate),
          returnDate: isoDate(b.returnDate),
          days: b.days,
          handover: b.handover,
          deliveryAddress: b.deliveryAddress,
          status: b.status,
          total: b.total,
          earned: earned(b),
          customer: confirmed ? { name: b.user.name, phone: b.phone } : null,
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
        upcoming: bookings.filter(b => (b.status === 'CONFIRMED' || b.status === 'AWAITING_CONFIRMATION') && b.returnDate >= today).length,
      },
      cars,
      bookings: bookings.sort((a, b) => b.pickupDate.localeCompare(a.pickupDate)),
      reviews,
    }
  })

  // The full car, for the host's edit form.
  app.get('/host/cars/:id', { preHandler: requireHost }, async request => ({ car: await carDto(await ownCar(request)) }))

  app.post('/host/cars', { preHandler: requireHost }, async (request, reply) => {
    const input = hostCarInput.parse(request.body)
    const car = await prisma.car.create({
      data: { ...carData(input), hostId: hostId(request), slug: await uniqueSlug(input.brand, input.model), photos: { create: photoRows(input.photos) } },
      include: carInclude,
    })
    reply.code(201)
    return { car: await carDto(car) }
  })

  app.put('/host/cars/:id', { preHandler: requireHost }, async request => {
    const current = await ownCar(request)
    const input = hostCarInput.parse(request.body)
    const credits = new Map(current.photos.map(p => [p.url, { credit: p.credit, creditUrl: p.creditUrl }]))
    const car = await prisma.car.update({
      where: { id: current.id },
      data: { ...carData(input), photos: { deleteMany: {}, create: photoRows(input.photos, credits) } },
      include: carInclude,
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

import type { FastifyInstance } from 'fastify'
import { requireHost } from '../auth/guards.js'
import { isoDate, todayInMoldova } from '../bookings/dates.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'

// Bookings that matter to a host: paid ones, whether still waiting, going ahead, done or called off.
const SHOWN = ['AWAITING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED'] as const
// Money the host's car brought in: charged when the admin confirmed, minus refunds.
const earned = (b: { confirmedAt: Date | null; total: number; refundedAmount: number }) => (b.confirmedAt ? b.total - b.refundedAmount : 0)
const average = (ratings: number[]) => (ratings.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null)

// GET /api/host: everything a host follows on their pages, read-only. Customer contact
// details are shown only once the admin has confirmed the booking.
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

    const cars = host.cars.map(car => {
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

    return {
      host: {
        id: host.id,
        name: host.name,
        phone: host.phone,
        rating: average(reviews.map(r => r.rating)),
        reviews: reviews.length,
        trips: cars.reduce((s, c) => s + c.trips, 0),
        earned: cars.reduce((s, c) => s + c.earned, 0),
        upcoming: bookings.filter(b => (b.status === 'CONFIRMED' || b.status === 'AWAITING_CONFIRMATION') && b.returnDate >= today).length,
      },
      cars,
      bookings: bookings.sort((a, b) => b.pickupDate.localeCompare(a.pickupDate)),
      reviews,
    }
  })
}

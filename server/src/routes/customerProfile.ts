import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireUser } from '../auth/guards.js'
import { isoDate } from '../bookings/dates.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'

// Trips that count as rentals on the profile: going on now, or finished.
const RENTED = ['CONFIRMED', 'COMPLETED'] as const

const average = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null)

// A customer's profile, for admins and hosts only: the cars they rented, the reviews they left
// and what the hosts wrote about them after each trip. The email and phone are for admins only.
export async function customerProfileRoutes(app: FastifyInstance) {
  app.get('/customers/:id', { preHandler: requireUser }, async request => {
    const viewer = request.user!
    const admin = viewer.role === 'ADMIN'
    if (!admin && !viewer.host) throw new HttpError(403, 'forbidden')
    const { id } = z.object({ id: z.uuid() }).parse(request.params)

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        host: { select: { id: true } },
        bookings: {
          where: { status: { in: [...RENTED] } },
          orderBy: { pickupDate: 'desc' },
          include: {
            car: { select: { slug: true, brand: true, model: true, status: true, photos: { orderBy: { position: 'asc' }, take: 1 }, host: { select: { id: true, name: true } } } },
            review: true,
            customerReview: { include: { host: { select: { id: true, name: true } } } },
          },
        },
      },
    })
    if (!user || user.role === 'ADMIN') throw new HttpError(404, 'customer-not-found')

    const rentals = user.bookings.map(b => ({
      id: b.id,
      status: b.status,
      pickupDate: isoDate(b.pickupDate),
      returnDate: isoDate(b.returnDate),
      days: b.days,
      car: {
        slug: b.car.status === 'REMOVED' ? null : b.car.slug,
        name: `${b.car.brand} ${b.car.model}`,
        photo: b.car.photos[0]?.url ?? null,
        host: b.car.host,
      },
      // What the customer wrote about the car…
      review: b.review ? { rating: b.review.rating, text: b.review.text, date: isoDate(b.review.createdAt) } : null,
      // …and what the car's host wrote about the customer.
      hostReview: b.customerReview
        ? { rating: b.customerReview.rating, text: b.customerReview.text, date: isoDate(b.customerReview.createdAt), host: b.customerReview.host }
        : null,
    }))
    const hostRatings = rentals.flatMap(r => (r.hostReview ? [r.hostReview.rating] : []))

    return {
      customer: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        memberSince: isoDate(user.createdAt),
        verificationStatus: user.verificationStatus,
        deleted: !!user.deletedAt,
        isHost: !!user.host,
        email: admin ? (user.deletedAt ? user.deletedEmail : user.email) : null,
        phone: admin ? user.phone : null,
      },
      stats: {
        trips: rentals.filter(r => r.status === 'COMPLETED').length,
        rating: average(hostRatings),
        hostReviews: hostRatings.length,
        reviewsLeft: rentals.filter(r => r.review).length,
      },
      rentals,
    }
  })
}

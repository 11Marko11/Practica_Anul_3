import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireUser } from '../auth/guards.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'

const slugParam = z.object({ slug: z.string().max(200) })
const idParam = z.object({ id: z.uuid() })
const reviewInput = z.object({
  rating: z.int().min(1).max(5),
  text: z.string().trim().min(10).max(1000),
})

// A completed booking of this car by this user that has not been reviewed yet.
function reviewableBooking(userId: string, carId: number) {
  return prisma.booking.findFirst({
    where: { userId, carId, status: 'COMPLETED', review: null },
    orderBy: { returnDate: 'desc' },
    select: { id: true },
  })
}

async function findCarId(slug: string) {
  const car = await prisma.car.findUnique({ where: { slug }, select: { id: true } })
  if (!car) throw new HttpError(404, 'car-not-found')
  return car.id
}

export async function reviewRoutes(app: FastifyInstance) {
  // Reviews of a car, newest first, and whether the signed-in user may add one.
  app.get('/cars/:slug/reviews', async request => {
    const carId = await findCarId(slugParam.parse(request.params).slug)
    const user = request.user
    const [reviews, booking] = await Promise.all([
      prisma.review.findMany({ where: { carId }, orderBy: { createdAt: 'desc' } }),
      user ? reviewableBooking(user.id, carId) : null,
    ])
    return {
      reviews: reviews.map(r => ({
        id: r.id,
        name: r.authorName,
        rating: r.rating,
        date: r.createdAt.toISOString().slice(0, 10),
        text: r.text,
        mine: !!user && r.userId === user.id,
      })),
      canReview: !!booking,
    }
  })

  // Only customers who completed a trip with the car can review it, once per trip.
  app.post('/cars/:slug/reviews', { preHandler: requireUser }, async (request, reply) => {
    const carId = await findCarId(slugParam.parse(request.params).slug)
    const input = reviewInput.parse(request.body)
    const user = request.user!
    const booking = await reviewableBooking(user.id, carId)
    if (!booking) throw new HttpError(403, 'review-needs-trip')
    const review = await prisma.review.create({
      data: { carId, userId: user.id, bookingId: booking.id, authorName: user.name, rating: input.rating, text: input.text },
    })
    reply.code(201)
    return { id: review.id }
  })

  // Authors can delete their own review; admins can delete any.
  app.delete('/reviews/:id', { preHandler: requireUser }, async request => {
    const { id } = idParam.parse(request.params)
    const user = request.user!
    const review = await prisma.review.findUnique({ where: { id }, select: { userId: true } })
    if (!review) throw new HttpError(404, 'review-not-found')
    if (review.userId !== user.id && user.role !== 'ADMIN') throw new HttpError(403, 'forbidden')
    await prisma.review.delete({ where: { id } })
    return { ok: true }
  })
}

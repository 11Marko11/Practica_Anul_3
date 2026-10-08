import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'

// Real numbers for the home page: cars on offer, brands, average review and completed trips.
export async function statsRoutes(app: FastifyInstance) {
  app.get('/stats', async () => {
    const [brands, rating, completedTrips] = await Promise.all([
      prisma.car.groupBy({ by: ['brand'], where: { status: 'ACTIVE' }, _count: { _all: true }, orderBy: { brand: 'asc' } }),
      prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
    ])
    return {
      cars: brands.reduce((sum, b) => sum + b._count._all, 0),
      brands: brands.map(b => ({ name: b.brand, count: b._count._all })),
      averageRating: rating._avg.rating === null ? null : Math.round(rating._avg.rating * 10) / 10,
      reviewCount: rating._count._all,
      completedTrips,
    }
  })
}

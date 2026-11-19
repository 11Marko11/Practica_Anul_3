import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireUser } from '../auth/guards.js'
import { prisma } from '../db.js'

const carParam = z.object({ carId: z.coerce.number().int().positive() })

// The signed-in user's favourite cars (the hearts), newest first, as car ids.
async function favoriteIds(userId: string) {
  const rows = await prisma.favorite.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { carId: true } })
  return { carIds: rows.map(r => r.carId) }
}

export async function favoriteRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser)

  app.get('/favorites', async request => favoriteIds(request.user!.id))

  app.put('/favorites/:carId', async request => {
    const { carId } = carParam.parse(request.params)
    const userId = request.user!.id
    if (await prisma.car.count({ where: { id: carId } })) {
      await prisma.favorite.upsert({ where: { userId_carId: { userId, carId } }, create: { userId, carId }, update: {} })
    }
    return favoriteIds(userId)
  })

  app.delete('/favorites/:carId', async request => {
    const { carId } = carParam.parse(request.params)
    const userId = request.user!.id
    await prisma.favorite.deleteMany({ where: { userId, carId } })
    return favoriteIds(userId)
  })

  // After signing in: the cars the guest saved in the browser join the account's favourites.
  app.post('/favorites/merge', async request => {
    const { carIds } = z.object({ carIds: z.array(z.int().positive()).max(200) }).parse(request.body)
    const userId = request.user!.id
    const existing = await prisma.car.findMany({ where: { id: { in: carIds } }, select: { id: true } })
    if (existing.length) await prisma.favorite.createMany({ data: existing.map(c => ({ userId, carId: c.id })), skipDuplicates: true })
    return favoriteIds(userId)
  })
}

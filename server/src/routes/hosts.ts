import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../auth/guards.js'
import { hostStats } from '../cars/hostStats.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'

const idParam = z.object({ id: z.coerce.number().int().positive() })
const hostInput = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(30).optional().transform(v => v || null),
})

// Rating and trips are not edited by hand: they are calculated from reviews and completed rentals.
export async function hostRoutes(app: FastifyInstance) {
  app.get('/admin/hosts', { preHandler: requireAdmin }, async () => {
    const hosts = await prisma.host.findMany({
      orderBy: { name: 'asc' },
      include: { user: { select: { id: true, name: true, email: true, deletedEmail: true } }, cars: { select: { id: true, slug: true, brand: true, model: true, year: true, status: true }, orderBy: [{ brand: 'asc' }, { model: 'asc' }] } },
    })
    const stats = await hostStats(hosts.map(h => h.id))
    return {
      hosts: hosts.map(h => ({
        id: h.id,
        name: h.name,
        phone: h.phone,
        ...stats(h.id),
        // The user account with the host role, if any.
        account: h.user ? { id: h.user.id, name: h.user.name, email: h.user.deletedEmail ?? h.user.email } : null,
        createdAt: h.createdAt.toISOString(),
        cars: h.cars,
      })),
    }
  })

  app.post('/admin/hosts', { preHandler: requireAdmin }, async (request, reply) => {
    const input = hostInput.parse(request.body)
    const host = await prisma.host.create({ data: input })
    reply.code(201)
    return { id: host.id }
  })

  app.put('/admin/hosts/:id', { preHandler: requireAdmin }, async request => {
    const { id } = idParam.parse(request.params)
    const input = hostInput.parse(request.body)
    const done = await prisma.host.updateMany({ where: { id }, data: input })
    if (!done.count) throw new HttpError(404, 'host-not-found')
    return { ok: true }
  })

  // A host with cars keeps them; move or delete the cars first.
  app.delete('/admin/hosts/:id', { preHandler: requireAdmin }, async request => {
    const { id } = idParam.parse(request.params)
    const host = await prisma.host.findUnique({ where: { id }, select: { _count: { select: { cars: true } } } })
    if (!host) throw new HttpError(404, 'host-not-found')
    if (host._count.cars > 0) throw new HttpError(409, 'host-has-cars')
    await prisma.host.delete({ where: { id } })
    return { ok: true }
  })
}

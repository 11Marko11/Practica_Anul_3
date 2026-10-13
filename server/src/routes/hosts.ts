import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../auth/guards.js'
import { hashPassword } from '../auth/password.js'
import { hostStats } from '../cars/hostStats.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'

const idParam = z.object({ id: z.coerce.number().int().positive() })
const hostInput = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(30).optional().transform(v => v || null),
})
const email = z.string().trim().toLowerCase().max(254).pipe(z.email())
const password = z.string().min(8).max(200)
// Sign-in details of a host's account. The password is optional when the account exists.
const accountInput = z.object({ email, password: password.optional() })

async function emailFree(address: string, exceptUserId?: string | null) {
  const user = await prisma.user.findUnique({ where: { email: address }, select: { id: true } })
  if (user && user.id !== exceptUserId) throw new HttpError(409, 'email-taken')
}

// Rating and trips are not edited by hand: they are calculated from reviews and completed rentals.
export async function hostRoutes(app: FastifyInstance) {
  app.get('/admin/hosts', { preHandler: requireAdmin }, async () => {
    const hosts = await prisma.host.findMany({
      orderBy: { name: 'asc' },
      include: { user: { select: { id: true, name: true, email: true, deletedEmail: true, passwordHash: true } }, cars: { select: { id: true, slug: true, brand: true, model: true, year: true, status: true }, orderBy: [{ brand: 'asc' }, { model: 'asc' }] } },
    })
    const stats = await hostStats(hosts.map(h => h.id))
    return {
      hosts: hosts.map(h => ({
        id: h.id,
        name: h.name,
        phone: h.phone,
        ...stats(h.id),
        // The user account with the host role, if any.
        account: h.user ? { id: h.user.id, name: h.user.name, email: h.user.deletedEmail ?? h.user.email, hasPassword: h.user.passwordHash !== '!' } : null,
        createdAt: h.createdAt.toISOString(),
        cars: h.cars,
      })),
    }
  })

  // A new host always comes with their account, so they can sign in and add cars.
  app.post('/admin/hosts', { preHandler: requireAdmin }, async (request, reply) => {
    const input = hostInput.extend({ email, password }).parse(request.body)
    await emailFree(input.email)
    const host = await prisma.host.create({
      data: {
        name: input.name,
        phone: input.phone,
        user: {
          create: {
            name: input.name, email: input.email, passwordHash: await hashPassword(input.password),
            verificationStatus: 'VERIFIED', verifiedAt: new Date(),
          },
        },
      },
    })
    reply.code(201)
    return { id: host.id }
  })

  // Creates the host's account, or changes its email and (optionally) its password.
  // A new password signs the host out everywhere.
  app.put('/admin/hosts/:id/account', { preHandler: requireAdmin }, async request => {
    const { id } = idParam.parse(request.params)
    const input = accountInput.parse(request.body)
    const host = await prisma.host.findUnique({ where: { id }, select: { name: true, phone: true, userId: true } })
    if (!host) throw new HttpError(404, 'host-not-found')
    await emailFree(input.email, host.userId)
    if (!host.userId) {
      if (!input.password) throw new HttpError(400, 'validation')
      await prisma.host.update({
        where: { id },
        data: { user: { create: { name: host.name, email: input.email, passwordHash: await hashPassword(input.password), verificationStatus: 'VERIFIED', verifiedAt: new Date() } } },
      })
      return { ok: true }
    }
    const userId = host.userId
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { email: input.email, ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}) },
      }),
      ...(input.password ? [prisma.session.deleteMany({ where: { userId } })] : []),
    ])
    return { ok: true }
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

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../auth/guards.js'
import { hashPassword } from '../auth/password.js'
import { carInclude, isListed, LISTED, toCarDto } from '../cars/dto.js'
import { hostStats } from '../cars/hostStats.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'
import { removeHost } from '../hosts/removeHost.js'
import { COMMISSION_RATES } from '../hosts/commission.js'
import { notify } from '../notifications/notify.js'
import { normalizePhone } from '../auth/phone.js'

const idParam = z.object({ id: z.coerce.number().int().positive() })
const hostInput = z.object({
  name: z.string().trim().min(1).max(80),
  // Stored as "+37369123456"; a number that can't be read is refused.
  phone: z.string().trim().max(40).optional().transform((v, ctx) => {
    if (!v) return null
    const phone = normalizePhone(v)
    if (!phone) ctx.addIssue({ code: 'custom', message: 'invalid-phone' })
    return phone
  }),
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
  // Public profile of a host: their cars on the site and the reviews of all their cars.
  // Contact details and the account stay private.
  app.get('/hosts/:id', async request => {
    const { id } = idParam.parse(request.params)
    const host = await prisma.host.findUnique({
      where: { id },
      include: {
        cars: { where: LISTED, include: carInclude, orderBy: [{ brand: 'asc' }, { model: 'asc' }] },
        user: { select: { avatarUrl: true } },
      },
    })
    if (!host) throw new HttpError(404, 'host-not-found')
    const [stats, reviews] = await Promise.all([
      hostStats([host.id]),
      prisma.review.findMany({
        where: { car: { hostId: host.id } },
        include: { car: { select: { slug: true, brand: true, model: true, status: true, reviewStatus: true, condition: true } }, user: { select: { avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ])
    const hostStatsNow = stats(host.id)
    return {
      host: { id: host.id, name: host.name, avatarUrl: host.user?.avatarUrl ?? null, since: host.createdAt.toISOString().slice(0, 10), ...hostStatsNow, cars: host.cars.length },
      cars: host.cars.map(c => toCarDto(c, hostStatsNow)),
      reviews: reviews.map(r => ({
        id: r.id, name: r.authorName, avatarUrl: r.user?.avatarUrl ?? null, rating: r.rating, text: r.text, date: r.createdAt.toISOString().slice(0, 10),
        car: isListed(r.car) ? { slug: r.car.slug, name: `${r.car.brand} ${r.car.model}` } : { slug: null, name: `${r.car.brand} ${r.car.model}` },
      })),
    }
  })

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
        commissionRate: h.commissionRate,
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
    const input = hostInput.extend({ email, password, commissionRate: z.union(COMMISSION_RATES.map(r => z.literal(r))).default(10) }).parse(request.body)
    await emailFree(input.email)
    const host = await prisma.host.create({
      data: {
        name: input.name,
        phone: input.phone,
        commissionRate: input.commissionRate,
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

  // Changes Rent Motors' share of the host's income. It applies to bookings confirmed from now
  // on; the host is told in their notification box.
  app.put('/admin/hosts/:id/commission', { preHandler: requireAdmin }, async request => {
    const { id } = idParam.parse(request.params)
    const { rate } = z.object({ rate: z.union(COMMISSION_RATES.map(r => z.literal(r))) }).parse(request.body)
    const host = await prisma.host.findUnique({ where: { id }, select: { commissionRate: true, userId: true } })
    if (!host) throw new HttpError(404, 'host-not-found')
    if (host.commissionRate !== rate) {
      await prisma.host.update({ where: { id }, data: { commissionRate: rate } })
      await notify(host.userId, 'commission-changed', { from: host.commissionRate, to: rate }, '/host?tab=finances')
    }
    return { ok: true }
  })

  // Deletes the host and everything about them, their account included (see removeHost).
  app.delete('/admin/hosts/:id', { preHandler: requireAdmin }, async request => {
    const { id } = idParam.parse(request.params)
    return { ok: true, ...(await removeHost(id, 'delete')) }
  })
}

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../auth/guards.js'
import { bookingInclude, toBookingDto } from '../bookings/dto.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'

// Money kept from a booking: charged when confirmed, minus refunds.
const kept = (b: { confirmedAt: Date | null; total: number; refundedAmount: number }) => (b.confirmedAt ? b.total - b.refundedAmount : 0)

const reviewDto = (r: { id: string; authorName: string; rating: number; text: string; createdAt: Date; userId: string | null }) => ({
  id: r.id, name: r.authorName, rating: r.rating, text: r.text, date: r.createdAt.toISOString().slice(0, 10), customerId: r.userId,
})

async function customer(id: string) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user || user.role !== 'CUSTOMER') throw new HttpError(404, 'customer-not-found')
  return user
}

// Customers (with their history) and reviews (grouped by car), for the admin pages.
export async function adminPeopleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)

  app.get('/admin/customers', async () => {
    const users = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      include: {
        bookings: { select: { status: true, confirmedAt: true, total: true, refundedAmount: true, createdAt: true } },
        _count: { select: { reviews: true } },
        host: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return {
      customers: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.deletedEmail ?? u.email,
        active: !u.deletedAt,
        verificationStatus: u.verificationStatus,
        verificationSubmittedAt: u.verificationSubmittedAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
        deletedAt: u.deletedAt?.toISOString() ?? null,
        bookings: u.bookings.filter(b => b.status !== 'PENDING_PAYMENT' && b.status !== 'EXPIRED').length,
        completed: u.bookings.filter(b => b.status === 'COMPLETED').length,
        spent: u.bookings.reduce((s, b) => s + kept(b), 0),
        lastBookingAt: u.bookings.map(b => b.createdAt).sort((a, b) => b.getTime() - a.getTime())[0]?.toISOString() ?? null,
        reviews: u._count.reviews,
        host: u.host,
      })),
    }
  })

  app.get('/admin/customers/:id', async request => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const u = await prisma.user.findUnique({ where: { id }, include: { host: { select: { id: true, name: true } } } })
    if (!u || u.role !== 'CUSTOMER') throw new HttpError(404, 'customer-not-found')
    const [bookings, reviews, documents] = await Promise.all([
      prisma.booking.findMany({ where: { userId: id }, include: bookingInclude, orderBy: { createdAt: 'desc' } }),
      prisma.review.findMany({ where: { userId: id }, include: { car: { select: { slug: true, brand: true, model: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.identityDocument.findMany({
        where: { userId: id },
        select: { id: true, type: true, fileName: true, mimeType: true, size: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])
    return {
      customer: {
        id: u.id, name: u.name, email: u.deletedEmail ?? u.email, active: !u.deletedAt,
        createdAt: u.createdAt.toISOString(), deletedAt: u.deletedAt?.toISOString() ?? null,
        phone: u.phone, birthDate: u.birthDate?.toISOString().slice(0, 10) ?? null,
        verificationStatus: u.verificationStatus, verificationNote: u.verificationNote,
        verificationSubmittedAt: u.verificationSubmittedAt?.toISOString() ?? null, verifiedAt: u.verifiedAt?.toISOString() ?? null,
        spent: bookings.reduce((s, b) => s + kept(b), 0),
        refunded: bookings.reduce((s, b) => s + b.refundedAmount, 0),
        host: u.host,
      },
      bookings: bookings.map(b => toBookingDto(b, { forAdmin: true })),
      reviews: reviews.map(r => ({ ...reviewDto(r), car: r.car })),
      documents: documents.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })),
    }
  })

  // The admin checked the documents: the customer may now book.
  app.post('/admin/customers/:id/verify', async request => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const user = await customer(id)
    if (user.deletedAt) throw new HttpError(409, 'account-deleted')
    await prisma.user.update({ where: { id }, data: { verificationStatus: 'VERIFIED', verifiedAt: new Date(), verificationNote: null } })
    return { ok: true }
  })

  // Not accepted (or verification withdrawn): the customer sees why and can send new documents.
  app.post('/admin/customers/:id/reject', async request => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const { note } = z.object({ note: z.string().trim().min(3).max(1000) }).parse(request.body)
    await customer(id)
    await prisma.user.update({ where: { id }, data: { verificationStatus: 'REJECTED', verificationNote: note, verifiedAt: null } })
    return { ok: true }
  })

  // Host role: tie the customer to an existing host without an account (hostId), or create a
  // host profile from their name and phone. They then see that host's cars, bookings and reviews.
  app.post('/admin/customers/:id/host', async (request, reply) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const { hostId } = z.object({ hostId: z.int().positive().optional() }).parse(request.body ?? {})
    const user = await customer(id)
    if (user.deletedAt) throw new HttpError(409, 'account-deleted')
    if (await prisma.host.findUnique({ where: { userId: id }, select: { id: true } })) throw new HttpError(409, 'already-host')
    let host
    if (hostId) {
      const existing = await prisma.host.findUnique({ where: { id: hostId }, select: { id: true, name: true } })
      if (!existing) throw new HttpError(404, 'host-not-found')
      // Only a host without an account; checked in the update so two admins can't both take it.
      const done = await prisma.host.updateMany({ where: { id: hostId, userId: null }, data: { userId: id } })
      if (!done.count) throw new HttpError(409, 'host-taken')
      host = existing
    } else {
      host = await prisma.host.create({ data: { name: user.name, phone: user.phone, userId: id }, select: { id: true, name: true } })
      reply.code(201)
    }
    return { host }
  })

  // Takes the host role away; the host profile and its cars stay.
  app.delete('/admin/customers/:id/host', async request => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    await customer(id)
    await prisma.host.updateMany({ where: { userId: id }, data: { userId: null } })
    return { ok: true }
  })

  // Every car with its reviews, the most reviewed first. Cars without reviews are included.
  app.get('/admin/reviews', async () => {
    const cars = await prisma.car.findMany({
      include: { photos: { orderBy: { position: 'asc' }, take: 1 }, reviews: { orderBy: { createdAt: 'desc' } } },
    })
    return {
      cars: cars
        .map(c => ({
          car: { id: c.id, slug: c.slug, brand: c.brand, model: c.model, photo: c.photos[0]?.url ?? null, status: c.status },
          count: c.reviews.length,
          average: c.reviews.length ? Math.round((c.reviews.reduce((s, r) => s + r.rating, 0) / c.reviews.length) * 10) / 10 : null,
          reviews: c.reviews.map(reviewDto),
        }))
        .sort((a, b) => b.count - a.count || `${a.car.brand} ${a.car.model}`.localeCompare(`${b.car.brand} ${b.car.model}`)),
    }
  })
}

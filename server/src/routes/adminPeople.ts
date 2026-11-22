import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../auth/guards.js'
import { hashPassword } from '../auth/password.js'
import { normalizePhone } from '../auth/phone.js'
import { phoneInUse, uniqueViolation } from './auth.js'
import { documentDto, hostDocumentMeta } from './hostApplication.js'
import { removeHost } from '../hosts/removeHost.js'
import { COMMISSION_RATES } from '../hosts/commission.js'
import { notify } from '../notifications/notify.js'
import { bookingInclude, toBookingDto } from '../bookings/dto.js'
import { prisma } from '../db.js'
import { hasRequiredDocuments } from './profile.js'
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
        avatarUrl: u.avatarUrl,
        active: !u.deletedAt,
        verificationStatus: u.verificationStatus,
        verificationSubmittedAt: u.verificationSubmittedAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
        deletedAt: u.deletedAt?.toISOString() ?? null,
        lastSeenAt: u.lastSeenAt?.toISOString() ?? null, // when they last used the site signed in
        bookings: u.bookings.filter(b => b.status !== 'PENDING_PAYMENT' && b.status !== 'EXPIRED').length,
        completed: u.bookings.filter(b => b.status === 'COMPLETED').length,
        spent: u.bookings.reduce((s, b) => s + kept(b), 0),
        lastBookingAt: u.bookings.map(b => b.createdAt).sort((a, b) => b.getTime() - a.getTime())[0]?.toISOString() ?? null,
        reviews: u._count.reviews,
        host: u.host,
        hostApplicationStatus: u.hostApplicationStatus,
        hostApplicationSubmittedAt: u.hostApplicationSubmittedAt?.toISOString() ?? null,
      })),
    }
  })

  app.get('/admin/customers/:id', async request => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const u = await prisma.user.findUnique({ where: { id }, include: { host: { select: { id: true, name: true } } } })
    if (!u || u.role !== 'CUSTOMER') throw new HttpError(404, 'customer-not-found')
    const [bookings, reviews, documents, hostDocuments] = await Promise.all([
      prisma.booking.findMany({ where: { userId: id }, include: bookingInclude, orderBy: { createdAt: 'desc' } }),
      prisma.review.findMany({ where: { userId: id }, include: { car: { select: { slug: true, brand: true, model: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.identityDocument.findMany({
        where: { userId: id },
        select: { id: true, type: true, fileName: true, mimeType: true, size: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.hostDocument.findMany({ where: { userId: id }, select: hostDocumentMeta, orderBy: { createdAt: 'asc' } }),
    ])
    return {
      customer: {
        id: u.id, name: u.name, email: u.deletedEmail ?? u.email, avatarUrl: u.avatarUrl, active: !u.deletedAt,
        createdAt: u.createdAt.toISOString(), deletedAt: u.deletedAt?.toISOString() ?? null,
        lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
        phone: u.phone, birthDate: u.birthDate?.toISOString().slice(0, 10) ?? null,
        verificationStatus: u.verificationStatus, verificationNote: u.verificationNote,
        verificationSubmittedAt: u.verificationSubmittedAt?.toISOString() ?? null, verifiedAt: u.verifiedAt?.toISOString() ?? null,
        spent: bookings.reduce((s, b) => s + kept(b), 0),
        refunded: bookings.reduce((s, b) => s + b.refundedAmount, 0),
        host: u.host,
        hasPassword: u.passwordHash !== '!',
      },
      bookings: bookings.map(b => toBookingDto(b, { forAdmin: true })),
      reviews: reviews.map(r => ({ ...reviewDto(r), car: r.car })),
      documents: documents.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })),
      hostApplication: {
        status: u.hostApplicationStatus,
        message: u.hostApplicationMessage,
        note: u.hostApplicationNote,
        submittedAt: u.hostApplicationSubmittedAt?.toISOString() ?? null,
        documents: hostDocuments.map(documentDto),
      },
    }
  })

  // The admin edits a user's account: name, email, phone and (optionally) a new password.
  // A new password signs the user out everywhere. The public name of a host is edited separately.
  app.put('/admin/customers/:id', async request => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const body = z.object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
      phone: z.string().trim().max(40),
      password: z.string().min(8).max(200).optional(),
    }).parse(request.body)
    const user = await customer(id)
    if (user.deletedAt) throw new HttpError(409, 'account-deleted')
    const phone = body.phone ? normalizePhone(body.phone) : null
    if (body.phone && !phone) throw new HttpError(422, 'invalid-phone')
    if (phone && (await phoneInUse(phone, id))) throw new HttpError(409, 'phone-taken')
    const other = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } })
    if (other && other.id !== id) throw new HttpError(409, 'email-taken')
    const passwordHash = body.password ? await hashPassword(body.password) : undefined
    await prisma
      .$transaction([
        prisma.user.update({ where: { id }, data: { name: body.name, email: body.email, phone, ...(passwordHash ? { passwordHash } : {}) } }),
        ...(passwordHash ? [prisma.session.deleteMany({ where: { userId: id } })] : []),
      ])
      .catch(err => { throw uniqueViolation(err) ?? err })
    return { ok: true }
  })

  // The admin checked the documents: the customer may now book.
  app.post('/admin/customers/:id/verify', async request => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const user = await customer(id)
    if (user.deletedAt) throw new HttpError(409, 'account-deleted')
    const types = (await prisma.identityDocument.findMany({ where: { userId: id }, select: { type: true } })).map(d => d.type)
    if (!hasRequiredDocuments(types)) throw new HttpError(422, 'documents-missing')
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

  // Approves a request to become a host: a host profile is made from the customer's name and
  // phone, and they get the host pages to add their cars.
  app.post('/admin/customers/:id/host-application/approve', async (request, reply) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    // Rent Motors' share of the host's income, chosen when the request is approved.
    const { commissionRate } = z.object({ commissionRate: z.union(COMMISSION_RATES.map(r => z.literal(r))) }).parse(request.body)
    const user = await customer(id)
    if (user.deletedAt) throw new HttpError(409, 'account-deleted')
    if (user.hostApplicationStatus !== 'PENDING') throw new HttpError(409, 'no-pending-application')
    const host = await prisma.$transaction(async tx => {
      if (await tx.host.findUnique({ where: { userId: id }, select: { id: true } })) throw new HttpError(409, 'already-host')
      const created = await tx.host.create({ data: { name: user.name, phone: user.phone, userId: id, commissionRate }, select: { id: true, name: true } })
      await tx.user.update({ where: { id }, data: { hostApplicationStatus: 'APPROVED', hostApplicationNote: null } })
      return created
    })
    await notify(id, 'host-approved', { rate: commissionRate }, '/host')
    reply.code(201)
    return { host }
  })

  // Rejects the request with a reason the customer sees; they can fix it and ask again.
  app.post('/admin/customers/:id/host-application/reject', async request => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const { note } = z.object({ note: z.string().trim().min(3).max(1000) }).parse(request.body)
    await customer(id)
    const done = await prisma.user.updateMany({ where: { id, hostApplicationStatus: 'PENDING' }, data: { hostApplicationStatus: 'REJECTED', hostApplicationNote: note } })
    if (!done.count) throw new HttpError(409, 'no-pending-application')
    await notify(id, 'host-rejected', { note }, '/profile')
    return { ok: true }
  })

  // Takes the host role away: the host profile and its cars are deleted for good and the user
  // is a plain customer again (they may ask to become a host later).
  app.delete('/admin/customers/:id/host', async request => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    await customer(id)
    const host = await prisma.host.findUnique({ where: { userId: id }, select: { id: true } })
    if (!host) throw new HttpError(404, 'host-not-found')
    return { ok: true, ...(await removeHost(host.id, 'keep')) }
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

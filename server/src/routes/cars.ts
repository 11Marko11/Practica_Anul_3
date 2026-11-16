import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../auth/guards.js'
import { carInclude, isListed, LISTED, REQUIRED_CAR_DOCUMENTS, slugBase, toCarDto } from '../cars/dto.js'
import { hostStats } from '../cars/hostStats.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'
import { carName, notify } from '../notifications/notify.js'
import { documentDto, hostDocumentMeta } from './hostApplication.js'

const idParam = z.object({ id: z.coerce.number().int().positive() })
const slugParam = z.object({ slug: z.string().max(200) })

const isAdmin = (request: FastifyRequest) => request.user?.role === 'ADMIN'

// "bmw-m4-competition", or "bmw-m4-competition-2" if another car already has it.
export async function uniqueSlug(brand: string, model: string) {
  const base = slugBase(brand, model)
  const taken = new Set((await prisma.car.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map(c => c.slug))
  let slug = base
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
  return slug
}

// Photos keep their credit when a car is saved without changing them.
export const photoRows = (photos: string[], credits = new Map<string, { credit: string | null; creditUrl: string | null }>()) =>
  photos.map((url, position) => ({ url, position, ...(credits.get(url) ?? {}) }))

// One car with its host's current rating and trips.
export async function carDto(car: Parameters<typeof toCarDto>[0]) {
  return toCarDto(car, (await hostStats([car.hostId]))(car.hostId))
}

export async function carRoutes(app: FastifyInstance) {
  // Public catalogue. Admins also get hidden cars, for the admin pages.
  app.get('/cars', async request => {
    const cars = await prisma.car.findMany({
      where: isAdmin(request) ? {} : LISTED,
      include: carInclude,
      orderBy: { createdAt: 'asc' },
    })
    const stats = await hostStats(cars.map(c => c.hostId))
    return { cars: cars.map(c => toCarDto(c, stats(c.hostId))) }
  })

  app.get('/cars/:slug', async request => {
    const { slug } = slugParam.parse(request.params)
    const car = await prisma.car.findUnique({ where: { slug }, include: carInclude })
    if (!car || (!isListed(car) && !isAdmin(request))) throw new HttpError(404, 'car-not-found')
    return { car: await carDto(car) }
  })

  // Only the owner of a car (its host) can change its details. Admins can only take a car off
  // the site or put it back, e.g. when a listing breaks the rules.
  app.patch('/admin/cars/:id/status', { preHandler: requireAdmin }, async request => {
    const { id } = idParam.parse(request.params)
    const { status } = z.object({ status: z.enum(['ACTIVE', 'HIDDEN']) }).parse(request.body)
    const done = await prisma.car.updateMany({ where: { id, status: { not: 'REMOVED' } }, data: { status } })
    if (!done.count) throw new HttpError(404, 'car-not-found')
    return { ok: true }
  })

  // A car's papers and the state of their check, for the admin's review.
  app.get('/admin/cars/:id/review', { preHandler: requireAdmin }, async request => {
    const { id } = idParam.parse(request.params)
    const car = await prisma.car.findUnique({ where: { id }, select: { reviewStatus: true, reviewNote: true, reviewSubmittedAt: true } })
    if (!car) throw new HttpError(404, 'car-not-found')
    const documents = await prisma.hostDocument.findMany({ where: { carId: id }, select: hostDocumentMeta, orderBy: { createdAt: 'asc' } })
    return { status: car.reviewStatus, note: car.reviewNote, submittedAt: car.reviewSubmittedAt?.toISOString() ?? null, documents: documents.map(documentDto) }
  })

  // The admin checked the papers: the car shows on the site, or the host sees why not.
  app.post('/admin/cars/:id/review', { preHandler: requireAdmin }, async request => {
    const { id } = idParam.parse(request.params)
    const body = z.discriminatedUnion('decision', [
      z.object({ decision: z.literal('approve') }),
      z.object({ decision: z.literal('reject'), note: z.string().trim().min(3).max(1000) }),
    ]).parse(request.body)
    // A car can only be approved with its registration certificate and RCA insurance.
    if (body.decision === 'approve') {
      const types = new Set((await prisma.hostDocument.findMany({ where: { carId: id }, select: { type: true } })).map(d => d.type))
      if (!REQUIRED_CAR_DOCUMENTS.every(t => types.has(t))) throw new HttpError(409, 'car-documents-missing')
    }
    const done = await prisma.car.updateMany({
      where: { id, status: { not: 'REMOVED' } },
      data: body.decision === 'approve' ? { reviewStatus: 'APPROVED', reviewNote: null } : { reviewStatus: 'REJECTED', reviewNote: body.note },
    })
    if (!done.count) throw new HttpError(404, 'car-not-found')
    const car = await prisma.car.findUniqueOrThrow({ where: { id }, select: { id: true, brand: true, model: true, host: { select: { userId: true } } } })
    await notify(car.host.userId, body.decision === 'approve' ? 'car-approved' : 'car-rejected', { car: carName(car), ...(body.decision === 'reject' ? { note: body.note } : {}) }, `/host/cars/${car.id}`)
    return { ok: true }
  })

  // Cars with bookings are kept for the booking history; hide them instead.
  app.delete('/admin/cars/:id', { preHandler: requireAdmin }, async request => {
    const { id } = idParam.parse(request.params)
    const car = await prisma.car.findUnique({ where: { id }, select: { _count: { select: { bookings: true } } } })
    if (!car) throw new HttpError(404, 'car-not-found')
    if (car._count.bookings > 0) throw new HttpError(409, 'car-has-bookings')
    await prisma.car.delete({ where: { id } })
    return { ok: true }
  })
}

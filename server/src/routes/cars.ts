import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../auth/guards.js'
import { carData, carInclude, carInput, slugBase, toCarDto } from '../cars/dto.js'
import { hostStats } from '../cars/hostStats.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'

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

// Photos keep their credit when the admin saves a car without changing them.
export const photoRows = (photos: string[], credits = new Map<string, { credit: string | null; creditUrl: string | null }>()) =>
  photos.map((url, position) => ({ url, position, ...(credits.get(url) ?? {}) }))

// The host picked in the admin form.
async function hostLink(hostId: number) {
  const host = await prisma.host.findUnique({ where: { id: hostId }, select: { id: true } })
  if (!host) throw new HttpError(400, 'host-not-found')
  return { connect: { id: host.id } }
}

// One car with its host's current rating and trips.
export async function carDto(car: Parameters<typeof toCarDto>[0]) {
  return toCarDto(car, (await hostStats([car.hostId]))(car.hostId))
}

export async function carRoutes(app: FastifyInstance) {
  // Public catalogue. Admins also get hidden cars, for the admin pages.
  app.get('/cars', async request => {
    const cars = await prisma.car.findMany({
      where: isAdmin(request) ? {} : { status: 'ACTIVE' },
      include: carInclude,
      orderBy: { createdAt: 'asc' },
    })
    const stats = await hostStats(cars.map(c => c.hostId))
    return { cars: cars.map(c => toCarDto(c, stats(c.hostId))) }
  })

  app.get('/cars/:slug', async request => {
    const { slug } = slugParam.parse(request.params)
    const car = await prisma.car.findUnique({ where: { slug }, include: carInclude })
    if (!car || (car.status !== 'ACTIVE' && !isAdmin(request))) throw new HttpError(404, 'car-not-found')
    return { car: await carDto(car) }
  })

  app.post('/admin/cars', { preHandler: requireAdmin }, async (request, reply) => {
    const input = carInput.parse(request.body)
    const car = await prisma.car.create({
      data: { ...carData(input), host: await hostLink(input.hostId), slug: await uniqueSlug(input.brand, input.model), photos: { create: photoRows(input.photos) } },
      include: carInclude,
    })
    reply.code(201)
    return { car: await carDto(car) }
  })

  // The slug (the car's web address) stays the same when a car is edited.
  app.put('/admin/cars/:id', { preHandler: requireAdmin }, async request => {
    const { id } = idParam.parse(request.params)
    const input = carInput.parse(request.body)
    const current = await prisma.car.findUnique({ where: { id }, select: { photos: { select: { url: true, credit: true, creditUrl: true } } } })
    if (!current) throw new HttpError(404, 'car-not-found')
    const credits = new Map(current.photos.map(p => [p.url, { credit: p.credit, creditUrl: p.creditUrl }]))
    const car = await prisma.car.update({
      where: { id },
      data: { ...carData(input), host: await hostLink(input.hostId), photos: { deleteMany: {}, create: photoRows(input.photos, credits) } },
      include: carInclude,
    })
    return { car: await carDto(car) }
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

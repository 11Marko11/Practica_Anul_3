import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../auth/guards.js'
import { carData, carInclude, carInput, slugBase, toCarDto } from '../cars/dto.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'

const idParam = z.object({ id: z.coerce.number().int().positive() })
const slugParam = z.object({ slug: z.string().max(200) })

const isAdmin = (request: FastifyRequest) => request.user?.role === 'ADMIN'

// "bmw-m4-competition", or "bmw-m4-competition-2" if another car already has it.
async function uniqueSlug(brand: string, model: string) {
  const base = slugBase(brand, model)
  const taken = new Set((await prisma.car.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map(c => c.slug))
  let slug = base
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
  return slug
}

const photoRows = (photos: string[]) => photos.map((url, position) => ({ url, position }))

export async function carRoutes(app: FastifyInstance) {
  // Public catalogue. Admins also get hidden cars, for the admin pages.
  app.get('/cars', async request => {
    const cars = await prisma.car.findMany({
      where: isAdmin(request) ? {} : { status: 'ACTIVE' },
      include: carInclude,
      orderBy: { createdAt: 'asc' },
    })
    return { cars: cars.map(toCarDto) }
  })

  app.get('/cars/:slug', async request => {
    const { slug } = slugParam.parse(request.params)
    const car = await prisma.car.findUnique({ where: { slug }, include: carInclude })
    if (!car || (car.status !== 'ACTIVE' && !isAdmin(request))) throw new HttpError(404, 'car-not-found')
    return { car: toCarDto(car) }
  })

  app.post('/admin/cars', { preHandler: requireAdmin }, async (request, reply) => {
    const input = carInput.parse(request.body)
    const car = await prisma.car.create({
      data: { ...carData(input), slug: await uniqueSlug(input.brand, input.model), photos: { create: photoRows(input.photos) } },
      include: carInclude,
    })
    reply.code(201)
    return { car: toCarDto(car) }
  })

  // The slug (the car's web address) stays the same when a car is edited.
  app.put('/admin/cars/:id', { preHandler: requireAdmin }, async request => {
    const { id } = idParam.parse(request.params)
    const input = carInput.parse(request.body)
    if (!(await prisma.car.findUnique({ where: { id }, select: { id: true } }))) throw new HttpError(404, 'car-not-found')
    const car = await prisma.car.update({
      where: { id },
      data: { ...carData(input), photos: { deleteMany: {}, create: photoRows(input.photos) } },
      include: carInclude,
    })
    return { car: toCarDto(car) }
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

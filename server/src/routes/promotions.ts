import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../auth/guards.js'
import { fromIsoDate, isoDate, todayInMoldova } from '../bookings/dates.js'
import { prisma } from '../db.js'
import type { Promotion } from '../generated/prisma/client.js'
import { HttpError } from '../http/errors.js'

const PLACEMENTS = ['HOME', 'MARKETPLACE'] as const
const text = (max: number) => z.string().trim().max(max).default('')
const languageTexts = z.object({ title: text(120), text: text(300), button: text(40) }).default({ title: '', text: '', button: '' })
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const promotionInput = z
  .object({
    placement: z.enum(PLACEMENTS),
    texts: z.object({ ro: languageTexts, en: languageTexts, ru: languageTexts }),
    imageUrl: z.union([z.url({ protocol: /^https?$/ }).max(2000), z.literal('')]).default(''),
    // A page of this site, or a full web address.
    linkUrl: z.union([z.string().trim().regex(/^\/[^\s]*$/).max(500), z.url({ protocol: /^https?$/ }).max(2000), z.literal('')]).default(''),
    active: z.boolean().default(true),
    startsOn: z.union([date, z.literal('')]).default(''),
    endsOn: z.union([date, z.literal('')]).default(''),
    position: z.int().min(0).max(999).default(0),
  })
  .refine(p => p.texts.ro.title || p.texts.en.title || p.texts.ru.title, { path: ['texts'], message: 'A title is required' })
  .refine(p => !p.startsOn || !p.endsOn || p.startsOn <= p.endsOn, { path: ['endsOn'], message: 'Ends before it starts' })

function data(input: z.infer<typeof promotionInput>) {
  return {
    placement: input.placement,
    texts: input.texts,
    imageUrl: input.imageUrl || null,
    linkUrl: input.linkUrl || null,
    active: input.active,
    startsOn: input.startsOn ? fromIsoDate(input.startsOn) : null,
    endsOn: input.endsOn ? fromIsoDate(input.endsOn) : null,
    position: input.position,
  }
}

const toDto = (p: Promotion) => ({
  id: p.id,
  placement: p.placement,
  texts: p.texts,
  imageUrl: p.imageUrl,
  linkUrl: p.linkUrl,
  active: p.active,
  startsOn: p.startsOn ? isoDate(p.startsOn) : null,
  endsOn: p.endsOn ? isoDate(p.endsOn) : null,
  position: p.position,
  clicks: p.clicks,
  createdAt: p.createdAt.toISOString(),
})

const idParam = z.object({ id: z.coerce.number().int().positive() })
const order = [{ position: 'asc' as const }, { createdAt: 'desc' as const }]

export async function promotionRoutes(app: FastifyInstance) {
  // Banners to show now in one place: active, and today inside their dates (Moldova time).
  app.get('/promotions', async request => {
    const { placement } = z.object({ placement: z.enum(PLACEMENTS) }).parse(request.query)
    const today = fromIsoDate(todayInMoldova())
    const promotions = await prisma.promotion.findMany({
      where: {
        placement,
        active: true,
        AND: [{ OR: [{ startsOn: null }, { startsOn: { lte: today } }] }, { OR: [{ endsOn: null }, { endsOn: { gte: today } }] }],
      },
      orderBy: order,
    })
    return { promotions: promotions.map(p => ({ ...toDto(p), clicks: undefined })) }
  })

  // Counts a click on a banner (anonymous; limited per visitor to keep the numbers honest).
  app.post('/promotions/:id/click', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async request => {
    const { id } = idParam.parse(request.params)
    await prisma.promotion.updateMany({ where: { id, active: true }, data: { clicks: { increment: 1 } } })
    return { ok: true }
  })

  app.get('/admin/promotions', { preHandler: requireAdmin }, async () => ({
    promotions: (await prisma.promotion.findMany({ orderBy: [{ placement: 'asc' }, ...order] })).map(toDto),
  }))

  app.post('/admin/promotions', { preHandler: requireAdmin }, async (request, reply) => {
    const promotion = await prisma.promotion.create({ data: data(promotionInput.parse(request.body)) })
    reply.code(201)
    return { promotion: toDto(promotion) }
  })

  app.put('/admin/promotions/:id', { preHandler: requireAdmin }, async request => {
    const { id } = idParam.parse(request.params)
    const input = promotionInput.parse(request.body)
    const done = await prisma.promotion.updateMany({ where: { id }, data: data(input) })
    if (!done.count) throw new HttpError(404, 'promotion-not-found')
    return { promotion: toDto(await prisma.promotion.findUniqueOrThrow({ where: { id } })) }
  })

  app.delete('/admin/promotions/:id', { preHandler: requireAdmin }, async request => {
    const { id } = idParam.parse(request.params)
    const done = await prisma.promotion.deleteMany({ where: { id } })
    if (!done.count) throw new HttpError(404, 'promotion-not-found')
    return { ok: true }
  })
}

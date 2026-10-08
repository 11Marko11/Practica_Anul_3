import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../auth/guards.js'
import { prisma } from '../db.js'

// Empty strings are allowed: the website shows its built-in text for any empty field.
const text = (max: number) => z.string().trim().max(max)
const perLanguage = <T extends z.ZodType>(block: T) => ({ ro: block, en: block, ru: block })

const aboutText = z.object({
  eyebrow: text(80),
  titleLine1: text(120),
  titleLine2: text(120),
  intro: text(2000),
  imageAlt: text(200),
  valuesEyebrow: text(80),
  valuesTitle: text(160),
  values: z.array(z.object({ title: text(80), desc: text(600) })).max(8),
  ctaTitle: text(160),
  ctaText: text(400),
  ctaButton: text(60),
})

const contactText = z.object({
  eyebrow: text(80),
  title: text(160),
  helpTitle: text(160),
  helpText: text(1000),
  hours: text(160),
  address: text(300),
})

const SCHEMAS = {
  about: z.object({ imageUrl: text(2000), ...perLanguage(aboutText) }),
  contact: z.object({ email: z.union([z.email().max(254), z.literal('')]), phone: text(40), ...perLanguage(contactText) }),
}
type Key = keyof typeof SCHEMAS

const keyParam = z.object({ key: z.enum(Object.keys(SCHEMAS) as [Key, ...Key[]]) })

export async function contentRoutes(app: FastifyInstance) {
  // Saved texts of a page, or null if the admin never changed it.
  app.get('/content/:key', async request => {
    const { key } = keyParam.parse(request.params)
    const row = await prisma.siteContent.findUnique({ where: { key } })
    return { content: row?.data ?? null, updatedAt: row?.updatedAt.toISOString() ?? null }
  })

  app.put('/admin/content/:key', { preHandler: requireAdmin }, async request => {
    const { key } = keyParam.parse(request.params)
    const data = SCHEMAS[key].parse(request.body)
    const row = await prisma.siteContent.upsert({ where: { key }, create: { key, data }, update: { data } })
    return { content: row.data, updatedAt: row.updatedAt.toISOString() }
  })

  // Back to the website's built-in texts.
  app.delete('/admin/content/:key', { preHandler: requireAdmin }, async request => {
    const { key } = keyParam.parse(request.params)
    await prisma.siteContent.deleteMany({ where: { key } })
    return { content: null, updatedAt: null }
  })
}


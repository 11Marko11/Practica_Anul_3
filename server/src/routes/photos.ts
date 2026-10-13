import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { HttpError } from '../http/errors.js'
import { prisma } from '../db.js'
import { detectType } from './profile.js'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Admins and hosts upload car photos.
async function canUpload(request: FastifyRequest) {
  if (!request.user) throw new HttpError(401, 'unauthenticated')
  if (request.user.role !== 'ADMIN' && !request.user.host) throw new HttpError(403, 'forbidden')
}

export async function photoRoutes(app: FastifyInstance) {
  // One image (multipart field `file`); answers with the address to put in the car's photos.
  app.post('/photos', { preHandler: canUpload, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const part = await request.file()
    if (!part || part.fieldname !== 'file') throw new HttpError(400, 'validation')
    const data = await part.toBuffer()
    if (part.file.truncated) throw new HttpError(413, 'file-too-large')
    const mimeType = detectType(data)
    if (!mimeType || !IMAGE_TYPES.includes(mimeType)) throw new HttpError(415, 'unsupported-file')
    const photo = await prisma.uploadedPhoto.create({
      data: { mimeType, size: data.length, data: new Uint8Array(data), uploadedBy: request.user!.id },
      select: { id: true },
    })
    reply.code(201)
    return { url: `/api/photos/${photo.id}` }
  })

  // Public, and never changes: browsers and Vercel may keep it for a year.
  app.get('/photos/:id', async (request, reply) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const photo = await prisma.uploadedPhoto.findUnique({ where: { id }, select: { mimeType: true, data: true } })
    if (!photo) throw new HttpError(404, 'photo-not-found')
    reply.header('Cache-Control', 'public, max-age=31536000, immutable').type(photo.mimeType)
    return Buffer.from(photo.data)
  })
}

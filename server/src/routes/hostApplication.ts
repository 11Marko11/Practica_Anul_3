import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireUser } from '../auth/guards.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'
import { readDocumentUpload } from '../http/upload.js'

const HOST_DOCUMENT_TYPES = ['BUSINESS_REGISTRATION', 'BANK_DETAILS'] as const
// Besides a verified identity (which already includes the driving licence), a request needs these.
export const REQUIRED_HOST_DOCUMENTS = HOST_DOCUMENT_TYPES

export const hostDocumentMeta = { id: true, type: true, fileName: true, mimeType: true, size: true, createdAt: true } as const
export const documentDto = (d: { id: string; type: string; fileName: string; mimeType: string; size: number; createdAt: Date }) => ({ ...d, createdAt: d.createdAt.toISOString() })

async function applicationOf(userId: string) {
  const [u, documents] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { host: { select: { id: true } } } }),
    prisma.hostDocument.findMany({ where: { userId }, select: hostDocumentMeta, orderBy: { createdAt: 'asc' } }),
  ])
  return {
    application: {
      status: u.hostApplicationStatus,
      message: u.hostApplicationMessage,
      note: u.hostApplicationNote,
      submittedAt: u.hostApplicationSubmittedAt?.toISOString() ?? null,
      isHost: !!u.host,
      identityVerified: u.verificationStatus === 'VERIFIED',
    },
    documents: documents.map(documentDto),
  }
}

// A customer asks the admin to become a host: a verified identity (ID and driving licence),
// the certificate of registration and the bank details for the payouts.
export async function hostApplicationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser)

  const customersOnly = async (request: { user: { role: string } | null }) => {
    if (request.user?.role === 'ADMIN') throw new HttpError(403, 'admin-no-documents')
  }
  // Documents can't change while the admin is checking them.
  async function editable(userId: string) {
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { hostApplicationStatus: true } })
    if (u.hostApplicationStatus === 'PENDING') throw new HttpError(409, 'application-pending')
  }

  app.get('/host-application', async request => applicationOf(request.user!.id))

  app.post('/host-application/documents', { preHandler: customersOnly, config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const userId = request.user!.id
    await editable(userId)
    if ((await prisma.hostDocument.count({ where: { userId } })) >= 10) throw new HttpError(409, 'too-many-documents')
    const upload = await readDocumentUpload(request, HOST_DOCUMENT_TYPES)
    const doc = await prisma.hostDocument.create({ data: { userId, ...upload }, select: hostDocumentMeta })
    reply.code(201)
    return { document: documentDto(doc) }
  })

  app.delete('/host-application/documents/:id', { preHandler: customersOnly }, async request => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const userId = request.user!.id
    await editable(userId)
    const done = await prisma.hostDocument.deleteMany({ where: { id, userId } })
    if (!done.count) throw new HttpError(404, 'document-not-found')
    return applicationOf(userId)
  })

  // Send the request to the admin.
  app.post('/host-application', { preHandler: customersOnly }, async request => {
    const userId = request.user!.id
    const { message } = z.object({ message: z.string().trim().max(1000).optional() }).parse(request.body ?? {})
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { host: { select: { id: true } } } })
    if (u.host) throw new HttpError(409, 'already-host')
    if (u.hostApplicationStatus === 'PENDING') throw new HttpError(409, 'already-submitted')
    if (u.verificationStatus !== 'VERIFIED') throw new HttpError(422, 'identity-not-verified')
    const types = new Set((await prisma.hostDocument.findMany({ where: { userId }, select: { type: true } })).map(d => d.type))
    if (!REQUIRED_HOST_DOCUMENTS.every(t => types.has(t))) throw new HttpError(422, 'documents-missing')
    await prisma.user.update({
      where: { id: userId },
      data: { hostApplicationStatus: 'PENDING', hostApplicationMessage: message || null, hostApplicationNote: null, hostApplicationSubmittedAt: new Date() },
    })
    return applicationOf(userId)
  })

  // Withdraw a request the admin has not answered yet.
  app.delete('/host-application', { preHandler: customersOnly }, async request => {
    const userId = request.user!.id
    await prisma.user.updateMany({ where: { id: userId, hostApplicationStatus: 'PENDING' }, data: { hostApplicationStatus: null, hostApplicationSubmittedAt: null } })
    return applicationOf(userId)
  })

  // The file itself: to its owner, or to an admin. Never cached.
  app.get('/host-documents/:id/file', async (request, reply) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const doc = await prisma.hostDocument.findUnique({ where: { id } })
    if (!doc || (doc.userId !== request.user!.id && request.user!.role !== 'ADMIN')) throw new HttpError(404, 'document-not-found')
    const safeName = doc.fileName.replace(/[^\w.\- ]/g, '_')
    return reply
      .header('Content-Type', doc.mimeType)
      .header('Content-Disposition', `inline; filename="${safeName}"`)
      .header('X-Content-Type-Options', 'nosniff')
      .send(Buffer.from(doc.data))
  })
}

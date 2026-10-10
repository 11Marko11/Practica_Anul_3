import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireUser } from '../auth/guards.js'
import { hashPassword, verifyPassword } from '../auth/password.js'
import { normalizePhone } from '../auth/phone.js'
import { prisma } from '../db.js'
import { phoneInUse, uniqueViolation } from './auth.js'
import { HttpError } from '../http/errors.js'

export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024
const DOCUMENT_TYPES = ['ID_CARD', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER'] as const

// Accept only what the file really is, not what its name or the browser claims.
function detectType(data: Buffer): string | null {
  if (data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg'
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (data.subarray(0, 4).toString('latin1') === 'RIFF' && data.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp'
  if (data.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf'
  return null
}

const documentMeta = { id: true, type: true, fileName: true, mimeType: true, size: true, createdAt: true } as const

async function profileOf(userId: string) {
  const [u, documents] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.identityDocument.findMany({ where: { userId }, select: documentMeta, orderBy: { createdAt: 'asc' } }),
  ])
  return {
    profile: {
      name: u.name,
      email: u.email,
      phone: u.phone,
      birthDate: u.birthDate?.toISOString().slice(0, 10) ?? null,
      verificationStatus: u.verificationStatus,
      verificationNote: u.verificationNote,
      verificationSubmittedAt: u.verificationSubmittedAt?.toISOString() ?? null,
      verifiedAt: u.verifiedAt?.toISOString() ?? null,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    },
    documents: documents.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })),
  }
}

// What a verification request needs: a driving licence and an ID card or passport.
export function hasRequiredDocuments(types: string[]) {
  return types.includes('DRIVING_LICENSE') && (types.includes('ID_CARD') || types.includes('PASSPORT'))
}

// The signed-in user's profile, documents and identity verification.
export async function profileRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser)

  // Admins don't rent cars, so they have no documents to upload or send for verification.
  const customersOnly = async (request: { user: { role: string } | null }) => {
    if (request.user?.role === 'ADMIN') throw new HttpError(403, 'admin-no-documents')
  }

  app.get('/profile', async request => profileOf(request.user!.id))

  app.patch('/profile', async request => {
    const body = z
      .object({
        name: z.string().trim().min(2).max(100),
        phone: z.string().trim().max(40),
        birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')),
      })
      .parse(request.body)
    if (body.birthDate && (body.birthDate > new Date().toISOString().slice(0, 10) || body.birthDate < '1900-01-01')) throw new HttpError(422, 'invalid-birth-date')
    const phone = body.phone ? normalizePhone(body.phone) : null
    if (body.phone && !phone) throw new HttpError(422, 'invalid-phone')
    if (phone && (await phoneInUse(phone, request.user!.id))) throw new HttpError(409, 'phone-taken')
    await prisma.user
      .update({
        where: { id: request.user!.id },
        data: { name: body.name, phone, birthDate: body.birthDate ? new Date(`${body.birthDate}T00:00:00Z`) : null },
      })
      .catch(err => {
        throw uniqueViolation(err) ?? err
      })
    return profileOf(request.user!.id)
  })

  app.post('/profile/password', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async request => {
    const body = z.object({ current: z.string().min(1).max(200), next: z.string().min(8).max(200) }).parse(request.body)
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.user!.id } })
    if (!(await verifyPassword(user.passwordHash, body.current))) throw new HttpError(401, 'invalid-credentials')
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.next) } })
    return { ok: true }
  })

  // Upload one document (multipart: `type`, then `file`). A verified customer who changes
  // their documents goes back to "pending" so the admin can check them again.
  app.post('/profile/documents', { preHandler: customersOnly, config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const userId = request.user!.id
    if ((await prisma.identityDocument.count({ where: { userId } })) >= 10) throw new HttpError(409, 'too-many-documents')
    let type: string | undefined
    let file: { name: string; data: Buffer } | undefined
    for await (const part of request.parts()) {
      if (part.type === 'field' && part.fieldname === 'type') type = String(part.value)
      if (part.type === 'file' && part.fieldname === 'file') {
        const data = await part.toBuffer()
        if (part.file.truncated) throw new HttpError(413, 'file-too-large')
        file = { name: part.filename.slice(0, 200) || 'document', data }
      }
    }
    const parsedType = z.enum(DOCUMENT_TYPES).safeParse(type)
    if (!parsedType.success || !file) throw new HttpError(400, 'validation')
    const mimeType = detectType(file.data)
    if (!mimeType) throw new HttpError(415, 'unsupported-file')

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const [doc] = await prisma.$transaction([
      prisma.identityDocument.create({
        data: { userId, type: parsedType.data, fileName: file.name, mimeType, size: file.data.length, data: new Uint8Array(file.data) },
        select: documentMeta,
      }),
      ...(user.verificationStatus === 'VERIFIED'
        ? [prisma.user.update({ where: { id: userId }, data: { verificationStatus: 'PENDING', verificationSubmittedAt: new Date(), verifiedAt: null } })]
        : []),
    ])
    reply.code(201)
    return { document: { ...doc, createdAt: doc.createdAt.toISOString() } }
  })

  app.delete('/profile/documents/:id', { preHandler: customersOnly }, async request => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const userId = request.user!.id
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    // While the admin is checking, or once verified, documents stay as they were checked.
    if (user.verificationStatus === 'PENDING' || user.verificationStatus === 'VERIFIED') throw new HttpError(409, 'documents-locked')
    const done = await prisma.identityDocument.deleteMany({ where: { id, userId } })
    if (!done.count) throw new HttpError(404, 'document-not-found')
    return profileOf(userId)
  })

  // Ask the admin to check the documents.
  app.post('/profile/verification', { preHandler: customersOnly }, async request => {
    const userId = request.user!.id
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (user.verificationStatus === 'PENDING' || user.verificationStatus === 'VERIFIED') throw new HttpError(409, 'already-submitted')
    const types = (await prisma.identityDocument.findMany({ where: { userId }, select: { type: true } })).map(d => d.type)
    if (!hasRequiredDocuments(types)) throw new HttpError(422, 'documents-missing')
    await prisma.user.update({ where: { id: userId }, data: { verificationStatus: 'PENDING', verificationSubmittedAt: new Date(), verificationNote: null } })
    return profileOf(userId)
  })

  // The file itself: to its owner, or to an admin. Never cached.
  app.get('/documents/:id/file', async (request, reply) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const doc = await prisma.identityDocument.findUnique({ where: { id } })
    if (!doc || (doc.userId !== request.user!.id && request.user!.role !== 'ADMIN')) throw new HttpError(404, 'document-not-found')
    const safeName = doc.fileName.replace(/[^\w.\- ]/g, '_')
    return reply
      .header('Content-Type', doc.mimeType)
      .header('Content-Disposition', `inline; filename="${safeName}"`)
      .header('X-Content-Type-Options', 'nosniff')
      .send(Buffer.from(doc.data))
  })
}

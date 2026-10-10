import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { hashPassword, verifyDummy, verifyPassword } from '../auth/password.js'
import { normalizePhone } from '../auth/phone.js'
import { createSession, deleteSession, SESSION_COOKIE, sessionCookieOptions, type PublicUser } from '../auth/session.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'

const email = z.string().trim().toLowerCase().max(254).pipe(z.email())

const registerBody = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  phone: z.string().max(40),
  password: z.string().min(8).max(200),
})

const loginBody = z.object({
  email,
  password: z.string().min(1).max(200),
})

// Sign-in and sign-up are limited per IP address to slow down password guessing.
const limited = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }

const publicUser = { id: true, name: true, email: true, role: true, verificationStatus: true } as const

export function phoneInUse(phone: string, exceptUserId?: string) {
  return prisma.user.findFirst({ where: { phone, deletedAt: null, ...(exceptUserId ? { id: { not: exceptUserId } } : {}) }, select: { id: true } })
}

// Two sign-ups at the same moment: the database's unique indexes catch what the checks missed.
export function uniqueViolation(err: unknown) {
  const e = err as { code?: string; message?: string; meta?: unknown }
  if (e?.code !== 'P2002' && !String(e?.message).includes('Unique constraint')) return null
  return new HttpError(409, JSON.stringify(e.meta ?? e.message).includes('phone') ? 'phone-taken' : 'email-taken')
}

async function startSession(reply: FastifyReply, user: PublicUser) {
  const token = await createSession(user.id)
  reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions)
  return { user }
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', limited, async (request, reply) => {
    const body = registerBody.parse(request.body)
    const phone = normalizePhone(body.phone)
    if (!phone) throw new HttpError(422, 'invalid-phone')
    if (await prisma.user.findUnique({ where: { email: body.email } })) throw new HttpError(409, 'email-taken')
    // One phone number per active account (deleted accounts don't count).
    if (await phoneInUse(phone)) throw new HttpError(409, 'phone-taken')
    const user = await prisma.user
      .create({ data: { name: body.name, email: body.email, phone, passwordHash: await hashPassword(body.password) }, select: publicUser })
      .catch(err => {
        throw uniqueViolation(err) ?? err
      })
    reply.code(201)
    return startSession(reply, user)
  })

  app.post('/auth/login', limited, async (request, reply) => {
    const body = loginBody.parse(request.body)
    const found = await prisma.user.findUnique({ where: { email: body.email } })
    const ok = found ? await verifyPassword(found.passwordHash, body.password) : await verifyDummy(body.password)
    if (!found || !ok) throw new HttpError(401, 'invalid-credentials')
    return startSession(reply, { id: found.id, name: found.name, email: found.email, role: found.role, verificationStatus: found.verificationStatus })
  })

  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (token) await deleteSession(token)
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { ok: true }
  })

  // The signed-in user, or null. Always 200 so the website can call it on every page load.
  app.get('/auth/me', async request => ({ user: request.user }))
}

import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { hashPassword, verifyDummy, verifyPassword } from '../auth/password.js'
import { createSession, deleteSession, SESSION_COOKIE, sessionCookieOptions, type PublicUser } from '../auth/session.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'

const email = z.string().trim().toLowerCase().max(254).pipe(z.email())

const registerBody = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: z.string().min(8).max(200),
})

const loginBody = z.object({
  email,
  password: z.string().min(1).max(200),
})

// Sign-in and sign-up are limited per IP address to slow down password guessing.
const limited = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }

const publicUser = { id: true, name: true, email: true, role: true } as const

async function startSession(reply: FastifyReply, user: PublicUser) {
  const token = await createSession(user.id)
  reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions)
  return { user }
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', limited, async (request, reply) => {
    const body = registerBody.parse(request.body)
    if (await prisma.user.findUnique({ where: { email: body.email } })) throw new HttpError(409, 'email-taken')
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, passwordHash: await hashPassword(body.password) },
      select: publicUser,
    })
    reply.code(201)
    return startSession(reply, user)
  })

  app.post('/auth/login', limited, async (request, reply) => {
    const body = loginBody.parse(request.body)
    const found = await prisma.user.findUnique({ where: { email: body.email } })
    const ok = found ? await verifyPassword(found.passwordHash, body.password) : await verifyDummy(body.password)
    if (!found || !ok) throw new HttpError(401, 'invalid-credentials')
    return startSession(reply, { id: found.id, name: found.name, email: found.email, role: found.role })
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

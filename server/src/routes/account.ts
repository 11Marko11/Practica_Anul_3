import { randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireUser } from '../auth/guards.js'
import { hashPassword, verifyPassword } from '../auth/password.js'
import { SESSION_COOKIE } from '../auth/session.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'

// DELETE /api/account: the customer deletes their own account (password required).
// The user row stays, because bookings and payments refer to it, but it is marked deleted,
// can no longer sign in, and its email is freed for a new account.
export async function accountRoutes(app: FastifyInstance) {
  app.delete('/account', { preHandler: requireUser, config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { password } = z.object({ password: z.string().min(1).max(200) }).parse(request.body)
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.user!.id } })
    if (user.role === 'ADMIN') throw new HttpError(409, 'admin-cannot-delete')
    if (!(await verifyPassword(user.passwordHash, password))) throw new HttpError(401, 'invalid-credentials')
    const active = await prisma.booking.count({ where: { userId: user.id, status: { in: ['PENDING_PAYMENT', 'AWAITING_CONFIRMATION', 'CONFIRMED'] } } })
    if (active > 0) throw new HttpError(409, 'has-active-bookings')

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          deletedAt: new Date(),
          deletedEmail: user.email,
          email: `deleted-${user.id}@deleted.invalid`,
          passwordHash: await hashPassword(randomBytes(32).toString('hex')), // nobody knows it
        },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      // Identity documents are not kept after the account is gone.
      prisma.identityDocument.deleteMany({ where: { userId: user.id } }),
    ])
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { ok: true }
  })
}

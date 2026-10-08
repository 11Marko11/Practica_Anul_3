import { createHash, randomBytes } from 'node:crypto'
import type { CookieSerializeOptions } from '@fastify/cookie'
import { prisma } from '../db.js'
import { env } from '../env.js'
import type { Role } from '../generated/prisma/client.js'

export const SESSION_COOKIE = 'rm_session'
const SESSION_DAYS = 30
const DAY_MS = 86_400_000

// What the website gets about the signed-in user.
export type PublicUser = { id: string; name: string; email: string; role: Role }

export const sessionCookieOptions: CookieSerializeOptions = {
  httpOnly: true, // not readable from JavaScript
  secure: env.NODE_ENV === 'production', // HTTPS only on the live site
  sameSite: 'lax', // not sent with cross-site form posts
  path: '/',
  maxAge: SESSION_DAYS * 86_400,
}

// The cookie holds a random token; the database stores only its hash, so a leaked
// sessions table cannot be used to sign in.
function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url')
  await prisma.session.create({
    data: { id: tokenHash(token), userId, expiresAt: new Date(Date.now() + SESSION_DAYS * DAY_MS) },
  })
  return token
}

export async function userForToken(token: string): Promise<PublicUser | null> {
  const session = await prisma.session.findUnique({
    where: { id: tokenHash(token) },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  // Keep active users signed in: push the expiry forward once half the session has passed.
  if (session.expiresAt.getTime() - Date.now() < (SESSION_DAYS / 2) * DAY_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() + SESSION_DAYS * DAY_MS) } })
  }
  return session.user
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { id: tokenHash(token) } })
}

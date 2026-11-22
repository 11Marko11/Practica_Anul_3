import { createHash, randomBytes } from 'node:crypto'
import type { CookieSerializeOptions } from '@fastify/cookie'
import { prisma } from '../db.js'
import { env } from '../env.js'
import type { Role, VerificationStatus } from '../generated/prisma/client.js'

export const SESSION_COOKIE = 'rm_session'
// A session ends after this long without any request. While the site is open it checks in
// every few minutes (see AuthContext), so closing it and coming back soon keeps you signed in,
// while coming back later asks you to sign in again.
const IDLE_MS = 30 * 60_000
// Refresh the expiry at most this often, so not every request writes to the database.
const REFRESH_MS = 2 * 60_000

// What the website gets about the signed-in user.
// `host` is set for users the admin gave the host role.
export type PublicUser = { id: string; name: string; email: string; role: Role; verificationStatus: VerificationStatus; avatarUrl: string | null; host: { id: number; name: string } | null }
export const publicUserSelect = { id: true, name: true, email: true, role: true, verificationStatus: true, avatarUrl: true, host: { select: { id: true, name: true } } } as const

export const sessionCookieOptions: CookieSerializeOptions = {
  httpOnly: true, // not readable from JavaScript
  secure: env.NODE_ENV === 'production', // HTTPS only on the live site
  sameSite: 'lax', // not sent with cross-site form posts
  path: '/',
  // The browser may keep the cookie for a day; the server decides whether the session is still alive.
  maxAge: 86_400,
}

// The cookie holds a random token; the database stores only its hash, so a leaked
// sessions table cannot be used to sign in.
function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url')
  await prisma.session.create({
    data: { id: tokenHash(token), userId, expiresAt: new Date(Date.now() + IDLE_MS) },
  })
  return token
}

// When each signed-in user was last seen; written to the database at most every SEEN_MS, so a
// page full of requests costs one update, not one per request.
const SEEN_MS = 5 * 60_000
const lastSeenWritten = new Map<string, number>()
function markSeen(userId: string) {
  const now = Date.now()
  if (now - (lastSeenWritten.get(userId) ?? 0) < SEEN_MS) return
  lastSeenWritten.set(userId, now)
  prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date(now) } }).catch(() => lastSeenWritten.delete(userId))
}

export async function userForToken(token: string): Promise<PublicUser | null> {
  const session = await prisma.session.findUnique({
    where: { id: tokenHash(token) },
    include: { user: { select: publicUserSelect } },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  // Activity keeps the session alive for another IDLE_MS.
  if (session.expiresAt.getTime() - Date.now() < IDLE_MS - REFRESH_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() + IDLE_MS) } })
  }
  markSeen(session.user.id)
  return session.user
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { id: tokenHash(token) } })
}

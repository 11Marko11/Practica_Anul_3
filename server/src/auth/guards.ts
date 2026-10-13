import type { FastifyRequest } from 'fastify'
import { HttpError } from '../http/errors.js'

// Route preHandlers: `{ preHandler: requireUser }`, `requireAdmin` or `requireHost`.
export async function requireUser(request: FastifyRequest) {
  if (!request.user) throw new HttpError(401, 'unauthenticated')
}

export async function requireAdmin(request: FastifyRequest) {
  if (!request.user) throw new HttpError(401, 'unauthenticated')
  if (request.user.role !== 'ADMIN') throw new HttpError(403, 'forbidden')
}

// Users the admin gave the host role: they can follow their host's cars, bookings and reviews.
export async function requireHost(request: FastifyRequest) {
  if (!request.user) throw new HttpError(401, 'unauthenticated')
  if (!request.user.host) throw new HttpError(403, 'forbidden')
}

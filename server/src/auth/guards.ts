import type { FastifyRequest } from 'fastify'
import { HttpError } from '../http/errors.js'

// Route preHandlers: `{ preHandler: requireUser }` or `{ preHandler: requireAdmin }`.
export async function requireUser(request: FastifyRequest) {
  if (!request.user) throw new HttpError(401, 'unauthenticated')
}

export async function requireAdmin(request: FastifyRequest) {
  if (!request.user) throw new HttpError(401, 'unauthenticated')
  if (request.user.role !== 'ADMIN') throw new HttpError(403, 'forbidden')
}

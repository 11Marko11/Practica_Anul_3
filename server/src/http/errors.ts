import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

// An error the client is expected to handle. `code` is a stable string the website
// translates (e.g. 'invalid-credentials'); it never carries internal details.
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(code)
  }
}

// Every error response is { error: code }, plus `issues` for invalid input.
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, request, reply) => {
    if (err instanceof HttpError) return reply.code(err.statusCode).send({ error: err.code })
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'validation', issues: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })) })
    }
    const status = (err as { statusCode?: number }).statusCode
    if (status === 429) return reply.code(429).send({ error: 'too-many-requests' })
    if (status === 413) return reply.code(413).send({ error: 'file-too-large' })
    if (status && status >= 400 && status < 500) return reply.code(status).send({ error: 'bad-request' })
    request.log.error(err)
    return reply.code(500).send({ error: 'server-error' })
  })
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: 'not-found' }))
}

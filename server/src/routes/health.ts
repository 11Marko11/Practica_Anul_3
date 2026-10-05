import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'

// GET /api/health: used by Render's health check and to confirm the database is reachable.
export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { status: 'ok', database: 'ok' }
    } catch (err) {
      app.log.error(err, 'Database health check failed')
      return reply.code(503).send({ status: 'error', database: 'unreachable' })
    }
  })
}

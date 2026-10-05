import Fastify from 'fastify'
import { env } from './env.js'
import { healthRoutes } from './routes/health.js'

export function buildApp() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'production' ? 'info' : 'debug' },
    // Render (and Vercel's /api proxy) sit in front of the server; trust their X-Forwarded-* headers.
    trustProxy: true,
  })

  // Every route lives under /api, which Vercel forwards to this server.
  app.register(
    async api => {
      await api.register(healthRoutes)
    },
    { prefix: '/api' },
  )

  return app
}

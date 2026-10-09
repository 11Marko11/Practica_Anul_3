import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { SESSION_COOKIE, userForToken, type PublicUser } from './auth/session.js'
import { env } from './env.js'
import { registerErrorHandler } from './http/errors.js'
import { accountRoutes } from './routes/account.js'
import { adminBookingRoutes } from './routes/adminBookings.js'
import { adminPeopleRoutes } from './routes/adminPeople.js'
import { authRoutes } from './routes/auth.js'
import { bookingRoutes } from './routes/bookings.js'
import { carRoutes } from './routes/cars.js'
import { contentRoutes } from './routes/content.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { healthRoutes } from './routes/health.js'
import { reviewRoutes } from './routes/reviews.js'
import { statsRoutes } from './routes/stats.js'
import { stripeWebhookRoutes } from './routes/stripeWebhook.js'
import { transactionRoutes } from './routes/transactions.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: PublicUser | null // set from the session cookie on every /api request
  }
}

export function buildApp() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'production' ? 'info' : 'debug' },
    // Render (and Vercel's /api proxy) sit in front of the server; trust their X-Forwarded-* headers.
    trustProxy: true,
  })

  app.register(cookie)
  // Off by default; individual routes opt in with `config.rateLimit`.
  app.register(rateLimit, { global: false })
  registerErrorHandler(app)

  // Every route lives under /api, which Vercel forwards to this server.
  app.register(
    async api => {
      api.decorateRequest('user', null)
      api.addHook('onRequest', async request => {
        const token = request.cookies[SESSION_COOKIE]
        request.user = token ? await userForToken(token) : null
      })
      // Answers depend on who is signed in, so neither browsers nor Vercel may cache them.
      api.addHook('onSend', async (_request, reply) => {
        reply.header('Cache-Control', 'no-store')
      })

      await api.register(healthRoutes)
      await api.register(authRoutes)
      await api.register(carRoutes)
      await api.register(reviewRoutes)
      await api.register(statsRoutes)
      await api.register(bookingRoutes)
      await api.register(adminBookingRoutes)
      await api.register(contentRoutes)
      await api.register(dashboardRoutes)
      await api.register(transactionRoutes)
      await api.register(accountRoutes)
      await api.register(adminPeopleRoutes)
      await api.register(stripeWebhookRoutes)
    },
    { prefix: '/api' },
  )

  return app
}

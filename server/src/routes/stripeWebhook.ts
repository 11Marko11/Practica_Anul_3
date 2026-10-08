import type { FastifyInstance } from 'fastify'
import type Stripe from 'stripe'
import { markHoldReleased, markUnpaidExpired, syncCheckout } from '../bookings/payment.js'
import { env } from '../env.js'
import { HttpError } from '../http/errors.js'
import { stripe } from '../payments/stripe.js'

// POST /api/stripe/webhook: Stripe tells us when a checkout is paid or expires and when a
// card hold is released. The signature check needs the exact raw body, so this plugin
// reads JSON as a Buffer (only here; other routes still get parsed JSON).
export async function stripeWebhookRoutes(app: FastifyInstance) {
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => done(null, body))

  app.post('/stripe/webhook', async request => {
    if (!env.STRIPE_WEBHOOK_SECRET) throw new HttpError(503, 'payments-unavailable')
    const signature = request.headers['stripe-signature']
    let event: Stripe.Event
    try {
      event = stripe().webhooks.constructEvent(request.body as Buffer, String(signature ?? ''), env.STRIPE_WEBHOOK_SECRET)
    } catch {
      throw new HttpError(400, 'invalid-signature')
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const bookingId = event.data.object.metadata?.bookingId
        if (bookingId) await syncCheckout(bookingId)
        break
      }
      case 'checkout.session.expired': {
        const bookingId = event.data.object.metadata?.bookingId
        if (bookingId) await markUnpaidExpired(bookingId)
        break
      }
      case 'payment_intent.canceled':
        await markHoldReleased(event.data.object.id)
        break
    }
    return { received: true }
  })
}

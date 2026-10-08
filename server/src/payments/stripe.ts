import Stripe from 'stripe'
import { env } from '../env.js'
import { HttpError } from '../http/errors.js'

// The Stripe client, or null when no key is configured (payments are then unavailable).
const client = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      maxNetworkRetries: 2,
      ...(env.STRIPE_API_URL ? (() => {
        const url = new URL(env.STRIPE_API_URL)
        return { host: url.hostname, port: Number(url.port), protocol: url.protocol.replace(':', '') as 'http' | 'https' }
      })() : {}),
    })
  : null

export function stripe() {
  if (!client) throw new HttpError(503, 'payments-unavailable')
  return client
}

// Stripe amounts are in the currency's smallest unit: 1 MDL = 100 bani.
export const toStripeAmount = (mdl: number) => mdl * 100

import { z } from 'zod'

// Every setting the server needs, checked once at start-up so a missing value fails loudly.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().startsWith('postgres', 'DATABASE_URL must be a PostgreSQL connection string'),
  // The website's address, for Stripe's return links.
  SITE_URL: z.url().default('https://practica-anul-3-seven.vercel.app'),
  // Stripe (test mode). Without a secret key, bookings that need payment are refused.
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  // Only for local testing against stripe-mock, e.g. http://localhost:12111
  STRIPE_API_URL: z.url().optional(),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment variables:', z.prettifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data

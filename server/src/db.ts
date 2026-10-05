import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client.js'
import { env } from './env.js'

// Supabase's session pooler allows a limited number of connections on the free plan,
// so keep the pool small.
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL, max: 5 }),
})

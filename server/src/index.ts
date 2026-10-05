import { buildApp } from './app.js'
import { prisma } from './db.js'
import { env } from './env.js'

const app = buildApp()

// Render stops the old instance with SIGTERM on every deploy.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, async () => {
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  })
}

await app.listen({ host: '0.0.0.0', port: env.PORT })

import { defineConfig } from 'prisma/config'

// Locally the database URL comes from server/.env; on Render it is set as an environment variable.
try {
  process.loadEnvFile()
} catch {
  // No .env file: rely on the environment.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
})

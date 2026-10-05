# Rent Motors API

Node.js + TypeScript + Fastify server for Rent Motors, with PostgreSQL on Supabase (through Prisma).
Deployed on Render (see `../render.yaml`); the website on Vercel forwards `/api/*` here (see `../vercel.json`).

## Local development

```bash
cd server
npm install
cp .env.example .env   # then put your Supabase connection string in DATABASE_URL
npm run db:migrate     # create / update the tables
npm run dev            # http://localhost:3000/api/health
```

Run the website at the same time from the project root (`npm run dev`); it forwards `/api` to this server.

## Environment variables

| Name | Where to find it |
|---|---|
| `DATABASE_URL` | Supabase → Connect → Connection string → **Session pooler** (port 5432), with the database password filled in |
| `PORT` | Set by Render automatically; `3000` locally |
| `NODE_ENV` | `production` on Render |

## Changing the database

1. Edit `prisma/schema.prisma`.
2. `npm run db:new-migration -- --name short-description` creates the SQL in `prisma/migrations/` (needs a database in `DATABASE_URL`).
3. Review the SQL. New tables need `ALTER TABLE "Name" ENABLE ROW LEVEL SECURITY;` so Supabase's public Data API cannot read them.
4. Commit. Render applies pending migrations when the server starts.

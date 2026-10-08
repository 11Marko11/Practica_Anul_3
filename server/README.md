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
| `SITE_URL` | The website's address, used for Stripe's return links |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key (`sk_test_…`, test mode) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → the endpoint below → Signing secret (`whsec_…`) |

## Payments (Stripe, test mode)

Booking flow: the customer pays on Stripe Checkout, but the card is only **authorised** (`capture_method: manual`).
The booking then waits for the admin: **confirm** captures the money, **reject** releases the hold. Stripe releases
holds that are not captured within 7 days; the booking then becomes `EXPIRED`.

Webhook endpoint (Stripe → Developers → Webhooks → Add endpoint):
`https://rent-motors-api.onrender.com/api/stripe/webhook`, events `checkout.session.completed`,
`checkout.session.expired` and `payment_intent.canceled`.

Test card: `4242 4242 4242 4242`, any future date, any CVC.

For local testing without a Stripe account, run `docker run -p 12111:12111 stripe/stripe-mock` and set
`STRIPE_SECRET_KEY=sk_test_123` and `STRIPE_API_URL=http://localhost:12111`.

## Changing the database

1. Edit `prisma/schema.prisma`.
2. `npm run db:new-migration -- --name short-description` creates the SQL in `prisma/migrations/` (needs a database in `DATABASE_URL`).
3. Review the SQL. New tables need `ALTER TABLE "Name" ENABLE ROW LEVEL SECURITY;` so Supabase's public Data API cannot read them.
4. Commit. Render applies pending migrations when the server starts.

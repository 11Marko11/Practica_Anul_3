import { ledger } from '../bookings/ledger.js'
import { prisma } from '../db.js'
import { env } from '../env.js'
import { HttpError } from '../http/errors.js'
import { notify } from '../notifications/notify.js'
import { stripe, toStripeAmount } from '../payments/stripe.js'
import { hostMonths } from './hostIncome.js'

// Hosts pay a finished month's commission to Rent Motors by card. The month shows as paid as
// soon as Stripe reports the payment (webhook), or when the host comes back from the payment page.

export async function startCommissionCheckout(hostId: number, month: string, email: string, lang: string) {
  const row = (await hostMonths(await ledger({ car: { hostId } }))).find(m => m.month === month)
  if (!row || row.current || row.commission <= 0) throw new HttpError(409, 'nothing-to-pay')
  if (row.paid) throw new HttpError(409, 'already-paid')
  const metadata = { kind: 'commission', hostId: String(hostId), month, amount: String(row.commission) }
  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      client_reference_id: `commission-${hostId}-${month}`,
      metadata,
      payment_intent_data: { metadata, description: `Rent Motors: comision ${month}` },
      line_items: [{
        quantity: 1,
        price_data: { currency: 'mdl', unit_amount: toStripeAmount(row.commission), product_data: { name: `Comision Rent Motors · ${month}` } },
      }],
      locale: lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : 'ro',
      success_url: `${env.SITE_URL}/host?tab=finances&commission={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.SITE_URL}/host?tab=finances`,
    })
    return session.url
  } catch (err) {
    if (err instanceof HttpError) throw err
    throw new HttpError(502, 'payment-provider-error')
  }
}

// Records a paid commission from its Checkout Session; safe to call more than once. Answers with
// the month that was paid, or null.
export async function syncCommissionSession(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId)
  const meta = session.metadata ?? {}
  if (meta.kind !== 'commission' || session.payment_status !== 'paid') return null
  const hostId = Number(meta.hostId)
  const month = String(meta.month)
  const amount = Math.round((session.amount_total ?? 0) / 100) || Number(meta.amount)
  const created = await prisma.hostCommissionPayment.createMany({ data: [{ hostId, month, amount, stripeSessionId: session.id }], skipDuplicates: true })
  if (created.count) {
    const host = await prisma.host.findUnique({ where: { id: hostId }, select: { userId: true } })
    await notify(host?.userId, 'commission-paid', { month, amount }, '/host?tab=finances')
  }
  return month
}

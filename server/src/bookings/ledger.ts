import type { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../db.js'

// Money movements, rebuilt from the bookings (Stripe holds the same history; this is the
// admin's view of it). Amounts are in MDL; charges are positive, refunds negative.
// - hold:    card authorised, waiting for the admin (not money yet)
// - charge:  the admin confirmed and the held amount was captured
// - refund:  money sent back after a confirmed booking was cancelled
// - release: the hold was dropped (rejected, expired or cancelled before confirmation)
export type LedgerEntry = {
  id: string
  type: 'hold' | 'charge' | 'refund' | 'release'
  at: Date
  amount: number
  booking: { id: string; status: string; car: string; customer: string; email: string }
  hostId: number // the car's host
  rate: number // Rent Motors' share (%) of this booking
}

// `where` narrows the bookings, e.g. to one host's cars.
export async function ledger(where: Prisma.BookingWhereInput = {}): Promise<LedgerEntry[]> {
  const bookings = await prisma.booking.findMany({
    where: { ...where, authorizedAt: { not: null } },
    include: { car: { select: { brand: true, model: true, hostId: true, host: { select: { commissionRate: true } } } }, user: { select: { name: true, email: true } } },
  })
  const entries: LedgerEntry[] = []
  for (const b of bookings) {
    const booking = { id: b.id, status: b.status, car: `${b.car.brand} ${b.car.model}`, customer: b.user.name, email: b.user.email }
    const closedAt = b.cancelledAt ?? b.updatedAt
    const own = { hostId: b.car.hostId, rate: b.commissionRate ?? b.car.host.commissionRate }
    if (b.status === 'AWAITING_CONFIRMATION') entries.push({ id: `${b.id}-hold`, type: 'hold', at: b.authorizedAt!, amount: b.total, booking, ...own })
    if (b.confirmedAt) entries.push({ id: `${b.id}-charge`, type: 'charge', at: b.confirmedAt, amount: b.total, booking, ...own })
    else if (b.status !== 'AWAITING_CONFIRMATION') entries.push({ id: `${b.id}-release`, type: 'release', at: closedAt, amount: b.total, booking, ...own })
    if (b.refundedAmount > 0) entries.push({ id: `${b.id}-refund`, type: 'refund', at: closedAt, amount: -b.refundedAmount, booking, ...own })
  }
  return entries.sort((a, b) => b.at.getTime() - a.at.getTime())
}

// Charged minus refunded between two moments: what the business actually kept.
export function netBetween(entries: LedgerEntry[], from: Date, to = new Date(8.64e15)) {
  const inRange = entries.filter(e => e.at >= from && e.at < to)
  const charged = inRange.filter(e => e.type === 'charge').reduce((s, e) => s + e.amount, 0)
  const refunded = -inRange.filter(e => e.type === 'refund').reduce((s, e) => s + e.amount, 0)
  return { charged, refunded, net: charged - refunded, charges: inRange.filter(e => e.type === 'charge').length }
}

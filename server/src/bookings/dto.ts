import type { Prisma } from '../generated/prisma/client.js'
import { isoDate, moldovaTime } from './dates.js'

export const bookingInclude = {
  car: { select: { slug: true, brand: true, model: true, pricePerDay: true, photos: { orderBy: { position: 'asc' }, take: 1 } } },
  user: { select: { name: true, email: true } },
} as const satisfies Prisma.BookingInclude

export type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>

const HOLD_DAYS = 7 // Stripe releases an uncaptured card hold after 7 days
const PICKUP_HOUR = 10 // pick-ups are planned from 10:00, Moldova time
const DAY_MS = 86_400_000

// Cancellation rules from the Terms: free until 24 hours before pick-up, then one rental
// day is kept. Unpaid or unconfirmed bookings cost nothing to cancel (nothing was charged).
export function cancellation(b: BookingRow, now = new Date()) {
  if (b.status === 'PENDING_PAYMENT' || b.status === 'AWAITING_CONFIRMATION') return { allowed: true, refund: 0, charged: false }
  if (b.status !== 'CONFIRMED') return { allowed: false, refund: 0, charged: false }
  const pickupAt = moldovaTime(isoDate(b.pickupDate), PICKUP_HOUR)
  if (now >= pickupAt) return { allowed: false, refund: 0, charged: true }
  const free = now.getTime() <= pickupAt.getTime() - DAY_MS
  const oneDay = Math.round(b.rentalPrice / b.days)
  return { allowed: true, refund: free ? b.total : Math.max(0, b.total - oneDay), charged: true }
}

export function toBookingDto(b: BookingRow, options: { forAdmin?: boolean } = {}) {
  return {
    id: b.id,
    status: b.status,
    car: { slug: b.car.slug, brand: b.car.brand, model: b.car.model, photo: b.car.photos[0]?.url ?? null },
    pickupDate: isoDate(b.pickupDate),
    returnDate: isoDate(b.returnDate),
    days: b.days,
    handover: b.handover,
    deliveryAddress: b.deliveryAddress,
    deliveryKm: b.deliveryKm,
    rentalPrice: b.rentalPrice,
    deliveryFee: b.deliveryFee,
    total: b.total,
    refundedAmount: b.refundedAmount,
    phone: b.phone,
    note: b.note,
    createdAt: b.createdAt.toISOString(),
    paymentExpiresAt: b.paymentExpiresAt?.toISOString() ?? null,
    holdExpiresAt: b.authorizedAt ? new Date(b.authorizedAt.getTime() + HOLD_DAYS * DAY_MS).toISOString() : null,
    cancellation: cancellation(b),
    ...(options.forAdmin ? { customer: { name: b.user.name, email: b.user.email } } : {}),
  }
}

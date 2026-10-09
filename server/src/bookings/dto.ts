import type { Prisma } from '../generated/prisma/client.js'
import { isoDate, todayInMoldova } from './dates.js'

export const bookingInclude = {
  car: { select: { slug: true, brand: true, model: true, pricePerDay: true, photos: { orderBy: { position: 'asc' }, take: 1 } } },
  user: { select: { name: true, email: true } },
} as const satisfies Prisma.BookingInclude

export type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>

const HOLD_DAYS = 7 // Stripe releases an uncaptured card hold after 7 days
const DAY_MS = 86_400_000

// Why the admin cancelled or rejected a booking; the website shows a translated label for each code.
export const CANCEL_REASONS = ['car-unavailable', 'customer-request', 'no-show', 'documents', 'other'] as const
export const REJECT_REASONS = ['car-unavailable', 'cannot-deliver', 'documents', 'customer-request', 'other'] as const

// Customers can cancel only until the admin confirms (nothing has been charged yet).
export const customerCanCancel = (b: { status: string }) => b.status === 'PENDING_PAYMENT' || b.status === 'AWAITING_CONFIRMATION'

// After confirmation the customer can end the booking (car returned), from the pick-up day on.
export const customerCanComplete = (b: { status: string; pickupDate: Date }) =>
  b.status === 'CONFIRMED' && isoDate(b.pickupDate) <= todayInMoldova()

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
    canCancel: customerCanCancel(b),
    canComplete: customerCanComplete(b),
    // Who cancelled or rejected the booking, when and why.
    cancelled: b.status === 'CANCELLED' || b.status === 'REJECTED'
      ? { by: b.cancelledBy, reason: b.cancelReason, note: b.cancelNote, at: b.cancelledAt?.toISOString() ?? null }
      : null,
    ...(options.forAdmin ? { customer: { name: b.user.name, email: b.user.email } } : {}),
  }
}

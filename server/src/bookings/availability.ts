import type { Prisma } from '../generated/prisma/client.js'

// Bookings that hold a car's dates: paid or confirmed ones, and unpaid ones whose payment
// window is still open.
export function blockingBookings(now = new Date()): Prisma.BookingWhereInput {
  return {
    OR: [
      { status: { in: ['AWAITING_CONFIRMATION', 'CONFIRMED'] } },
      { status: 'PENDING_PAYMENT', paymentExpiresAt: { gt: now } },
    ],
  }
}

// Bookings of `carId` that overlap [pickup, return). The return day is free for the next pickup.
export function overlapping(carId: number, pickupDate: Date, returnDate: Date): Prisma.BookingWhereInput {
  return { carId, pickupDate: { lt: returnDate }, returnDate: { gt: pickupDate }, ...blockingBookings() }
}

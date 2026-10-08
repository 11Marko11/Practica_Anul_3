import { api } from './api'

export type BookingStatus = 'PENDING_PAYMENT' | 'AWAITING_CONFIRMATION' | 'CONFIRMED' | 'COMPLETED' | 'EXPIRED' | 'REJECTED' | 'CANCELLED'

export type Booking = {
  id: string
  status: BookingStatus
  car: { slug: string; brand: string; model: string; photo: string | null }
  pickupDate: string
  returnDate: string
  days: number
  handover: 'PICKUP' | 'DELIVERY'
  deliveryAddress: string | null
  deliveryKm: number | null
  rentalPrice: number
  deliveryFee: number
  total: number
  refundedAmount: number
  phone: string
  note: string | null
  createdAt: string
  paymentExpiresAt: string | null
  holdExpiresAt: string | null // when Stripe releases the card hold if the admin hasn't confirmed
  cancellation: { allowed: boolean; refund: number; charged: boolean }
  customer?: { name: string; email: string } // admin pages only
}

export type NewBooking = {
  carSlug: string
  pickupDate: string
  returnDate: string
  handover: { mode: 'PICKUP' } | { mode: 'DELIVERY'; address: string; lat: number; lng: number }
  phone: string
  note?: string
  lang: string
}

// Creates the booking and returns the Stripe page where the customer authorises the payment.
export const createBooking = (input: NewBooking) => api<{ bookingId: string; checkoutUrl: string }>('/bookings', { body: input })
export const myBookings = () => api<{ bookings: Booking[] }>('/bookings').then(r => r.bookings)
export const getBooking = (id: string) => api<{ booking: Booking }>(`/bookings/${id}`).then(r => r.booking)
export const payBooking = (id: string) => api<{ checkoutUrl: string }>(`/bookings/${id}/pay`, { method: 'POST' })
export const cancelBooking = (id: string) => api<{ booking: Booking }>(`/bookings/${id}/cancel`, { method: 'POST' }).then(r => r.booking)
export const takenDates = (slug: string) => api<{ taken: { from: string; to: string }[] }>(`/cars/${encodeURIComponent(slug)}/availability`).then(r => r.taken)

export const adminBookings = (status?: BookingStatus) =>
  api<{ bookings: Booking[] }>(`/admin/bookings${status ? `?status=${status}` : ''}`).then(r => r.bookings)
export const adminBookingAction = (id: string, action: 'confirm' | 'reject' | 'complete') =>
  api<{ booking: Booking }>(`/admin/bookings/${id}/${action}`, { method: 'POST' }).then(r => r.booking)

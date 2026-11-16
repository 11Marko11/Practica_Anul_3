import type { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../db.js'

// What a notification can say; the website turns `type` + `data` into a sentence.
export type NotificationType =
  | 'commission-changed' // { from, to } (%)
  | 'booking-awaiting' // { car, from, to } a paid booking waits for the host
  | 'booking-confirmed' // { car } for the customer
  | 'booking-rejected' // { car, reason }
  | 'booking-cancelled' // { car, refund }
  | 'car-approved' // { car }
  | 'car-rejected' // { car, note }
  | 'host-approved' // { rate }
  | 'host-rejected' // { note }
  | 'commission-paid' // { month, amount }

// Adds a notification to a user's box. Never fails the action that caused it.
export async function notify(userId: string | null | undefined, type: NotificationType, data: Prisma.InputJsonObject, link?: string) {
  if (!userId) return
  await prisma.notification.create({ data: { userId, type, data, link } }).catch(() => {})
}

// The account behind a host profile, if any.
export async function hostUserId(hostId: number) {
  return (await prisma.host.findUnique({ where: { id: hostId }, select: { userId: true } }))?.userId ?? null
}

export const carName = (car: { brand: string; model: string }) => `${car.brand} ${car.model}`

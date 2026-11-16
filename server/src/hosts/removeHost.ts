import { randomBytes } from 'node:crypto'
import { hashPassword } from '../auth/password.js'
import { prisma } from '../db.js'
import { HttpError } from '../http/errors.js'

// Deletes a host profile and everything about it: the cars with their photos, reviews and
// booking history, and the photos the host uploaded. Refused while a booking of one of the cars
// is still going on (money is held or was charged for it).
//
// The host's user account:
// - 'delete': deleted too (or closed like a customer deleting it, if they also rented cars);
// - 'keep': stays as a plain customer, without the host documents, free to ask again later.
export async function removeHost(hostId: number, account: 'delete' | 'keep') {
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { userId: true, cars: { select: { id: true, photos: { select: { url: true } } } } },
  })
  if (!host) throw new HttpError(404, 'host-not-found')
  const carIds = host.cars.map(c => c.id)
  const active = await prisma.booking.count({
    where: {
      carId: { in: carIds },
      OR: [{ status: { in: ['AWAITING_CONFIRMATION', 'CONFIRMED'] } }, { status: 'PENDING_PAYMENT', paymentExpiresAt: { gt: new Date() } }],
    },
  })
  if (active > 0) throw new HttpError(409, 'host-has-active-bookings')

  // Photos uploaded to our server are addressed /api/photos/<id>.
  const photoIds = host.cars.flatMap(c => c.photos.map(p => p.url.match(/^\/api\/photos\/([0-9a-f-]{36})$/)?.[1])).filter((x): x is string => !!x)
  const userId = host.userId
  const ownBookings = userId && account === 'delete' ? await prisma.booking.count({ where: { userId } }) : 0
  const placeholderPassword = ownBookings ? await hashPassword(randomBytes(32).toString('hex')) : ''

  await prisma.$transaction(async tx => {
    await tx.booking.deleteMany({ where: { carId: { in: carIds } } })
    await tx.car.deleteMany({ where: { id: { in: carIds } } }) // photos, reviews and papers go with the cars
    await tx.uploadedPhoto.deleteMany({ where: { OR: [{ id: { in: photoIds } }, ...(userId ? [{ uploadedBy: userId }] : [])] } })
    await tx.host.delete({ where: { id: hostId } })
    if (!userId) return
    if (account === 'keep') {
      await tx.hostDocument.deleteMany({ where: { userId } })
      await tx.user.update({
        where: { id: userId },
        data: { hostApplicationStatus: null, hostApplicationMessage: null, hostApplicationNote: null, hostApplicationSubmittedAt: null },
      })
    } else if (!ownBookings) {
      await tx.user.delete({ where: { id: userId } }) // sessions, documents and their reviews go with it
    } else {
      // The host also rented cars as a customer: keep those bookings, close the account like a
      // customer deleting it (see account.ts).
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } })
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), deletedEmail: user.email, email: `deleted-${userId}@deleted.invalid`, passwordHash: placeholderPassword, avatarUrl: null },
      })
      await tx.session.deleteMany({ where: { userId } })
      await tx.identityDocument.deleteMany({ where: { userId } })
      await tx.hostDocument.deleteMany({ where: { userId } })
    }
  })
  return { cars: carIds.length }
}

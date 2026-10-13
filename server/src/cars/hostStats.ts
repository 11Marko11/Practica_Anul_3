import { prisma } from '../db.js'

export type HostStats = { rating: number | null; reviews: number; trips: number }
const NONE: HostStats = { rating: null, reviews: 0, trips: 0 }

// A host's rating and trips, worked out from the data every time: the average of the reviews
// customers left on any of the host's cars, and the number of completed rentals of those cars.
export async function hostStats(hostIds: number[]): Promise<(hostId: number) => HostStats> {
  const ids = [...new Set(hostIds)]
  if (!ids.length) return () => NONE
  const [reviews, trips] = await Promise.all([
    prisma.$queryRaw<{ hostId: number; average: number; count: bigint }[]>`
      SELECT c."hostId", AVG(r."rating")::float AS "average", COUNT(*) AS "count"
      FROM "Review" r JOIN "Car" c ON c."id" = r."carId"
      WHERE c."hostId" = ANY(${ids}::int[])
      GROUP BY c."hostId"`,
    prisma.$queryRaw<{ hostId: number; count: bigint }[]>`
      SELECT c."hostId", COUNT(*) AS "count"
      FROM "Booking" b JOIN "Car" c ON c."id" = b."carId"
      WHERE b."status" = 'COMPLETED' AND c."hostId" = ANY(${ids}::int[])
      GROUP BY c."hostId"`,
  ])
  const byHost = new Map<number, HostStats>()
  const get = (id: number) => byHost.get(id) ?? byHost.set(id, { ...NONE }).get(id)!
  for (const r of reviews) Object.assign(get(r.hostId), { rating: Math.round(r.average * 10) / 10, reviews: Number(r.count) })
  for (const t of trips) get(t.hostId).trips = Number(t.count)
  return id => byHost.get(id) ?? NONE
}

import { z } from 'zod'
import type { Prisma } from '../generated/prisma/client.js'
import type { HostStats } from './hostStats.js'

export const carInclude = { photos: { orderBy: { position: 'asc' } }, host: true } as const satisfies Prisma.CarInclude
type CarRow = Prisma.CarGetPayload<{ include: typeof carInclude }>

// The car as the website uses it (same shape as its `Car` type in src/data/cars.ts).
export function toCarDto(car: CarRow, host: HostStats) {
  return {
    id: car.id,
    slug: car.slug,
    brand: car.brand,
    model: car.model,
    year: car.year,
    pricePerDay: car.pricePerDay,
    fuel: car.fuel,
    seats: car.seats,
    photos: car.photos.map(p => p.url),
    // Same order as photos; null when no attribution is needed.
    photoCredits: car.photos.map(p => (p.credit ? { text: p.credit, url: p.creditUrl } : null)),
    horsepower: car.horsepower,
    acceleration: car.acceleration,
    topSpeed: car.topSpeed,
    transmission: car.transmission,
    drive: car.drive,
    range: car.range ?? undefined,
    location: `${car.city}, Moldova`,
    pickup: { address: car.pickupAddress, lat: car.pickupLat, lng: car.pickupLng },
    host: { id: car.host.id, name: car.host.name, ...host },
    description: car.description,
    features: car.features,
    defects: car.defects,
    translations: {
      ...(car.descriptionRo ? { ro: { description: car.descriptionRo } } : {}),
      ...(car.descriptionRu ? { ru: { description: car.descriptionRu } } : {}),
    },
    status: car.status,
    createdAt: car.createdAt.toISOString(), // for the admin list's "recently added" order
  }
}

const text = (max: number) => z.string().trim().min(1).max(max)
const optionalText = (max: number) => z.string().trim().max(max).optional().transform(v => v || null)

// What the car forms send when creating or updating a car (admins and hosts).
const carFields = z.object({
  brand: text(60),
  model: text(80),
  year: z.int().min(1950).max(new Date().getFullYear() + 1),
  pricePerDay: z.int().positive().max(1_000_000),
  fuel: z.enum(['Petrol', 'Diesel', 'Electric', 'Hybrid']),
  seats: z.int().min(1).max(12),
  horsepower: z.int().positive().max(3000),
  acceleration: z.number().positive().max(60),
  topSpeed: z.int().positive().max(600),
  transmission: text(80),
  drive: z.enum(['AWD', 'RWD', 'FWD']),
  range: z.int().positive().max(2000).nullish(),
  city: text(60),
  pickup: z.object({ address: text(200), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  description: text(5000),
  translations: z
    .object({
      ro: z.object({ description: optionalText(5000) }).optional(),
      ru: z.object({ description: optionalText(5000) }).optional(),
    })
    .default({}),
  features: z.array(text(120)).max(40).default([]),
  defects: z.array(text(300)).max(30).default([]),
  photos: z.array(text(2000)).min(1).max(20),
})
// Admins choose the car's host and may bring back a car its host removed.
export const carInput = carFields.extend({
  hostId: z.int().positive(),
  status: z.enum(['ACTIVE', 'HIDDEN', 'REMOVED']).default('ACTIVE'),
})
// Hosts save their own cars; removing one goes through DELETE.
export const hostCarInput = carFields.extend({ status: z.enum(['ACTIVE', 'HIDDEN']).default('ACTIVE') })
export type CarInput = z.infer<typeof hostCarInput> | z.infer<typeof carInput>

// The database columns for a car, from the admin form (photos and the host are handled separately).
export function carData(input: CarInput) {
  return {
    brand: input.brand,
    model: input.model,
    year: input.year,
    pricePerDay: input.pricePerDay,
    fuel: input.fuel,
    seats: input.seats,
    horsepower: input.horsepower,
    acceleration: input.acceleration,
    topSpeed: input.topSpeed,
    transmission: input.transmission,
    drive: input.drive,
    range: input.fuel === 'Electric' || input.fuel === 'Hybrid' ? (input.range ?? null) : null,
    city: input.city,
    pickupAddress: input.pickup.address,
    pickupLat: input.pickup.lat,
    pickupLng: input.pickup.lng,
    description: input.description,
    descriptionRo: input.translations.ro?.description ?? null,
    descriptionRu: input.translations.ru?.description ?? null,
    features: input.features,
    defects: input.defects,
    status: input.status,
  }
}

// "BMW", "M4 Competition" → "bmw-m4-competition".
export function slugBase(brand: string, model: string) {
  return (
    `${brand} ${model}`
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'car'
  )
}

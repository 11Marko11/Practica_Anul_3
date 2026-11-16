import ExcelJS from 'exceljs'
import type { FastifyInstance } from 'fastify'
import { requireAdmin } from '../auth/guards.js'
import { hostStats } from '../cars/hostStats.js'
import { env } from '../env.js'
import { prisma } from '../db.js'

const STATUS = { ACTIVE: 'Afișată de gazdă', HIDDEN: 'Ascunsă', REMOVED: 'Ștearsă de gazdă' } as const
const REVIEW = { NO_DOCUMENTS: 'Neverificată · fără acte', PENDING: 'În verificare', APPROVED: 'Verificată', REJECTED: 'Respinsă' } as const
const FUEL = { Petrol: 'Benzină', Diesel: 'Motorină', Electric: 'Electric', Hybrid: 'Hibrid' } as const
const DRIVE = { FWD: 'Față', RWD: 'Spate', AWD: 'Integrală' } as const
const DOCS = { CAR_REGISTRATION: 'Certificat de înmatriculare', CAR_INSURANCE: 'Asigurare RCA', CAR_OWNERSHIP: 'Contract / procură', BUSINESS_REGISTRATION: 'Certificat de înregistrare', BANK_DETAILS: 'Rechizite bancare' } as const

// A photo as a link that opens in a browser: our uploads go through the website, the sample
// photos are Unsplash ids or files of the website.
function photoLink(url: string) {
  if (/^https?:\/\//.test(url)) return url
  if (url.startsWith('/')) return `${env.SITE_URL}${url}`
  return `https://images.unsplash.com/${url}?w=1600&auto=format`
}

const date = (d: Date) => d.toISOString().slice(0, 10)

// GET /api/admin/export/cars.xlsx: every car with all its details, its photos, its hosts and
// the papers, as an Excel workbook, so the admin keeps a copy before changing the catalogue.
export async function exportRoutes(app: FastifyInstance) {
  app.get('/admin/export/cars.xlsx', { preHandler: requireAdmin }, async (_request, reply) => {
    const cars = await prisma.car.findMany({
      include: {
        photos: { orderBy: { position: 'asc' } },
        host: { include: { user: { select: { email: true, deletedEmail: true } } } },
        reviews: { select: { rating: true } },
        documents: { select: { type: true, fileName: true, createdAt: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: [{ brand: 'asc' }, { model: 'asc' }, { id: 'asc' }],
    })
    const hosts = await prisma.host.findMany({ include: { user: { select: { email: true, deletedEmail: true } }, _count: { select: { cars: true } } }, orderBy: { name: 'asc' } })
    const stats = await hostStats(hosts.map(h => h.id))

    const book = new ExcelJS.Workbook()
    book.creator = 'Rent Motors'
    book.created = new Date()

    const sheet = (name: string, columns: { header: string; key: string; width: number }[]) => {
      const ws = book.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] })
      ws.columns = columns
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D1D1F' } }
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
      return ws
    }

    const carsSheet = sheet('Mașini', [
      { header: 'ID', key: 'id', width: 7 },
      { header: 'Marcă', key: 'brand', width: 16 },
      { header: 'Model', key: 'model', width: 22 },
      { header: 'An', key: 'year', width: 7 },
      { header: 'Preț pe zi (MDL)', key: 'price', width: 15 },
      { header: 'Combustibil', key: 'fuel', width: 12 },
      { header: 'Locuri', key: 'seats', width: 8 },
      { header: 'Putere (CP)', key: 'hp', width: 11 },
      { header: '0–100 km/h (s)', key: 'acc', width: 13 },
      { header: 'Viteză maximă (km/h)', key: 'speed', width: 18 },
      { header: 'Transmisie', key: 'transmission', width: 18 },
      { header: 'Tracțiune', key: 'drive', width: 11 },
      { header: 'Autonomie (km)', key: 'range', width: 14 },
      { header: 'Oraș', key: 'city', width: 13 },
      { header: 'Adresa de preluare', key: 'address', width: 40 },
      { header: 'Latitudine', key: 'lat', width: 11 },
      { header: 'Longitudine', key: 'lng', width: 11 },
      { header: 'Gazdă', key: 'host', width: 18 },
      { header: 'Telefon gazdă', key: 'hostPhone', width: 16 },
      { header: 'Email gazdă', key: 'hostEmail', width: 28 },
      { header: 'Vizibilitate', key: 'status', width: 17 },
      { header: 'Verificarea actelor', key: 'review', width: 22 },
      { header: 'Acte încărcate', key: 'docs', width: 34 },
      { header: 'Descriere (engleză)', key: 'descEn', width: 60 },
      { header: 'Descriere (română)', key: 'descRo', width: 60 },
      { header: 'Descriere (rusă)', key: 'descRu', width: 60 },
      { header: 'Dotări', key: 'features', width: 40 },
      { header: 'Defecte cunoscute', key: 'defects', width: 40 },
      { header: 'Fotografii', key: 'photos', width: 60 },
      { header: 'Rezervări', key: 'bookings', width: 10 },
      { header: 'Recenzii', key: 'reviews', width: 9 },
      { header: 'Rating mediu', key: 'rating', width: 12 },
      { header: 'Adresa pe site', key: 'slug', width: 40 },
      { header: 'Adăugată pe', key: 'created', width: 12 },
    ])
    for (const c of cars) {
      const avg = c.reviews.length ? Math.round((c.reviews.reduce((s, r) => s + r.rating, 0) / c.reviews.length) * 10) / 10 : null
      carsSheet.addRow({
        id: c.id, brand: c.brand, model: c.model, year: c.year, price: c.pricePerDay, fuel: FUEL[c.fuel], seats: c.seats,
        hp: c.horsepower, acc: c.acceleration, speed: c.topSpeed, transmission: c.transmission, drive: DRIVE[c.drive], range: c.range ?? '',
        city: c.city, address: c.pickupAddress, lat: c.pickupLat, lng: c.pickupLng,
        host: c.host.name, hostPhone: c.host.phone ?? '', hostEmail: c.host.user ? c.host.user.deletedEmail ?? c.host.user.email : '',
        status: STATUS[c.status], review: REVIEW[c.reviewStatus] + (c.reviewNote ? ` (${c.reviewNote})` : ''),
        docs: c.documents.map(d => DOCS[d.type]).join(', '),
        descEn: c.description, descRo: c.descriptionRo ?? '', descRu: c.descriptionRu ?? '',
        features: c.features.join('\n'), defects: c.defects.join('\n'), photos: c.photos.map(p => photoLink(p.url)).join('\n'),
        bookings: c._count.bookings, reviews: c.reviews.length, rating: avg ?? '',
        slug: `${env.SITE_URL}/cars/${c.slug}`, created: date(c.createdAt),
      })
    }
    carsSheet.getColumn('price').numFmt = '#,##0'
    for (const key of ['descEn', 'descRo', 'descRu', 'features', 'defects', 'photos']) carsSheet.getColumn(key).alignment = { wrapText: true, vertical: 'top' }

    const photosSheet = sheet('Fotografii', [
      { header: 'ID mașină', key: 'carId', width: 10 },
      { header: 'Mașina', key: 'car', width: 30 },
      { header: 'Nr.', key: 'position', width: 6 },
      { header: 'Link', key: 'url', width: 90 },
      { header: 'Autor / licență', key: 'credit', width: 40 },
    ])
    for (const c of cars) {
      for (const p of c.photos) {
        const link = photoLink(p.url)
        const row = photosSheet.addRow({ carId: c.id, car: `${c.brand} ${c.model} ${c.year}`, position: p.position + 1, url: { text: link, hyperlink: link }, credit: p.credit ?? '' })
        row.getCell('url').font = { color: { argb: 'FF0071E3' }, underline: true }
      }
    }

    const hostsSheet = sheet('Gazde', [
      { header: 'ID', key: 'id', width: 7 },
      { header: 'Nume', key: 'name', width: 22 },
      { header: 'Telefon', key: 'phone', width: 16 },
      { header: 'Email cont', key: 'email', width: 30 },
      { header: 'Mașini', key: 'cars', width: 8 },
      { header: 'Rating', key: 'rating', width: 8 },
      { header: 'Evaluări', key: 'reviews', width: 9 },
      { header: 'Curse încheiate', key: 'trips', width: 15 },
      { header: 'Gazdă din', key: 'since', width: 12 },
    ])
    for (const h of hosts) {
      const s = stats(h.id)
      hostsSheet.addRow({
        id: h.id, name: h.name, phone: h.phone ?? '', email: h.user ? h.user.deletedEmail ?? h.user.email : '',
        cars: h._count.cars, rating: s.rating ?? '', reviews: s.reviews, trips: s.trips, since: date(h.createdAt),
      })
    }

    const buffer = await book.xlsx.writeBuffer()
    return reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="rent-motors-masini-${date(new Date())}.xlsx"`)
      .send(Buffer.from(buffer as ArrayBuffer))
  })
}

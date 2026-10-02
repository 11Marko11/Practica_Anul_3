export type Car = {
  id: number
  slug: string
  brand: string
  model: string
  year: number
  pricePerDay: number // Moldovan lei (MDL)
  fuel: 'Petrol' | 'Electric' | 'Hybrid'
  seats: number
  photos: string[] // Unsplash photo ids or full image links; the first one is the cover
  horsepower: number
  acceleration: number // 0–100 km/h in seconds
  topSpeed: number // km/h
  transmission: string
  drive: 'AWD' | 'RWD'
  range?: number // electric range in km
  location: string // city shown in listings
  pickup: { address: string; lat: number; lng: number } // where the car is collected
  host: { name: string; rating: number; trips: number }
  description: string // English
  features: string[]
  // Descriptions added in the admin pages; sample cars are translated in i18n/cars.ts.
  translations?: Partial<Record<'ro' | 'ru', { description: string }>>
}

// The cars the site starts with. The live catalogue, including admin changes, comes from lib/carStore.ts.
export const SAMPLE_CARS: Car[] = [
  {
    id: 1, slug: 'porsche-911-carrera-4s', brand: 'Porsche', model: '911 Carrera 4S', year: 2024, pricePerDay: 6800, fuel: 'Petrol', seats: 4,
    photos: [
      'photo-1611821064430-0d40291d0f0b',
      'photo-1633348572662-1cf11058426e',
      'photo-1633348570573-2c70fe9129de',
      'photo-1613978148487-6d5aa7644585',
    ],
    horsepower: 443, acceleration: 3.6, topSpeed: 306, transmission: '8-speed PDK automatic', drive: 'AWD',
    location: 'Chișinău, Moldova', pickup: { address: 'Bulevardul Ștefan cel Mare și Sfânt 134, Chișinău', lat: 47.0233, lng: 28.835 },
    host: { name: 'Lukas W.', rating: 4.9, trips: 212 },
    description: 'The everyday supercar. All-wheel drive keeps the Carrera 4S planted in any weather, while the twin-turbo flat-six pulls hard all the way to the redline. Comfortable enough for a long weekend, sharp enough for a mountain pass.',
    features: ['Sport Chrono package', 'Bose surround sound', 'Apple CarPlay', 'Heated seats', 'Adaptive cruise control', 'Parking camera'],
  },
  {
    id: 2, slug: 'ferrari-roma-spider', brand: 'Ferrari', model: 'Roma Spider', year: 2024, pricePerDay: 15600, fuel: 'Petrol', seats: 4,
    photos: [
      'photo-1666790995628-9b55f65cdeeb',
      'photo-1645028875875-d3611dc96fe0',
      'photo-1687599891000-cf8af5ae4386',
      'photo-1643422487068-e3b0202c6b7c',
    ],
    horsepower: 620, acceleration: 3.4, topSpeed: 320, transmission: '8-speed dual-clutch', drive: 'RWD',
    location: 'Chișinău, Moldova', pickup: { address: 'Strada Columna 106, Chișinău', lat: 47.0271, lng: 28.8356 },
    host: { name: 'Giulia R.', rating: 5.0, trips: 64 },
    description: 'La nuova dolce vita, with the roof down. The soft top folds in 13 seconds at up to 60 km/h, and the front-mounted V8 delivers effortless grand-touring pace. Made for roads through the vineyards and long lunches.',
    features: ['Retractable soft top', 'Wind deflector', 'Passenger display', 'Heated seats', 'Apple CarPlay', 'Front lift system'],
  },
  {
    id: 3, slug: 'bmw-m4-competition', brand: 'BMW', model: 'M4 Competition', year: 2023, pricePerDay: 4600, fuel: 'Petrol', seats: 4,
    photos: [
      'photo-1682242288217-2c188bd79f0a',
      'photo-1660310477229-d03d8565f15d',
      'photo-1680102170077-ba515335b8eb',
      'photo-1728060838342-cb9744a27d1b',
    ],
    horsepower: 503, acceleration: 3.9, topSpeed: 290, transmission: '8-speed M Steptronic', drive: 'RWD',
    location: 'Bălți, Moldova', pickup: { address: 'Strada Independenței 33, Bălți', lat: 47.7573, lng: 27.9233 },
    host: { name: 'Jonas K.', rating: 4.8, trips: 187 },
    description: 'A proper driver\'s coupe. The straight-six sings, the rear-wheel-drive chassis is playful yet precise, and the M carbon bucket seats hold you in place. Four real seats make it surprisingly practical.',
    features: ['M carbon bucket seats', 'Harman Kardon audio', 'Head-up display', 'Laser headlights', 'Apple CarPlay', 'Parking assistant'],
  },
  {
    id: 4, slug: 'tesla-model-s-plaid', brand: 'Tesla', model: 'Model S Plaid', year: 2024, pricePerDay: 4200, fuel: 'Electric', seats: 5,
    photos: [
      'photo-1536700503339-1e4b06520771',
      'photo-1698514340486-cec73815c18d',
      'photo-1617704548623-340376564e68',
      'photo-1572375180666-c23ef8bef639',
    ],
    horsepower: 1020, acceleration: 2.1, topSpeed: 322, transmission: 'Single-speed', drive: 'AWD', range: 600,
    location: 'Chișinău, Moldova', pickup: { address: 'Bulevardul Moscova 21, Chișinău', lat: 47.0574, lng: 28.8642 },
    host: { name: 'Sanne V.', rating: 4.9, trips: 341 },
    description: 'Hypercar acceleration in a quiet family sedan. Three motors, over 1,000 hp and a long real-world range make the Plaid equally good at school runs and long motorway trips. Supercharger access is included.',
    features: ['Autopilot', 'Supercharger access', '17" touchscreen', 'Rear-seat display', 'Glass roof', 'Premium audio'],
  },
  {
    id: 5, slug: 'mercedes-amg-gt-63-s', brand: 'Mercedes', model: 'AMG GT 63 S', year: 2023, pricePerDay: 7400, fuel: 'Petrol', seats: 4,
    photos: [
      'photo-1622551997608-400d763b0f64',
      'photo-1692632146184-08b6f4828a23',
      'photo-1633356593834-608fe98620b9',
      'photo-1617814076231-2c58846db944',
    ],
    horsepower: 630, acceleration: 3.2, topSpeed: 315, transmission: '9-speed MCT', drive: 'AWD',
    location: 'Chișinău, Moldova', pickup: { address: 'Bulevardul Dacia 47, Chișinău', lat: 46.9795, lng: 28.8682 },
    host: { name: 'Mehmet A.', rating: 4.8, trips: 98 },
    description: 'A four-door AMG with a hand-built twin-turbo V8. Luxurious and roomy for four adults, yet capable of embarrassing sports cars on a track day. The rear-axle steering makes it feel much smaller than it is.',
    features: ['AMG Performance exhaust', 'Burmester audio', 'Massage seats', 'Rear-axle steering', 'Head-up display', '360° camera'],
  },
  {
    id: 6, slug: 'lamborghini-huracan-evo', brand: 'Lamborghini', model: 'Huracán EVO', year: 2022, pricePerDay: 17300, fuel: 'Petrol', seats: 2,
    photos: [
      'photo-1612825173281-9a193378527e',
      'photo-1657217674164-9cbf85acfc6d',
      'photo-1621285853634-713b8dd6b5fd',
      'photo-1600510424051-30d592a75353',
    ],
    horsepower: 640, acceleration: 2.9, topSpeed: 325, transmission: '7-speed dual-clutch', drive: 'AWD',
    location: 'Chișinău, Moldova', pickup: { address: 'Strada Arborilor 21, Chișinău', lat: 47.0044, lng: 28.8406 },
    host: { name: 'Alessandro B.', rating: 4.9, trips: 41 },
    description: 'A naturally aspirated V10 that revs past 8,000 rpm, wrapped in unmistakable Lamborghini lines. Rear-wheel steering and torque vectoring make it approachable, while the sound makes every tunnel an event.',
    features: ['Front-axle lift', 'Carbon ceramic brakes', 'Sensonum audio', 'Apple CarPlay', 'Parking camera', 'Launch control'],
  },
  {
    id: 7, slug: 'audi-rs-e-tron-gt', brand: 'Audi', model: 'RS e-tron GT', year: 2024, pricePerDay: 6100, fuel: 'Electric', seats: 4,
    photos: [
      'photo-1654853976163-7ecedd0dd4d3',
      'photo-1629897872216-47ceb52635ab',
      'photo-1629897874832-a2e2f0d3715d',
      'photo-1618849985511-7dbc48d7d2e4',
    ],
    horsepower: 646, acceleration: 3.3, topSpeed: 250, transmission: '2-speed automatic', drive: 'AWD', range: 470,
    location: 'Chișinău, Moldova', pickup: { address: 'Calea Ieșilor 10, Chișinău', lat: 47.0415, lng: 28.8034 },
    host: { name: 'Clara H.', rating: 4.9, trips: 126 },
    description: 'Electric grand touring with Audi quattro traction. Fast-charging up to 270 kW means a coffee break adds hundreds of kilometres, and the cabin is quiet, beautifully finished and comfortable for long days.',
    features: ['270 kW fast charging', 'Matrix LED headlights', 'Bang & Olufsen audio', 'Heated & ventilated seats', 'Adaptive air suspension', 'Head-up display'],
  },
  {
    id: 8, slug: 'ford-mustang-gt500', brand: 'Ford', model: 'Mustang GT500', year: 2023, pricePerDay: 3900, fuel: 'Petrol', seats: 4,
    photos: [
      'photo-1611566026373-c6c8da0ea861',
      'photo-1626732288613-347e78fd139c',
      'photo-1669652081031-2de2d6e641a2',
      'photo-1603553329474-99f95f35394f',
    ],
    horsepower: 760, acceleration: 3.6, topSpeed: 290, transmission: '7-speed dual-clutch', drive: 'RWD',
    location: 'Cahul, Moldova', pickup: { address: 'Strada Republicii 6, Cahul', lat: 45.9339, lng: 28.2416 },
    host: { name: 'Mike T.', rating: 4.7, trips: 233 },
    description: 'The most powerful Mustang ever built. A supercharged 5.2-litre V8 with 760 hp and a soundtrack to match. Best enjoyed on an open road with the drive modes set to Sport and the windows down.',
    features: ['Supercharged V8', 'Recaro seats', 'Bang & Olufsen audio', 'Track apps', 'Launch control', 'Apple CarPlay'],
  },
  {
    id: 9, slug: 'bmw-ix-m60', brand: 'BMW', model: 'iX M60', year: 2024, pricePerDay: 4900, fuel: 'Electric', seats: 5,
    photos: [
      'photo-1651078944944-5d5507799a51',
      'photo-1702139146899-df34319ede56',
      'photo-1642189673400-2c5f1253af27',
      'photo-1731988666722-f783057cda66',
    ],
    horsepower: 619, acceleration: 3.8, topSpeed: 250, transmission: 'Single-speed', drive: 'AWD', range: 560,
    location: 'Orhei, Moldova', pickup: { address: 'Strada Vasile Mahu 120, Orhei', lat: 47.3712, lng: 28.8224 },
    host: { name: 'Nina F.', rating: 4.8, trips: 152 },
    description: 'A spacious electric SUV with M-level performance. Five comfortable seats, a huge boot and a lounge-like cabin make it the ideal family road-trip car, and the long range means fewer charging stops.',
    features: ['Panoramic sky lounge roof', 'Bowers & Wilkins audio', 'Driving Assistant Pro', 'Heated steering wheel', 'Air suspension', 'Towing hitch'],
  },
  {
    id: 10, slug: 'porsche-taycan-turbo-s', brand: 'Porsche', model: 'Taycan Turbo S', year: 2024, pricePerDay: 7900, fuel: 'Electric', seats: 4,
    photos: [
      'photo-1642911041553-297e5295276b',
      'photo-1570374910698-6db3d787e6fb',
      'photo-1618213221550-c32da08997db',
      'photo-1615125468484-088e3dfcabb6',
    ],
    horsepower: 761, acceleration: 2.8, topSpeed: 260, transmission: '2-speed automatic', drive: 'AWD', range: 440,
    location: 'Chișinău, Moldova', pickup: { address: 'Bulevardul Decebal 99, Chișinău', lat: 46.9911, lng: 28.8592 },
    host: { name: 'Felix M.', rating: 5.0, trips: 87 },
    description: 'Porsche\'s electric flagship. Launch control delivers relentless acceleration, and it still handles like a Porsche thanks to rear-axle steering and active suspension. Charges from 10 to 80% in under 20 minutes.',
    features: ['800-volt fast charging', 'Rear-axle steering', 'Burmester audio', 'Passenger display', 'Panoramic roof', 'Adaptive cruise control'],
  },
  {
    id: 11, slug: 'mercedes-eqs-580', brand: 'Mercedes', model: 'EQS 580', year: 2023, pricePerDay: 5300, fuel: 'Electric', seats: 5,
    photos: [
      'photo-1672644087841-7c28b3e501ee',
      'photo-1788873828604-9e5a7e2892db',
      'photo-1763761260582-11e073f7cd7f',
      'photo-1664463361754-315b94783b21',
    ],
    horsepower: 523, acceleration: 4.3, topSpeed: 210, transmission: 'Single-speed', drive: 'AWD', range: 670,
    location: 'Ungheni, Moldova', pickup: { address: 'Strada Națională 15, Ungheni', lat: 47.2076, lng: 27.8009 },
    host: { name: 'Camille D.', rating: 4.9, trips: 119 },
    description: 'The electric S-Class. Whisper-quiet, remarkably efficient and packed with technology, including the full-width Hyperscreen. With the longest range in our fleet, it is the calmest way to cross a country.',
    features: ['MBUX Hyperscreen', 'Massage seats', 'Burmester 3D audio', 'Rear-axle steering', 'Air suspension', 'Ambient lighting'],
  },
  {
    id: 12, slug: 'ferrari-sf90-stradale', brand: 'Ferrari', model: 'SF90 Stradale', year: 2023, pricePerDay: 25400, fuel: 'Hybrid', seats: 2,
    photos: [
      'photo-1675426513824-25a43c3ae0ba',
      'photo-1626995449612-aece6b418f55',
      'photo-1609138314972-08a5a13e88cf',
      'photo-1757102563392-6277ee4b2dca',
    ],
    horsepower: 1000, acceleration: 2.5, topSpeed: 340, transmission: '8-speed dual-clutch', drive: 'AWD', range: 25,
    location: 'Soroca, Moldova', pickup: { address: 'Strada Independenței 32, Soroca', lat: 48.1502, lng: 28.3023 },
    host: { name: 'Marco P.', rating: 5.0, trips: 23 },
    description: 'Ferrari\'s plug-in hybrid hypercar. A twin-turbo V8 and three electric motors combine for 1,000 hp, yet it can glide silently through town on electric power alone. The most exclusive car in the collection.',
    features: ['Plug-in hybrid', 'eDrive silent mode', 'Carbon fibre interior', 'Digital cockpit', 'Front lift system', 'Launch control'],
  },
]

export function carImage(car: Car, width: number, height: number, index = 0) {
  const photo = car.photos[index]
  if (/^https?:\/\//.test(photo)) return photo
  return `https://images.unsplash.com/${photo}?w=${width}&h=${height}&fit=crop&auto=format`
}

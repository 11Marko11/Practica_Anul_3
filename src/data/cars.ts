export type Car = {
  id: number
  slug: string
  brand: string
  model: string
  year: number
  pricePerDay: number
  fuel: 'Petrol' | 'Electric' | 'Hybrid'
  seats: number
  photo: string // Unsplash photo id
  horsepower: number
  acceleration: number // 0–100 km/h in seconds
  topSpeed: number // km/h
  transmission: string
  drive: 'AWD' | 'RWD'
  range?: number // electric range in km
  location: string
  host: { name: string; rating: number; trips: number }
  description: string
  features: string[]
}

export const CARS: Car[] = [
  {
    id: 1, slug: 'porsche-911-carrera-4s', brand: 'Porsche', model: '911 Carrera 4S', year: 2024, pricePerDay: 390, fuel: 'Petrol', seats: 4,
    photo: 'photo-1611821064430-0d40291d0f0b',
    horsepower: 443, acceleration: 3.6, topSpeed: 306, transmission: '8-speed PDK automatic', drive: 'AWD',
    location: 'Munich, Germany', host: { name: 'Lukas W.', rating: 4.9, trips: 212 },
    description: 'The everyday supercar. All-wheel drive keeps the Carrera 4S planted in any weather, while the twin-turbo flat-six pulls hard all the way to the redline. Comfortable enough for a long weekend, sharp enough for a mountain pass.',
    features: ['Sport Chrono package', 'Bose surround sound', 'Apple CarPlay', 'Heated seats', 'Adaptive cruise control', 'Parking camera'],
  },
  {
    id: 2, slug: 'ferrari-roma-spider', brand: 'Ferrari', model: 'Roma Spider', year: 2024, pricePerDay: 890, fuel: 'Petrol', seats: 4,
    photo: 'photo-1592198084033-aade902d1aae',
    horsepower: 620, acceleration: 3.4, topSpeed: 320, transmission: '8-speed dual-clutch', drive: 'RWD',
    location: 'Milan, Italy', host: { name: 'Giulia R.', rating: 5.0, trips: 64 },
    description: 'La nuova dolce vita, with the roof down. The soft top folds in 13 seconds at up to 60 km/h, and the front-mounted V8 delivers effortless grand-touring pace. Made for coastal roads and long lunches.',
    features: ['Retractable soft top', 'Wind deflector', 'Passenger display', 'Heated seats', 'Apple CarPlay', 'Front lift system'],
  },
  {
    id: 3, slug: 'bmw-m4-competition', brand: 'BMW', model: 'M4 Competition', year: 2023, pricePerDay: 260, fuel: 'Petrol', seats: 4,
    photo: 'photo-1555215695-3004980ad54e',
    horsepower: 503, acceleration: 3.9, topSpeed: 290, transmission: '8-speed M Steptronic', drive: 'RWD',
    location: 'Berlin, Germany', host: { name: 'Jonas K.', rating: 4.8, trips: 187 },
    description: 'A proper driver\'s coupe. The straight-six sings, the rear-wheel-drive chassis is playful yet precise, and the M carbon bucket seats hold you in place. Four real seats make it surprisingly practical.',
    features: ['M carbon bucket seats', 'Harman Kardon audio', 'Head-up display', 'Laser headlights', 'Apple CarPlay', 'Parking assistant'],
  },
  {
    id: 4, slug: 'tesla-model-s-plaid', brand: 'Tesla', model: 'Model S Plaid', year: 2024, pricePerDay: 240, fuel: 'Electric', seats: 5,
    photo: 'photo-1617788138017-80ad40651399',
    horsepower: 1020, acceleration: 2.1, topSpeed: 322, transmission: 'Single-speed', drive: 'AWD', range: 600,
    location: 'Amsterdam, Netherlands', host: { name: 'Sanne V.', rating: 4.9, trips: 341 },
    description: 'Hypercar acceleration in a quiet family sedan. Three motors, over 1,000 hp and a long real-world range make the Plaid equally good at school runs and long motorway trips. Supercharger access is included.',
    features: ['Autopilot', 'Supercharger access', '17" touchscreen', 'Rear-seat display', 'Glass roof', 'Premium audio'],
  },
  {
    id: 5, slug: 'mercedes-amg-gt-63-s', brand: 'Mercedes', model: 'AMG GT 63 S', year: 2023, pricePerDay: 420, fuel: 'Petrol', seats: 4,
    photo: 'photo-1618843479313-40f8afb4b4d8',
    horsepower: 630, acceleration: 3.2, topSpeed: 315, transmission: '9-speed MCT', drive: 'AWD',
    location: 'Stuttgart, Germany', host: { name: 'Mehmet A.', rating: 4.8, trips: 98 },
    description: 'A four-door AMG with a hand-built twin-turbo V8. Luxurious and roomy for four adults, yet capable of embarrassing sports cars on a track day. The rear-axle steering makes it feel much smaller than it is.',
    features: ['AMG Performance exhaust', 'Burmester audio', 'Massage seats', 'Rear-axle steering', 'Head-up display', '360° camera'],
  },
  {
    id: 6, slug: 'lamborghini-huracan-evo', brand: 'Lamborghini', model: 'Huracán EVO', year: 2022, pricePerDay: 990, fuel: 'Petrol', seats: 2,
    photo: 'photo-1612825173281-9a193378527e',
    horsepower: 640, acceleration: 2.9, topSpeed: 325, transmission: '7-speed dual-clutch', drive: 'AWD',
    location: 'Monaco', host: { name: 'Alessandro B.', rating: 4.9, trips: 41 },
    description: 'A naturally aspirated V10 that revs past 8,000 rpm, wrapped in unmistakable Lamborghini lines. Rear-wheel steering and torque vectoring make it approachable, while the sound makes every tunnel an event.',
    features: ['Front-axle lift', 'Carbon ceramic brakes', 'Sensonum audio', 'Apple CarPlay', 'Parking camera', 'Launch control'],
  },
  {
    id: 7, slug: 'audi-rs-e-tron-gt', brand: 'Audi', model: 'RS e-tron GT', year: 2024, pricePerDay: 350, fuel: 'Electric', seats: 4,
    photo: 'photo-1606664515524-ed2f786a0bd6',
    horsepower: 646, acceleration: 3.3, topSpeed: 250, transmission: '2-speed automatic', drive: 'AWD', range: 470,
    location: 'Vienna, Austria', host: { name: 'Clara H.', rating: 4.9, trips: 126 },
    description: 'Electric grand touring with Audi quattro traction. Fast-charging up to 270 kW means a coffee break adds hundreds of kilometres, and the cabin is quiet, beautifully finished and comfortable for long days.',
    features: ['270 kW fast charging', 'Matrix LED headlights', 'Bang & Olufsen audio', 'Heated & ventilated seats', 'Adaptive air suspension', 'Head-up display'],
  },
  {
    id: 8, slug: 'ford-mustang-gt500', brand: 'Ford', model: 'Mustang GT500', year: 2023, pricePerDay: 220, fuel: 'Petrol', seats: 4,
    photo: 'photo-1547744152-14d985cb937f',
    horsepower: 760, acceleration: 3.6, topSpeed: 290, transmission: '7-speed dual-clutch', drive: 'RWD',
    location: 'Los Angeles, USA', host: { name: 'Mike T.', rating: 4.7, trips: 233 },
    description: 'The most powerful Mustang ever built. A supercharged 5.2-litre V8 with 760 hp and a soundtrack to match. Best enjoyed on an open road with the drive modes set to Sport and the windows down.',
    features: ['Supercharged V8', 'Recaro seats', 'Bang & Olufsen audio', 'Track apps', 'Launch control', 'Apple CarPlay'],
  },
  {
    id: 9, slug: 'bmw-ix-m60', brand: 'BMW', model: 'iX M60', year: 2024, pricePerDay: 280, fuel: 'Electric', seats: 5,
    photo: 'photo-1651078944944-5d5507799a51',
    horsepower: 619, acceleration: 3.8, topSpeed: 250, transmission: 'Single-speed', drive: 'AWD', range: 560,
    location: 'Zurich, Switzerland', host: { name: 'Nina F.', rating: 4.8, trips: 152 },
    description: 'A spacious electric SUV with M-level performance. Five comfortable seats, a huge boot and a lounge-like cabin make it the ideal family road-trip car, and the long range means fewer charging stops.',
    features: ['Panoramic sky lounge roof', 'Bowers & Wilkins audio', 'Driving Assistant Pro', 'Heated steering wheel', 'Air suspension', 'Towing hitch'],
  },
  {
    id: 10, slug: 'porsche-taycan-turbo-s', brand: 'Porsche', model: 'Taycan Turbo S', year: 2024, pricePerDay: 450, fuel: 'Electric', seats: 4,
    photo: 'photo-1642911041553-297e5295276b',
    horsepower: 761, acceleration: 2.8, topSpeed: 260, transmission: '2-speed automatic', drive: 'AWD', range: 440,
    location: 'Hamburg, Germany', host: { name: 'Felix M.', rating: 5.0, trips: 87 },
    description: 'Porsche\'s electric flagship. Launch control delivers relentless acceleration, and it still handles like a Porsche thanks to rear-axle steering and active suspension. Charges from 10 to 80% in under 20 minutes.',
    features: ['800-volt fast charging', 'Rear-axle steering', 'Burmester audio', 'Passenger display', 'Panoramic roof', 'Adaptive cruise control'],
  },
  {
    id: 11, slug: 'mercedes-eqs-580', brand: 'Mercedes', model: 'EQS 580', year: 2023, pricePerDay: 300, fuel: 'Electric', seats: 5,
    photo: 'photo-1614200179396-2bdb77ebf81b',
    horsepower: 523, acceleration: 4.3, topSpeed: 210, transmission: 'Single-speed', drive: 'AWD', range: 670,
    location: 'Paris, France', host: { name: 'Camille D.', rating: 4.9, trips: 119 },
    description: 'The electric S-Class. Whisper-quiet, remarkably efficient and packed with technology, including the full-width Hyperscreen. With the longest range in our fleet, it is the calmest way to cross a country.',
    features: ['MBUX Hyperscreen', 'Massage seats', 'Burmester 3D audio', 'Rear-axle steering', 'Air suspension', 'Ambient lighting'],
  },
  {
    id: 12, slug: 'ferrari-sf90-stradale', brand: 'Ferrari', model: 'SF90 Stradale', year: 2023, pricePerDay: 1450, fuel: 'Hybrid', seats: 2,
    photo: 'photo-1583121274602-3e2820c69888',
    horsepower: 1000, acceleration: 2.5, topSpeed: 340, transmission: '8-speed dual-clutch', drive: 'AWD', range: 25,
    location: 'Maranello, Italy', host: { name: 'Marco P.', rating: 5.0, trips: 23 },
    description: 'Ferrari\'s plug-in hybrid hypercar. A twin-turbo V8 and three electric motors combine for 1,000 hp, yet it can glide silently through town on electric power alone. The most exclusive car in the collection.',
    features: ['Plug-in hybrid', 'eDrive silent mode', 'Carbon fibre interior', 'Digital cockpit', 'Front lift system', 'Launch control'],
  },
]

export function carImage(car: Car, width: number, height: number) {
  return `https://images.unsplash.com/${car.photo}?w=${width}&h=${height}&fit=crop&auto=format`
}

export function findCar(slug: string) {
  return CARS.find(c => c.slug === slug)
}

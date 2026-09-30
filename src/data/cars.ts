export type Car = {
  id: number
  brand: string
  model: string
  year: number
  pricePerDay: number
  fuel: 'Petrol' | 'Electric' | 'Hybrid'
  seats: number
  image: string
}

export const CARS: Car[] = [
  { id: 1, brand: 'Porsche', model: '911 Carrera 4S', year: 2024, pricePerDay: 390, fuel: 'Petrol', seats: 4, image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&h=600&fit=crop&auto=format' },
  { id: 2, brand: 'Ferrari', model: 'Roma Spider', year: 2024, pricePerDay: 890, fuel: 'Petrol', seats: 4, image: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=900&h=600&fit=crop&auto=format' },
  { id: 3, brand: 'BMW', model: 'M4 Competition', year: 2023, pricePerDay: 260, fuel: 'Petrol', seats: 4, image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&h=600&fit=crop&auto=format' },
  { id: 4, brand: 'Tesla', model: 'Model S Plaid', year: 2024, pricePerDay: 240, fuel: 'Electric', seats: 5, image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=900&h=600&fit=crop&auto=format' },
  { id: 5, brand: 'Mercedes', model: 'AMG GT 63 S', year: 2023, pricePerDay: 420, fuel: 'Petrol', seats: 4, image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=900&h=600&fit=crop&auto=format' },
  { id: 6, brand: 'Lamborghini', model: 'Huracán EVO', year: 2022, pricePerDay: 990, fuel: 'Petrol', seats: 2, image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&h=600&fit=crop&auto=format' },
  { id: 7, brand: 'Audi', model: 'RS e-tron GT', year: 2024, pricePerDay: 350, fuel: 'Electric', seats: 4, image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&h=600&fit=crop&auto=format' },
  { id: 8, brand: 'Ford', model: 'Mustang GT500', year: 2023, pricePerDay: 220, fuel: 'Petrol', seats: 4, image: 'https://images.unsplash.com/photo-1547744152-14d985cb937f?w=900&h=600&fit=crop&auto=format' },
  { id: 9, brand: 'BMW', model: 'iX M60', year: 2024, pricePerDay: 280, fuel: 'Electric', seats: 5, image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=900&h=600&fit=crop&auto=format' },
  { id: 10, brand: 'Porsche', model: 'Taycan Turbo S', year: 2024, pricePerDay: 450, fuel: 'Electric', seats: 4, image: 'https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?w=900&h=600&fit=crop&auto=format' },
  { id: 11, brand: 'Mercedes', model: 'EQS 580', year: 2023, pricePerDay: 300, fuel: 'Electric', seats: 5, image: 'https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?w=900&h=600&fit=crop&auto=format' },
  { id: 12, brand: 'Ferrari', model: 'SF90 Stradale', year: 2023, pricePerDay: 1450, fuel: 'Hybrid', seats: 2, image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=900&h=600&fit=crop&auto=format' },
]

export function findCar(id: number) {
  return CARS.find(c => c.id === id)
}

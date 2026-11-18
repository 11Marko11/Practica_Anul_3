// The towns a car can be listed in (the same list as the website's CITIES), with their centres.
const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: 'Chișinău', lat: 47.0105, lng: 28.8638 },
  { name: 'Bălți', lat: 47.7615, lng: 27.929 },
  { name: 'Cahul', lat: 45.9075, lng: 28.1944 },
  { name: 'Căușeni', lat: 46.6442, lng: 29.4114 },
  { name: 'Comrat', lat: 46.3017, lng: 28.6553 },
  { name: 'Drochia', lat: 48.0353, lng: 27.8128 },
  { name: 'Edineț', lat: 48.1681, lng: 27.3044 },
  { name: 'Florești', lat: 47.8933, lng: 28.295 },
  { name: 'Hîncești', lat: 46.8306, lng: 28.5911 },
  { name: 'Ialoveni', lat: 46.9431, lng: 28.7778 },
  { name: 'Orhei', lat: 47.3831, lng: 28.8231 },
  { name: 'Soroca', lat: 48.1567, lng: 28.2975 },
  { name: 'Strășeni', lat: 47.1414, lng: 28.6103 },
  { name: 'Ungheni', lat: 47.2108, lng: 27.8 },
]

// Letters without diacritics and in lower case, so "Chisinau" matches "Chișinău".
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// The town of a place: the one named in its address, otherwise the closest one.
export function cityOf(address: string, lat: number, lng: number) {
  const named = CITIES.find(c => plain(address).includes(plain(c.name)))
  if (named) return named.name
  const km2 = (c: { lat: number; lng: number }) => (c.lat - lat) ** 2 + ((c.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2
  return CITIES.reduce((a, b) => (km2(b) < km2(a) ? b : a)).name
}

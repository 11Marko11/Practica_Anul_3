// Phone numbers are stored as "+" + country code + number, e.g. "+37369123456".

// The countries a number can be from: Moldova and its neighbours first, then the usual places
// people come from or work in. `iso` gives the flag and the country's name in each language.
export const COUNTRIES = [
  { iso: 'MD', code: '373' }, { iso: 'RO', code: '40' }, { iso: 'UA', code: '380' }, { iso: 'RU', code: '7' },
  { iso: 'AT', code: '43' }, { iso: 'BE', code: '32' }, { iso: 'BY', code: '375' }, { iso: 'BG', code: '359' },
  { iso: 'CA', code: '1' }, { iso: 'CZ', code: '420' }, { iso: 'DK', code: '45' }, { iso: 'FR', code: '33' },
  { iso: 'GE', code: '995' }, { iso: 'DE', code: '49' }, { iso: 'GR', code: '30' }, { iso: 'IE', code: '353' },
  { iso: 'IL', code: '972' }, { iso: 'IT', code: '39' }, { iso: 'KZ', code: '7' }, { iso: 'NL', code: '31' },
  { iso: 'NO', code: '47' }, { iso: 'PL', code: '48' }, { iso: 'PT', code: '351' }, { iso: 'ES', code: '34' },
  { iso: 'SE', code: '46' }, { iso: 'CH', code: '41' }, { iso: 'TR', code: '90' }, { iso: 'GB', code: '44' },
  { iso: 'US', code: '1' }, { iso: 'AE', code: '971' },
] as const
export type Country = (typeof COUNTRIES)[number]

// A sample mobile number for each country (after the country code), shown as the field's hint.
const EXAMPLES: Record<string, string> = {
  MD: '69123456', RO: '712345678', UA: '501234567', RU: '9123456789', AT: '664123456', BE: '470123456',
  BY: '291234567', BG: '871234567', CA: '5062345678', CZ: '601123456', DK: '32123456', FR: '612345678',
  GE: '555123456', DE: '15123456789', GR: '6912345678', IE: '850123456', IL: '502345678', IT: '3123456789',
  KZ: '7710009998', NL: '612345678', NO: '40612345', PL: '512345678', PT: '912345678', ES: '612345678',
  SE: '701234567', CH: '781234567', TR: '5012345678', GB: '7400123456', US: '2015550123', AE: '501234567',
}
export const examplePhone = (country: Country) => groupDigits(country.code, EXAMPLES[country.iso] ?? '')

export const flag = (iso: string) => String.fromCodePoint(...[...iso].map(c => 0x1f1e6 + c.charCodeAt(0) - 65))

// How many digits the number has after the country code: exactly 8 in Moldova.
export function numberLength(code: string): { min: number; max: number } {
  return code === '373' ? { min: 8, max: 8 } : { min: 6, max: 15 - code.length }
}

// A stored or typed number split into its country and the rest; numbers without a country code
// are taken as Moldovan ("069123456" → MD, "69123456").
export function splitPhone(phone: string | null | undefined): { country: Country; number: string } {
  const md = COUNTRIES[0]
  if (!phone) return { country: md, number: '' }
  const digits = phone.replace(/\D/g, '')
  if (!phone.trim().startsWith('+') && !digits.startsWith('00')) return { country: md, number: digits.replace(/^0+/, '') }
  const full = digits.replace(/^00/, '')
  const match = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length).find(c => full.startsWith(c.code))
  return match ? { country: match, number: full.slice(match.code.length) } : { country: md, number: full }
}

// The number in groups: "69 123 456" in Moldova, threes elsewhere.
export function groupDigits(code: string, number: string) {
  if (code === '373') return [number.slice(0, 2), number.slice(2, 5), number.slice(5)].filter(Boolean).join(' ')
  return number.replace(/(\d{3})(?=\d)/g, '$1 ')
}

// "+37369123456" → "+373 69 123 456".
export function formatPhone(phone: string | null | undefined) {
  if (!phone) return ''
  const { country, number } = splitPhone(phone)
  return number ? `+${country.code} ${groupDigits(country.code, number)}` : phone
}

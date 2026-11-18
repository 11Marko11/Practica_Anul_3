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

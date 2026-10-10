// Phone numbers are stored in one form, "+37369123456", so the same number typed
// differently ("069 123 456", "+373 69 123 456", "0037369123456") is recognised.
// Moldovan numbers may be written without the country code; others need theirs.
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '')
  if (input.trim().startsWith('00') || digits.startsWith('00')) digits = digits.replace(/^00/, '')
  else if (!input.trim().startsWith('+')) {
    if (digits.length === 9 && digits.startsWith('0')) digits = `373${digits.slice(1)}` // 069123456
    else if (digits.length === 8) digits = `373${digits}` // 69123456
  }
  if (digits.length < 8 || digits.length > 15) return null
  if (digits.startsWith('0')) return null // a local number without its country code
  if (digits.startsWith('373') && digits.length !== 11) return null // Moldova: +373 and 8 digits
  return `+${digits}`
}

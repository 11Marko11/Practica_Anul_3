import type { Lang } from '../i18n/I18nContext'

// Prices are in Moldovan lei: 6800 → "6 800 MDL".
export function fmt(n: number) {
  return n.toLocaleString('en-US').replace(/,/g, ' ') + ' MDL'
}

// Dates are 'YYYY-MM-DD' strings, handled in UTC so time zones can't shift the day.
export function addDays(date: string, n: number) {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysBetween(from: string, to: string) {
  const ms = new Date(to + 'T00:00:00Z').getTime() - new Date(from + 'T00:00:00Z').getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
}

// "5 October 2026" / "5 octombrie 2026" / "5 октября 2026 г.", for a 'YYYY-MM-DD' date.
export function formatDate(date: string, lang: Lang) {
  return new Date(date + 'T00:00:00Z').toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

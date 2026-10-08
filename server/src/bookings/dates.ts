// Booking dates are 'YYYY-MM-DD' calendar days in Moldova's time zone, stored as UTC midnight.
export const TIME_ZONE = 'Europe/Chisinau'
const DAY_MS = 86_400_000

export const isoDate = (d: Date) => d.toISOString().slice(0, 10)
export const fromIsoDate = (s: string) => new Date(`${s}T00:00:00Z`)
export const addDays = (s: string, n: number) => isoDate(new Date(fromIsoDate(s).getTime() + n * DAY_MS))
export const daysBetween = (from: string, to: string) => Math.round((fromIsoDate(to).getTime() - fromIsoDate(from).getTime()) / DAY_MS)

// Today's date in Moldova.
export function todayInMoldova(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

// The moment `date` at `hour`:00 happens in Moldova (handles summer/winter time).
export function moldovaTime(date: string, hour: number) {
  const guess = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), hour)
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      .formatToParts(new Date(guess))
      .map(p => [p.type, Number(p.value)]),
  )
  const shownAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
  return new Date(guess - (shownAsUtc - guess))
}

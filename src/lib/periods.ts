// The period choices of the list filters ("this month", "last 3 months"…) and the days they cover.
export const PERIODS = ['all', 'month', 'last3', 'year', 'custom'] as const
export type PeriodChoice = (typeof PERIODS)[number]

// Today in Moldova, "YYYY-MM-DD", like the dates the server sends.
export const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Chisinau' })

// The first and last day of a period; null means no limit.
export function periodRange(period: PeriodChoice, from: string, to: string): [string | null, string | null] {
  const now = today()
  const [y, m] = now.split('-').map(Number)
  const iso = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
  if (period === 'month') return [iso(y, m, 1), iso(y, m + 1, 0)]
  if (period === 'last3') return [iso(y, m - 2, 1), iso(y, m + 1, 0)]
  if (period === 'year') return [`${y}-01-01`, `${y}-12-31`]
  if (period === 'custom') return [from || null, to || null]
  return [null, null]
}

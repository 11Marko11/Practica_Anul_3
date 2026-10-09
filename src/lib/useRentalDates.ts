import { useUrlParams } from './useUrlParams'
import { addDays, daysBetween, today } from './rental'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Pick-up/return dates come from the URL (?from=&to=) so they carry over from the listing.
// Without them the period starts today, so the car list shows what can be rented right now.
export function useRentalDates() {
  const { params, edit } = useUrlParams()
  const from = params.get('from')
  const to = params.get('to')
  const pickup = from && ISO_DATE.test(from) && from >= today() ? from : today()
  const dropoff = to && ISO_DATE.test(to) && to > pickup ? to : addDays(pickup, 3)

  // Keeps the other parameters (the car list's filters).
  function setDates(nextPickup: string, nextDropoff: string) {
    edit(next => {
      next.set('from', nextPickup)
      next.set('to', nextDropoff)
    })
  }

  return {
    pickup,
    dropoff,
    days: daysBetween(pickup, dropoff),
    query: `?from=${pickup}&to=${dropoff}`,
    changePickup: (value: string) => setDates(value, value >= dropoff ? addDays(value, 1) : dropoff),
    changeDropoff: (value: string) => setDates(pickup, value),
  }
}

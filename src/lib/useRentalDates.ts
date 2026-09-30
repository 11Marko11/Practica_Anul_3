import { useSearchParams } from 'react-router'
import { addDays, daysBetween, today } from './rental'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Pick-up/return dates come from the URL (?from=&to=) so they carry over from the listing.
export function useRentalDates() {
  const [params, setParams] = useSearchParams()
  const from = params.get('from')
  const to = params.get('to')
  const pickup = from && ISO_DATE.test(from) && from >= today() ? from : addDays(today(), 1)
  const dropoff = to && ISO_DATE.test(to) && to > pickup ? to : addDays(pickup, 3)

  function setDates(nextPickup: string, nextDropoff: string) {
    setParams({ from: nextPickup, to: nextDropoff }, { replace: true })
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

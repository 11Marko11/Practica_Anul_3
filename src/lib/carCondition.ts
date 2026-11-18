import { api } from './api'

// Whether a car can be rented now, as its host says; anything but READY keeps it off the site.
// NO_DOCUMENTS is set by the site while the car's papers are missing, and the host can't pick it.
export const CAR_CONDITIONS = ['READY', 'CLEANING', 'NEEDS_CLEANING', 'NEEDS_CHECK', 'IN_SERVICE', 'DAMAGED', 'OTHER', 'NO_DOCUMENTS'] as const
export type CarCondition = (typeof CAR_CONDITIONS)[number]
export const HOST_CONDITIONS = CAR_CONDITIONS.filter(k => k !== 'NO_DOCUMENTS')

export const CONDITION_COLORS: Record<CarCondition, { background: string; color: string }> = {
  READY: { background: '#e3f6e8', color: '#1b7a35' },
  CLEANING: { background: '#e8f1fd', color: '#0058b0' },
  NEEDS_CLEANING: { background: '#fff4e0', color: '#9a5b00' },
  NEEDS_CHECK: { background: '#fff4e0', color: '#9a5b00' },
  IN_SERVICE: { background: '#f0eafc', color: '#5b3aa8' },
  DAMAGED: { background: '#fdeaea', color: '#b3261e' },
  OTHER: { background: '#f2f2f4', color: '#424245' },
  NO_DOCUMENTS: { background: '#fdeaea', color: '#b3261e' },
}

export const setCarCondition = (carId: number, condition: CarCondition, note?: string) =>
  api(`/host/cars/${carId}/condition`, { body: { condition, note: note || undefined } })

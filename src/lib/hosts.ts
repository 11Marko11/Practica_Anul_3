import { useEffect, useState } from 'react'
import { api } from './api'

export type AdminHost = {
  id: number
  name: string
  phone: string | null
  commissionRate: number // Rent Motors' share (%) of the host's monthly income
  rating: number | null // average of the reviews of their cars; null before the first review
  reviews: number
  trips: number // completed rentals of their cars
  createdAt: string
  account: { id: string; name: string; email: string; hasPassword: boolean } | null // the host's sign-in account
  cars: { id: number; slug: string; brand: string; model: string; year: number; status: 'ACTIVE' | 'HIDDEN' | 'REMOVED' }[]
}

export type HostInput = { name: string; phone?: string }
export type AccountInput = { email: string; password?: string }

// Every host with their cars, for the admin pages (`enabled` false skips the request,
// e.g. in a host's own car form). `reload` after a change.
export function useAdminHosts(enabled = true) {
  const [hosts, setHosts] = useState<AdminHost[] | null>(null)
  const reload = () =>
    api<{ hosts: AdminHost[] }>('/admin/hosts')
      .then(r => { setHosts(r.hosts); return r.hosts })
      .catch(() => { setHosts([]); return [] as AdminHost[] })
  useEffect(() => {
    if (enabled) reload()
  }, [enabled])
  return { hosts, reload }
}

// Rent Motors' possible shares (%) of a host's income.
export const COMMISSION_RATES = [5, 10, 15, 20, 25, 30] as const
export const updateCommission = (id: number, rate: number) => api(`/admin/hosts/${id}/commission`, { method: 'PUT', body: { rate } })

export const createHostWithAccount = (input: HostInput & Required<AccountInput> & { commissionRate?: number }) => api<{ id: number }>('/admin/hosts', { body: input })
export const updateHostAccount = (id: number, input: AccountInput) => api(`/admin/hosts/${id}/account`, { method: 'PUT', body: input })
export const updateHost = (id: number, input: HostInput) => api(`/admin/hosts/${id}`, { method: 'PUT', body: input })
export const deleteHost = (id: number) => api(`/admin/hosts/${id}`, { method: 'DELETE' })

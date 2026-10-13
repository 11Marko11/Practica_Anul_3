import { useEffect, useState } from 'react'
import { api } from './api'

export type AdminHost = {
  id: number
  name: string
  phone: string | null
  rating: number | null // average of the reviews of their cars; null before the first review
  reviews: number
  trips: number // completed rentals of their cars
  createdAt: string
  cars: { id: number; slug: string; brand: string; model: string; year: number; status: 'ACTIVE' | 'HIDDEN' }[]
}

export type HostInput = { name: string; phone?: string }

// Every host with their cars, for the admin pages. `reload` after a change.
export function useAdminHosts() {
  const [hosts, setHosts] = useState<AdminHost[] | null>(null)
  const reload = () => api<{ hosts: AdminHost[] }>('/admin/hosts').then(r => setHosts(r.hosts)).catch(() => setHosts([]))
  useEffect(() => {
    reload()
  }, [])
  return { hosts, reload }
}

export const createHost = (input: HostInput) => api<{ id: number }>('/admin/hosts', { body: input })
export const updateHost = (id: number, input: HostInput) => api(`/admin/hosts/${id}`, { method: 'PUT', body: input })
export const deleteHost = (id: number) => api(`/admin/hosts/${id}`, { method: 'DELETE' })

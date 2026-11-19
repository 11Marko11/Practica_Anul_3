import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from './api'

export type Review = { id: string; name: string; avatarUrl?: string | null; rating: number; date: string; text: string; mine: boolean; authorId?: string | null }

// The last reviews seen for each car (and viewer), so coming back to a car's page shows them at
// once, at full height, and Back can return straight to where the user was. Refreshed on each visit.
const cache = new Map<string, { reviews: Review[]; canReview: boolean }>()

// A car's reviews from the API, and whether the signed-in user can add one
// (only after a completed trip with this car).
export function useReviews(slug: string) {
  const { user } = useAuth()
  const key = `${user?.id ?? ''}|${slug}`
  const cached = cache.get(key)
  const [reviews, setReviews] = useState<Review[]>(cached?.reviews ?? [])
  const [canReview, setCanReview] = useState(cached?.canReview ?? false)
  const [loading, setLoading] = useState(!cached)

  const load = useCallback(async () => {
    try {
      const res = await api<{ reviews: Review[]; canReview: boolean }>(`/cars/${encodeURIComponent(slug)}/reviews`)
      setReviews(res.reviews)
      setCanReview(res.canReview)
      cache.set(key, { reviews: res.reviews, canReview: res.canReview })
    } catch {
      // Keep whatever is shown; reviews are not essential to the page.
    } finally {
      setLoading(false)
    }
  }, [slug, key])

  // Reload when the user signs in or out: "mine" and canReview depend on who is asking.
  useEffect(() => {
    load()
  }, [load, user?.id])

  const average = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  return {
    reviews,
    average,
    canReview,
    loading,
    add: async (rating: number, text: string) => {
      await api(`/cars/${encodeURIComponent(slug)}/reviews`, { body: { rating, text } })
      await load()
    },
    remove: async (id: string) => {
      await api(`/reviews/${id}`, { method: 'DELETE' })
      await load()
    },
  }
}

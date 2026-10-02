import { useState } from 'react'
import { SAMPLE_REVIEWS, type Review } from '../data/reviews'
import { today } from './rental'

// Reviews posted on the site live in localStorage until there is a backend,
// keyed by car slug, and are shown together with the sample reviews.
const REVIEWS_KEY = 'rentmotors.reviews'

function readPosted(): Record<string, Review[]> {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, Review[]>) : {}
  } catch {
    return {}
  }
}

function writePosted(all: Record<string, Review[]>) {
  try {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(all))
  } catch {
    // Storage unavailable (private mode): the review just won't persist.
  }
}

export function useReviews(slug: string) {
  const [posted, setPosted] = useState<Review[]>(() => readPosted()[slug] ?? [])

  function save(next: Review[]) {
    setPosted(next)
    writePosted({ ...readPosted(), [slug]: next })
  }

  const reviews = [...posted, ...(SAMPLE_REVIEWS[slug] ?? [])].sort((a, b) => b.date.localeCompare(a.date))
  const average = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  return {
    reviews,
    average,
    add: (review: Omit<Review, 'id' | 'date'>) => save([{ ...review, id: crypto.randomUUID(), date: today() }, ...posted]),
    remove: (id: string) => save(posted.filter(r => r.id !== id)),
  }
}

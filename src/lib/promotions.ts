import { useEffect, useState } from 'react'
import type { Lang } from '../i18n/I18nContext'
import { api } from './api'

export type Placement = 'HOME' | 'MARKETPLACE'
export const PLACEMENTS: Placement[] = ['HOME', 'MARKETPLACE']
export type PromotionTexts = Record<Lang, { title: string; text: string; button: string }>
export type Promotion = {
  id: number
  placement: Placement
  texts: PromotionTexts
  imageUrl: string | null
  linkUrl: string | null
  active: boolean
  startsOn: string | null
  endsOn: string | null
  position: number
  clicks?: number // admin only
  createdAt: string
}

// A text in the visitor's language, or the first language that has it (Romanian first).
export function promoText(p: Pick<Promotion, 'texts'>, lang: Lang, field: 'title' | 'text' | 'button') {
  return p.texts[lang]?.[field] || p.texts.ro?.[field] || p.texts.en?.[field] || p.texts.ru?.[field] || ''
}

// Banners to show now in one place of the site.
export function usePromotions(placement: Placement) {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  useEffect(() => {
    api<{ promotions: Promotion[] }>(`/promotions?placement=${placement}`).then(r => setPromotions(r.promotions)).catch(() => {})
  }, [placement])
  return promotions
}

// Count a click without delaying the navigation (keepalive survives leaving the page).
export function trackClick(id: number) {
  fetch(`/api/promotions/${id}/click`, { method: 'POST', keepalive: true, credentials: 'same-origin' }).catch(() => {})
}

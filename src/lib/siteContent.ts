import { useEffect, useState, useSyncExternalStore } from 'react'
import { en, type Dict } from '../i18n/en'
import { ro } from '../i18n/ro'
import { ru } from '../i18n/ru'
import type { Lang } from '../i18n/I18nContext'
import { api } from './api'

// Texts of the About and Contact pages, editable by the admin. What the admin never filled
// in (or left empty) falls back to the built-in texts in src/i18n.
export type AboutText = {
  eyebrow: string
  titleLine1: string
  titleLine2: string
  intro: string
  imageAlt: string
  valuesEyebrow: string
  valuesTitle: string
  values: { title: string; desc: string }[]
  ctaTitle: string
  ctaText: string
  ctaButton: string
}
export type ContactText = { eyebrow: string; title: string; helpTitle: string; helpText: string; hours: string; address: string }

export type AboutContent = { imageUrl: string } & Record<Lang, AboutText>
export type ContactContent = { email: string; phone: string } & Record<Lang, ContactText>
type Contents = { about: AboutContent; contact: ContactContent }
export type ContentKey = keyof Contents

const DICTS: Record<Lang, Dict> = { ro, en, ru }

const aboutText = (t: Dict): AboutText => ({
  eyebrow: t.about.eyebrow,
  titleLine1: t.about.title[0],
  titleLine2: t.about.title[1],
  intro: t.about.intro,
  imageAlt: t.about.imageAlt,
  valuesEyebrow: t.about.valuesEyebrow,
  valuesTitle: t.about.valuesTitle,
  values: t.about.values,
  ctaTitle: t.about.ctaTitle,
  ctaText: t.about.ctaText,
  ctaButton: t.about.ctaButton,
})

const contactText = (t: Dict): ContactText => ({
  eyebrow: t.contact.eyebrow,
  title: t.contact.title,
  helpTitle: t.contact.helpTitle,
  helpText: t.contact.helpText,
  hours: t.contact.hours,
  address: t.contact.address,
})

// The built-in content, used until the admin saves something.
export const DEFAULTS: Contents = {
  about: { imageUrl: 'https://images.unsplash.com/photo-1493238792000-8113da705763?w=800&h=600&fit=crop&auto=format', ro: aboutText(ro), en: aboutText(en), ru: aboutText(ru) },
  contact: { email: 'hello@rentmotors.com', phone: '+1 (415) 555 0192', ro: contactText(ro), en: contactText(en), ru: contactText(ru) },
}

// Saved values win, except empty strings and empty lists, which keep the default.
function merge<T>(saved: unknown, fallback: T): T {
  if (Array.isArray(fallback)) return (Array.isArray(saved) && saved.length ? saved : fallback) as T
  if (fallback && typeof fallback === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fallback)) out[k] = merge((saved as Record<string, unknown> | undefined)?.[k], v)
    return out as T
  }
  return (typeof saved === 'string' && saved.trim() ? saved : fallback) as T
}

type Entry = { content: unknown; status: 'loading' | 'ready' }
const cache: Partial<Record<ContentKey, Entry>> = {}
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(l => l())

async function load(key: ContentKey) {
  try {
    const res = await api<{ content: unknown }>(`/content/${key}`)
    cache[key] = { content: res.content, status: 'ready' }
  } catch {
    cache[key] = { content: null, status: 'ready' } // show the built-in texts
  }
  notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// The page's content (saved texts merged over the defaults). `ready` turns true when the
// server answers, or after 1.5 s: pages wait that long rather than flash the default texts,
// but don't stay blank while the free server wakes up.
export function useSiteContent<K extends ContentKey>(key: K): { content: Contents[K]; ready: boolean; loaded: boolean } {
  const entry = useSyncExternalStore(subscribe, () => cache[key])
  const [waited, setWaited] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 1500)
    if (!cache[key]) {
      cache[key] = { content: null, status: 'loading' }
      load(key)
    }
    return () => clearTimeout(timer)
  }, [key])
  const loaded = entry?.status === 'ready'
  return { content: merge(entry?.content, DEFAULTS[key]), ready: loaded || waited, loaded }
}

export async function saveSiteContent<K extends ContentKey>(key: K, content: Contents[K]) {
  const res = await api<{ content: unknown }>(`/admin/content/${key}`, { method: 'PUT', body: content })
  cache[key] = { content: res.content, status: 'ready' }
  notify()
}

export async function resetSiteContent(key: ContentKey) {
  await api(`/admin/content/${key}`, { method: 'DELETE' })
  cache[key] = { content: null, status: 'ready' }
  notify()
}

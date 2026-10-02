import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { en, type Dict } from './en'
import { ro } from './ro'
import { ru } from './ru'

export type Lang = 'ro' | 'en' | 'ru'

// Order shown in the language switcher.
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'ro', label: 'Română' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
]

const DICTS: Record<Lang, Dict> = { ro, en, ru }
const LANG_KEY = 'rentmotors.lang'

// A saved choice wins; otherwise follow the browser, falling back to English.
function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved && saved in DICTS) return saved as Lang
  } catch {
    // Storage unavailable (private mode): fall through to the browser language.
  }
  const browser = navigator.language.slice(0, 2)
  return browser === 'ro' || browser === 'ru' ? browser : 'en'
}

type I18nContextValue = { lang: Lang; setLang: (lang: Lang) => void; t: Dict }

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  function setLang(next: Lang) {
    setLangState(next)
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      // The choice just won't persist.
    }
  }

  return <I18nContext.Provider value={{ lang, setLang, t: DICTS[lang] }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}


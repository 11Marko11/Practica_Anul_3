import { useEffect, useRef, useState } from 'react'
import { LANGS, useI18n } from '../i18n/I18nContext'

// Language choice for the dark nav bar: one small button with the current language that opens
// the list of languages. `large` is the phone-menu version, with all three side by side.
export function LanguageSwitcher({ large = false }: { large?: boolean }) {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (large) {
    return (
      <div role="group" aria-label={t.language} style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 980, padding: 3 }}>
        {LANGS.map(l => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            aria-pressed={lang === l.code}
            lang={l.code}
            style={{
              flex: 1, fontSize: 14, fontWeight: 500, padding: '10px 0', borderRadius: 980, border: 'none', cursor: 'pointer',
              background: lang === l.code ? '#f5f5f7' : 'transparent', color: lang === l.code ? '#1c1c1e' : 'rgba(255,255,255,0.7)',
            }}
          >
            {l.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.language}
        title={t.language}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600, letterSpacing: '0.02em', padding: '11px 14px', borderRadius: 980, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: '#f5f5f7' }}
      >
        {lang.toUpperCase()}
        <svg width="11" height="11" viewBox="0 0 10 10" aria-hidden style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" aria-label={t.language} style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', minWidth: 150, margin: 0, padding: 6, listStyle: 'none', background: '#2a2a2d', borderRadius: 14, border: '1px solid #3a3a3d', boxShadow: '0 12px 40px rgba(0,0,0,0.35)', zIndex: 10 }}>
          {LANGS.map(l => (
            <li key={l.code}>
              <button
                role="option"
                aria-selected={lang === l.code}
                lang={l.code}
                onClick={() => { setLang(l.code); setOpen(false) }}
                onMouseEnter={e => (e.currentTarget.style.background = '#3a3a3d')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 14, color: '#f5f5f7', background: 'none', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', textAlign: 'left' }}
              >
                <span><strong style={{ fontWeight: 600, marginRight: 8 }}>{l.code.toUpperCase()}</strong>{l.label}</span>
                {lang === l.code && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { LANGS, useI18n } from '../i18n/I18nContext'

// RO / EN / RU segmented control for the dark nav bar. `large` is the phone-menu version.
export function LanguageSwitcher({ large = false }: { large?: boolean }) {
  const { lang, setLang, t } = useI18n()
  return (
    <div role="group" aria-label={t.language} style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 980, padding: 3 }}>
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          title={l.label}
          lang={l.code}
          style={{
            flex: large ? 1 : undefined,
            fontSize: large ? 14 : 12, fontWeight: 500, letterSpacing: '0.02em',
            padding: large ? '10px 0' : '5px 10px', borderRadius: 980, border: 'none', cursor: 'pointer',
            background: lang === l.code ? '#f5f5f7' : 'transparent',
            color: lang === l.code ? '#1c1c1e' : 'rgba(255,255,255,0.7)',
            transition: 'all 0.15s',
          }}
        >
          {large ? l.label : l.code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

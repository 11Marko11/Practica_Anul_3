import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { COUNTRIES, examplePhone, flag, groupDigits, numberLength, splitPhone, type Country } from '../lib/phone'

// A phone number: the country (its code) from a list, then only the digits of the number.
// Gives the parent "+37369123456", or "" while the number is empty.
export function PhoneInput({ value, onChange, required, id, style, dark }: {
  value: string
  onChange: (phone: string) => void
  required?: boolean
  id?: string
  style?: React.CSSProperties
  dark?: boolean // on the dark booking panel
}) {
  const { lang, t } = useI18n()
  const p = t.phoneInput
  const [country, setCountry] = useState<Country>(() => splitPhone(value).country)
  const number = splitPhone(value).number
  const input = useRef<HTMLInputElement>(null)
  const { min, max } = numberLength(country.code)

  // A number filled in from elsewhere (the profile) brings its country.
  useEffect(() => {
    if (value) setCountry(c => (splitPhone(value).country.code === c.code ? c : splitPhone(value).country))
  }, [value])

  // The browser's own check says what is wrong before the form is sent.
  useEffect(() => {
    const short = number.length > 0 && number.length < min
    input.current?.setCustomValidity(short ? (country.code === '373' ? p.moldova : p.tooShort(min)) : '')
  }, [number, min, country.code, p])

  const names = new Intl.DisplayNames([lang], { type: 'region' })
  const emit = (c: Country, digits: string) => onChange(digits ? `+${c.code}${digits}` : '')

  const box: React.CSSProperties = { ...style, display: 'flex', alignItems: 'center', gap: 0, padding: 0, overflow: 'hidden' }
  const inner: React.CSSProperties = { border: 'none', outline: 'none', background: 'transparent', color: 'inherit', font: 'inherit', fontSize: 'inherit' }

  return (
    <div className="phone-input" style={box}>
      {/* The flag and an arrow show; the list itself (invisible, on top) opens with full names. */}
      <label style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4, alignSelf: 'stretch', padding: '0 10px 0 12px', borderRight: `1px solid ${dark ? '#3a3a3c' : '#e5e5ea'}`, cursor: 'pointer', flexShrink: 0 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden="true">{flag(country.iso)}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <select
          aria-label={`${p.country}: ${names.of(country.iso)}`}
          value={country.iso}
          onChange={e => {
            const next = COUNTRIES.find(c => c.iso === e.target.value) ?? COUNTRIES[0]
            setCountry(next)
            emit(next, number.slice(0, numberLength(next.code).max))
            input.current?.focus()
          }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', fontSize: 16 }}
        >
          {COUNTRIES.map(c => (
            <option key={c.iso} value={c.iso}>{flag(c.iso)} {names.of(c.iso)} +{c.code}</option>
          ))}
        </select>
      </label>
      <span style={{ padding: '0 0 0 10px', color: dark ? '#a1a1a6' : '#6e6e73', whiteSpace: 'nowrap' }}>+{country.code}</span>
      <input
        ref={input}
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        required={required}
        value={groupDigits(country.code, number)}
        onChange={e => {
          let digits = e.target.value.replace(/\D/g, '')
          if (country.code !== '39') digits = digits.replace(/^0+/, '') // "069…": the 0 is not dialled after +373
          emit(country, digits.slice(0, max))
        }}
        placeholder={examplePhone(country)}
        style={{ ...inner, flex: 1, minWidth: 0, padding: '12px 14px 12px 8px' }}
      />
    </div>
  )
}

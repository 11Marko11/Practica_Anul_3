import { useId, useState } from 'react'

// Letters without diacritics and in lower case, so "chis" finds "Chișinău".
export const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// A text field that, while typing, offers the names that start with what was typed.
export function Suggest({ value, onChange, options, placeholder, style }: {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
  style?: React.CSSProperties
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const typed = plain(value)
  const matches = typed ? options.filter(o => plain(o).startsWith(typed) && plain(o) !== typed).slice(0, 8) : []
  const shown = open && matches.length > 0

  function pick(option: string) {
    onChange(option)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', flex: '1 1 160px', maxWidth: '100%' }}>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        role="combobox"
        aria-expanded={shown}
        aria-controls={id}
        aria-autocomplete="list"
        aria-activedescendant={shown ? `${id}-${active}` : undefined}
        autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); setActive(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={e => {
          if (!shown) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % matches.length) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a - 1 + matches.length) % matches.length) }
          else if (e.key === 'Enter') { e.preventDefault(); pick(matches[active]) }
          else if (e.key === 'Escape') setOpen(false)
        }}
        style={{ ...style, width: '100%', boxSizing: 'border-box' }}
      />
      {shown && (
        <ul id={id} role="listbox" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20, listStyle: 'none', margin: 0, padding: 6, background: '#fff', border: '1px solid #e5e5ea', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {matches.map((o, i) => (
            <li
              key={o}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); pick(o) }}
              onMouseEnter={() => setActive(i)}
              style={{ padding: '8px 12px', borderRadius: 10, fontSize: 14, color: '#1d1d1f', cursor: 'pointer', background: i === active ? '#f5f5f7' : 'transparent' }}
            >
              <strong style={{ fontWeight: 600 }}>{o.slice(0, value.trim().length)}</strong>{o.slice(value.trim().length)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

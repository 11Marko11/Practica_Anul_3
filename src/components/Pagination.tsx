import { useI18n } from '../i18n/I18nContext'

// Page numbers to show: always the first and last page and the ones around the current one,
// with gaps (null) in between, e.g. 1 … 4 5 6 … 10.
function pageList(page: number, pages: number): (number | null)[] {
  const out: (number | null)[] = []
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) out.push(n)
    else if (out[out.length - 1] !== null) out.push(null)
  }
  return out
}

export function Pagination({ page, pages, total, pageSize, onChange }: { page: number; pages: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  const { t } = useI18n()
  if (pages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <nav aria-label={t.pagination.label} className="pagination">
      <button onClick={() => onChange(page - 1)} disabled={page === 1} aria-label={t.pagination.previous} style={step(page === 1)}>‹<span className="pagination-word"> {t.pagination.previous}</span></button>
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        {pageList(page, pages).map((n, i) =>
          n === null ? (
            <span key={`gap${i}`} style={{ minWidth: 18, textAlign: 'center', color: '#86868b', alignSelf: 'center' }}>…</span>
          ) : (
            <button
              key={n}
              onClick={() => onChange(n)}
              aria-label={t.pagination.page(n)}
              aria-current={n === page ? 'page' : undefined}
              style={{ ...number, background: n === page ? '#1d1d1f' : 'transparent', color: n === page ? '#fff' : '#1d1d1f', fontWeight: n === page ? 600 : 400 }}
            >
              {n}
            </button>
          ),
        )}
      </div>
      <button onClick={() => onChange(page + 1)} disabled={page === pages} aria-label={t.pagination.next} style={step(page === pages)}><span className="pagination-word">{t.pagination.next} </span>›</button>
      <p style={{ flexBasis: '100%', textAlign: 'center', fontSize: 13, color: '#86868b', margin: '4px 0 0' }}>{t.pagination.showing(from, to, total)}</p>
    </nav>
  )
}

const number: React.CSSProperties = { minWidth: 34, height: 38, padding: '0 6px', borderRadius: 980, border: 'none', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }
const step = (disabled: boolean): React.CSSProperties => ({
  height: 38, padding: '0 14px', borderRadius: 980, border: '1px solid #d2d2d7', background: '#fff', fontSize: 14, fontFamily: 'inherit',
  color: disabled ? '#c7c7cc' : '#1d1d1f', cursor: disabled ? 'default' : 'pointer',
})

// Reads the page number from the URL (?page=3) and keeps it within 1…pages.
export function pageFrom(params: URLSearchParams, pages: number) {
  const n = Number(params.get('page'))
  return Number.isInteger(n) && n >= 1 ? Math.min(n, Math.max(1, pages)) : 1
}

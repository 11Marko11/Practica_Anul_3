import type { ReactNode } from 'react'

export type LegalSection = { title: string; body: ReactNode }

export function LegalPage({ eyebrow, title, updated, intro, sections }: {
  eyebrow: string
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}) {
  return (
    <div style={{ paddingTop: 52 }}>
      <section style={{ padding: '56px 24px 48px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 8px' }}>{eyebrow}</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: '0 0 16px', lineHeight: 1.05 }}>
            {title}
          </h1>
          <p style={{ fontSize: 14, color: '#86868b', margin: 0 }}>Last updated: {updated}</p>
        </div>
      </section>

      <article style={{ maxWidth: 808, margin: '0 auto', padding: '48px 24px 96px' }}>
        <p style={{ fontSize: 17, color: '#1d1d1f', fontWeight: 300, lineHeight: 1.7, margin: '0 0 40px' }}>{intro}</p>
        {sections.map((section, i) => (
          <section key={section.title} style={{ padding: '28px 0', borderTop: '1px solid #f0f0f0' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: '0 0 12px' }}>
              <span style={{ color: '#86868b', fontWeight: 500, marginRight: 10 }}>{String(i + 1).padStart(2, '0')}</span>
              {section.title}
            </h2>
            <div className="legal-body" style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.7, fontWeight: 300 }}>
              {section.body}
            </div>
          </section>
        ))}
      </article>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Avatar } from '../components/Avatar'
import { Stars } from '../components/CarReviews'
import type { Car } from '../data/cars'
import { useI18n } from '../i18n/I18nContext'
import { api } from '../lib/api'
import { formatDate } from '../lib/rental'
import { useRentalDates } from '../lib/useRentalDates'
import { CarCard } from './Marketplace'

type HostProfileData = {
  host: { id: number; name: string; avatarUrl: string | null; since: string; rating: number | null; reviews: number; trips: number; cars: number }
  cars: Car[]
  reviews: { id: string; name: string; avatarUrl: string | null; rating: number; text: string; date: string; car: { slug: string | null; name: string } }[]
}

const REVIEWS_STEP = 6

// /hosts/:id: public profile of a host, with their cars on the site and the reviews of their cars.
export function HostProfile() {
  const { id } = useParams()
  const { lang, t } = useI18n()
  const h = t.hostPage
  const { days, query } = useRentalDates()
  const [data, setData] = useState<HostProfileData | null | undefined>(undefined)
  const [shown, setShown] = useState(REVIEWS_STEP)

  useEffect(() => {
    setData(undefined)
    setShown(REVIEWS_STEP)
    api<HostProfileData>(`/hosts/${id}`).then(setData).catch(() => setData(null))
  }, [id])

  if (data === undefined) return <div style={{ minHeight: '80vh' }} />
  if (data === null) {
    return (
      <div style={{ paddingTop: 52, textAlign: 'center', padding: '140px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1d1d1f', margin: '0 0 20px' }}>{h.notFound}</h1>
        <Link to="/marketplace" className="btn-action btn-action--neutral btn-back">{h.back}</Link>
      </div>
    )
  }

  const { host, cars, reviews } = data
  const sinceDate = formatDate(host.since, lang)

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '48px 24px 40px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <Avatar name={host.name} url={host.avatarUrl} size={80} background="#3a3a3d" color="#f5f5f7" />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 6px' }}>{h.eyebrow}</p>
              <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{host.name}</h1>
              <p style={{ fontSize: 14, color: '#a1a1a6', margin: '8px 0 0' }}>
                <span style={{ color: '#30d158' }}>{h.verified}</span> · {h.since(sinceDate)}
              </p>
            </div>
          </div>

          <div className="host-stats">
            <Stat label={h.rating} value={host.rating !== null ? `★ ${host.rating.toFixed(1)}` : h.noRating} />
            <Stat label={h.reviews} value={String(host.reviews)} />
            <Stat label={h.trips} value={String(host.trips)} />
            <Stat label={h.cars} value={String(host.cars)} />
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 96px' }}>
        <h2 style={sectionTitle}>{h.carsTitle(host.name)}</h2>
        {cars.length === 0 ? (
          <p style={{ fontSize: 15, color: '#6e6e73' }}>{h.noCars}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 20 }}>
            {cars.map(car => <CarCard key={car.id} car={car} days={days} query={query} />)}
          </div>
        )}

        <h2 style={{ ...sectionTitle, marginTop: 64 }}>{h.reviewsTitle}</h2>
        {reviews.length === 0 ? (
          <p style={{ fontSize: 15, color: '#6e6e73' }}>{h.noReviews}</p>
        ) : (
          <>
            <div className="host-reviews">
              {reviews.slice(0, shown).map(r => (
                <article key={r.id} style={{ padding: '20px 22px', borderRadius: 18, background: '#f5f5f7', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar name={r.name} url={r.avatarUrl} size={36} background="#1d1d1f" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{r.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#86868b' }}>
                        <Stars rating={r.rating} size={13} /> {formatDate(r.date, lang)}
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 15, color: '#1d1d1f', lineHeight: 1.6, margin: '12px 0 8px', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{r.text}</p>
                  <div style={{ fontSize: 13, color: '#6e6e73' }}>
                    {r.car.slug ? <Link to={`/cars/${r.car.slug}`} style={{ color: '#0071e3', textDecoration: 'none' }}>{h.about(r.car.name)}</Link> : h.about(r.car.name)}
                  </div>
                </article>
              ))}
            </div>
            {shown < reviews.length && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button onClick={() => setShown(n => n + REVIEWS_STEP)} className="btn-action btn-action--neutral btn-back">{h.showMore}</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '16px 18px', borderRadius: 16, background: '#2c2c2e' }}>
      <div style={{ fontSize: 13, color: '#a1a1a6' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f7', marginTop: 4 }}>{value}</div>
    </div>
  )
}

const sectionTitle: React.CSSProperties = { fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '0 0 24px' }

import { useEffect, useRef, useState } from 'react'
import type { Car } from '../data/cars'
import { DELIVERY, quoteDelivery, searchAddress, type Handover, type Place } from '../lib/delivery'
import { fmt } from '../lib/rental'

// "Pick up" / "Delivery" choice in the booking card. For delivery the user searches
// for an address (or uses their current location) and gets a distance-based fee.
export function DeliveryPicker({ car, value, onChange }: { car: Car; value: Handover; onChange: (h: Handover) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  const quote = value.mode === 'delivery' ? value.quote : null

  function choose(place: Place) {
    setResults([])
    setStatus('idle')
    onChange({ mode: 'delivery', quote: quoteDelivery(car.pickup, place) })
  }

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim().length < 3) return
    abort.current?.abort()
    abort.current = new AbortController()
    setStatus('loading')
    setResults([])
    try {
      const places = await searchAddress(query.trim(), abort.current.signal)
      setResults(places)
      setStatus(places.length ? 'idle' : 'empty')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setStatus('error')
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setStatus('error')
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      pos => choose({ label: 'Your current location', lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setStatus('error'),
      { timeout: 10000 },
    )
  }

  const tab = (active: boolean) => ({
    flex: 1, fontSize: 14, fontWeight: 500, padding: '9px 0', borderRadius: 980, border: 'none', cursor: 'pointer',
    background: active ? '#f5f5f7' : 'transparent', color: active ? '#1c1c1e' : '#a1a1a6', transition: 'all 0.15s',
  })

  return (
    <div style={{ marginTop: 20 }}>
      <div role="tablist" aria-label="How do you want to get the car?" style={{ display: 'flex', background: '#2a2a2d', borderRadius: 980, padding: 4 }}>
        <button role="tab" aria-selected={value.mode === 'pickup'} style={tab(value.mode === 'pickup')} onClick={() => onChange({ mode: 'pickup' })}>
          Pick up
        </button>
        <button role="tab" aria-selected={value.mode === 'delivery'} style={tab(value.mode === 'delivery')} onClick={() => onChange({ mode: 'delivery', quote })}>
          Delivery
        </button>
      </div>

      {value.mode === 'pickup' ? (
        <p style={{ fontSize: 13, color: '#a1a1a6', margin: '12px 0 0', lineHeight: 1.5 }}>
          Collect the car from the host at <span style={{ color: '#f5f5f7' }}>{car.pickup.address}</span>. Free.
        </p>
      ) : quote ? (
        <div style={{ marginTop: 12, background: '#2a2a2d', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, color: '#a1a1a6' }}>Deliver to</div>
          <div style={{ fontSize: 14, color: '#f5f5f7', margin: '2px 0 6px', lineHeight: 1.4 }}>{quote.place.label}</div>
          {quote.ok ? (
            <div style={{ fontSize: 13, color: '#a1a1a6' }}>≈ {quote.km} km from the car · {fmt(quote.fee)} delivery</div>
          ) : (
            <div role="alert" style={{ fontSize: 13, color: '#ff6961' }}>
              ≈ {quote.km} km away. Delivery is available up to {DELIVERY.maxKm} km from {car.location.split(',')[0]}.
            </div>
          )}
          <button onClick={() => onChange({ mode: 'delivery', quote: null })} style={{ marginTop: 8, fontSize: 13, color: '#6cb4ff', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            Change address
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <form onSubmit={search} style={{ display: 'flex', gap: 8 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Street and city"
              aria-label="Delivery address"
              style={{ flex: 1, minWidth: 0, fontSize: 15, padding: '10px 14px', border: '1px solid #3a3a3d', borderRadius: 12, color: '#f5f5f7', background: '#2a2a2d', fontFamily: 'inherit', outline: 'none' }}
            />
            <button type="submit" disabled={status === 'loading'} style={{ flexShrink: 0, fontSize: 14, fontWeight: 500, padding: '0 16px', borderRadius: 12, border: 'none', background: '#3a3a3d', color: '#f5f5f7', cursor: 'pointer' }}>
              {status === 'loading' ? '…' : 'Find'}
            </button>
          </form>

          {results.length > 0 && (
            <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 4, background: '#2a2a2d', borderRadius: 12 }}>
              {results.map(r => (
                <li key={`${r.lat},${r.lng}`}>
                  <button
                    onClick={() => choose(r)}
                    style={{ width: '100%', textAlign: 'left', fontSize: 13, lineHeight: 1.4, color: '#f5f5f7', background: 'none', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#3a3a3d')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {status === 'empty' && <p style={{ fontSize: 13, color: '#ff6961', margin: '8px 0 0' }}>No address found. Try adding the city.</p>}
          {status === 'error' && <p style={{ fontSize: 13, color: '#ff6961', margin: '8px 0 0' }}>Couldn't look up that address. Please try again.</p>}

          <button onClick={useMyLocation} style={{ marginTop: 10, fontSize: 13, color: '#6cb4ff', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            Use my current location
          </button>
          <p style={{ fontSize: 12, color: '#86868b', margin: '8px 0 0', lineHeight: 1.5 }}>
            {fmt(DELIVERY.baseFee)} + ${DELIVERY.perKm.toFixed(2)}/km, up to {DELIVERY.maxKm} km. We collect the car from the same address at the end.
          </p>
        </div>
      )}
    </div>
  )
}

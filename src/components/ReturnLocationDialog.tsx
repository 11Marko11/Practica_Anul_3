import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { addressAt, searchAddress, type Place } from '../lib/delivery'
import type { ReturnPlace } from '../lib/bookings'

// Inside Moldova, like the server's check.
const inMoldova = (lat: number, lng: number) => lat >= 45.4 && lat <= 48.6 && lng >= 26.5 && lng <= 30.3

// "End the trip": the customer or the car's host must say where the car was left (an address
// found on the map, or their current location) before the trip can end. With `fixedAddress` the
// host wants the car back where it was taken: there is nothing to choose, only to confirm.
export function ReturnLocationDialog({ onClose, onSubmit, fixedAddress }: {
  onClose: () => void
  onSubmit: (place?: ReturnPlace) => Promise<void>
  fixedAddress?: string
}) {
  const { lang, t } = useI18n()
  const r = t.returnPlace
  const dialog = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [place, setPlace] = useState<ReturnPlace | null>(null)
  const [status, setStatus] = useState<'idle' | 'searching' | 'locating' | 'saving'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  async function find() {
    if (query.trim().length < 3) return
    setStatus('searching')
    setError('')
    setResults([])
    try {
      const found = await searchAddress(query.trim(), lang)
      setResults(found)
      if (!found.length) setError(r.notFound)
    } catch {
      setError(r.notFound)
    }
    setStatus('idle')
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setError(r.locationError)
    setStatus('locating')
    setError('')
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        if (!inMoldova(lat, lng)) {
          setError(r.outside)
          return setStatus('idle')
        }
        const label = await addressAt(lat, lng, lang).catch(() => null)
        setPlace({ address: label ?? r.myLocationLabel(lat.toFixed(5), lng.toFixed(5)), lat, lng })
        setResults([])
        setStatus('idle')
      },
      () => {
        setError(r.locationError)
        setStatus('idle')
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!place && !fixedAddress) return setError(r.required)
    setStatus('saving')
    setError('')
    try {
      await onSubmit(fixedAddress ? undefined : place ?? undefined)
    } catch {
      setError(r.error)
      setStatus('idle')
    }
  }

  const bbox = place && [place.lng - 0.006, place.lat - 0.003, place.lng + 0.006, place.lat + 0.003].join(',')

  // margin: auto centres the dialog (the site's CSS reset sets every margin to 0).
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={e => e.target === dialog.current && dialog.current?.close()}
      style={{ margin: 'auto', width: 'min(540px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', border: 'none', borderRadius: 20, padding: 0, boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}
    >
      <form onSubmit={submit} style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: '0 0 6px' }}>{r.title}</h2>
          <p style={{ fontSize: 14, color: '#424245', margin: 0, lineHeight: 1.5 }}>{fixedAddress ? r.fixedIntro(fixedAddress) : r.intro}</p>
        </div>

        {fixedAddress ? null : place ? (
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e5ea' }}>
            <iframe
              title={place.address}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${place.lat},${place.lng}`}
              style={{ display: 'block', width: '100%', height: 180, border: 0 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: '#1d1d1f' }}>
                <span style={{ color: '#6e6e73' }}>{r.chosen}:</span> <strong style={{ fontWeight: 600 }}>{place.address}</strong>
              </div>
              <button type="button" onClick={() => setPlace(null)} className="btn-action btn-action--neutral">{r.change}</button>
            </div>
          </div>
        ) : (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6e6e73' }}>
              {r.search}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); find() } }}
                  placeholder={r.placeholder}
                  autoFocus
                  style={{ flex: 1, minWidth: 0, fontSize: 15, padding: '11px 14px', border: '1px solid #d2d2d7', borderRadius: 12, fontFamily: 'inherit', outline: 'none' }}
                />
                <button type="button" onClick={find} disabled={status !== 'idle'} className="btn-action btn-action--primary" style={{ height: 'auto' }}>
                  {status === 'searching' ? '…' : r.find}
                </button>
              </div>
            </label>
            {results.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 4, border: '1px solid #d2d2d7', borderRadius: 12 }}>
                {results.map(p => (
                  <li key={`${p.lat},${p.lng}`}>
                    <button
                      type="button"
                      onClick={() => { setPlace({ address: p.label, lat: p.lat, lng: p.lng }); setResults([]); setError('') }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f7')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      style={{ width: '100%', textAlign: 'left', fontSize: 14, color: '#1d1d1f', background: 'none', border: 'none', borderRadius: 8, padding: '9px 10px', cursor: 'pointer' }}
                    >
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <button type="button" onClick={useMyLocation} disabled={status !== 'idle'} className="btn-action btn-action--neutral" style={{ gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden><circle cx="7" cy="7" r="2.2" fill="currentColor" /><circle cx="7" cy="7" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
                {status === 'locating' ? r.locating : r.myLocation}
              </button>
            </div>
          </>
        )}

        {error && <p role="alert" style={{ fontSize: 14, color: '#d70015', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => dialog.current?.close()} className="btn-action btn-action--neutral">{r.cancel}</button>
          <button type="submit" disabled={(!place && !fixedAddress) || status !== 'idle'} className="btn-action btn-action--primary" style={{ opacity: place || fixedAddress ? 1 : 0.4 }}>
            {status === 'saving' ? '…' : r.submit}
          </button>
        </div>
      </form>
    </dialog>
  )
}

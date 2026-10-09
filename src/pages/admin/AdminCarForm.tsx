import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CITIES, photoUrl, type Car } from '../../data/cars'
import { saveCar, useAllCars, useFreshCatalog } from '../../lib/carStore'
import { ApiError } from '../../lib/api'
import { searchAddress, type Place } from '../../lib/delivery'
import { useI18n } from '../../i18n/I18nContext'
import { AdminGuard } from './AdminGuard'

// /admin/cars/new adds a car; /admin/cars/:slug edits one.
export function AdminCarForm() {
  const { slug } = useParams()
  return (
    <AdminGuard>
      <FreshCatalog>
        <AdminCarFormContent key={slug ?? 'new'} slug={slug} />
      </FreshCatalog>
    </AdminGuard>
  )
}

// The form takes its starting values from the catalogue, so wait for the admin's full list.
function FreshCatalog({ children }: { children: ReactNode }) {
  return useFreshCatalog() ? <>{children}</> : <div style={{ minHeight: '80vh' }} />
}

type Pickup = { address: string; lat: number; lng: number }

// Number fields are kept as text while typing and checked on save.
type FormState = {
  brand: string
  model: string
  year: string
  price: string
  fuel: Car['fuel']
  seats: string
  horsepower: string
  acceleration: string
  topSpeed: string
  transmission: string
  drive: Car['drive']
  status: 'ACTIVE' | 'HIDDEN'
  range: string
  hostName: string
  city: string
  address: string
  pickup: Pickup | null
  photos: string
  descriptionEn: string
  descriptionRo: string
  descriptionRu: string
  features: string
}

const EMPTY: FormState = {
  brand: '', model: '', year: String(new Date().getFullYear()), price: '', fuel: 'Petrol', seats: '4',
  horsepower: '', acceleration: '', topSpeed: '', transmission: '', drive: 'AWD', status: 'ACTIVE', range: '', hostName: '',
  city: CITIES[0], address: '', pickup: null, photos: '', descriptionEn: '', descriptionRo: '', descriptionRu: '', features: '',
}

function fromCar(car: Car): FormState {
  return {
    brand: car.brand, model: car.model, year: String(car.year), price: String(car.pricePerDay), fuel: car.fuel, seats: String(car.seats),
    horsepower: String(car.horsepower), acceleration: String(car.acceleration), topSpeed: String(car.topSpeed), transmission: car.transmission,
    drive: car.drive, status: car.status ?? 'ACTIVE', range: car.range ? String(car.range) : '', hostName: car.host.name,
    city: car.location.split(',')[0], address: car.pickup.address, pickup: car.pickup,
    photos: car.photos.join('\n'), descriptionEn: car.description, descriptionRo: car.translations?.ro?.description ?? '', descriptionRu: car.translations?.ru?.description ?? '',
    features: car.features.join('\n'),
  }
}

const lines = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean)
const positive = (text: string) => Number(text.replace(',', '.')) > 0

function AdminCarFormContent({ slug }: { slug?: string }) {
  const existing = useAllCars().find(c => c.slug === slug)
  const navigate = useNavigate()
  const { t } = useI18n()
  const [form, setForm] = useState<FormState>(() => (existing ? fromCar(existing) : EMPTY))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (slug && !existing) {
    return (
      <div style={{ paddingTop: 52, textAlign: 'center', padding: '140px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1d1d1f', margin: '0 0 20px' }}>{t.car.notFound}</h1>
        <Link to="/admin/cars" style={{ color: '#0071e3', textDecoration: 'none' }}>{t.admin.back}</Link>
      </div>
    )
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const f = form
    const required = [f.brand, f.model, f.transmission, f.hostName, f.descriptionEn].every(v => v.trim())
    const numbers = [f.year, f.price, f.seats, f.horsepower, f.acceleration, f.topSpeed].every(positive)
    if (!required || !numbers) return setError(t.admin.errors.required)
    if (!f.pickup) return setError(t.admin.errors.address)
    if (!lines(f.photos).length) return setError(t.admin.errors.photos)

    const num = (text: string) => Number(text.replace(',', '.'))
    const translations: Car['translations'] = {}
    if (f.descriptionRo.trim()) translations.ro = { description: f.descriptionRo.trim() }
    if (f.descriptionRu.trim()) translations.ru = { description: f.descriptionRu.trim() }

    const input = {
      brand: f.brand.trim(),
      model: f.model.trim(),
      year: Math.round(num(f.year)),
      pricePerDay: Math.round(num(f.price)),
      fuel: f.fuel,
      seats: Math.round(num(f.seats)),
      photos: lines(f.photos),
      horsepower: Math.round(num(f.horsepower)),
      acceleration: num(f.acceleration),
      topSpeed: Math.round(num(f.topSpeed)),
      transmission: f.transmission.trim(),
      drive: f.drive,
      range: f.fuel !== 'Petrol' && positive(f.range) ? Math.round(num(f.range)) : undefined,
      city: f.city,
      pickup: f.pickup,
      hostName: f.hostName.trim(),
      description: f.descriptionEn.trim(),
      features: lines(f.features),
      translations,
      status: f.status,
    }
    setBusy(true)
    try {
      // The server creates the slug (the car's web address); it stays the same when the car is edited.
      await saveCar(input, existing?.id)
      navigate('/admin/cars')
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'validation' ? t.admin.errors.required : t.admin.saveError)
      setBusy(false)
    }
  }

  const cities = CITIES.includes(form.city) ? CITIES : [form.city, ...CITIES]

  return (
    <div style={{ paddingTop: 52 }}>
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px 96px' }}>
        <Link to="/admin/cars" style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none' }}>{t.admin.back}</Link>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '16px 0 8px' }}>
          {existing ? t.admin.editTitle : t.admin.newTitle}
        </h1>
        {existing && <p style={{ fontSize: 15, color: '#6e6e73', margin: 0 }}>{existing.brand} {existing.model}</p>}

        <form onSubmit={submit} noValidate>
          <FormSection title={t.admin.sections.basics}>
            <div className="admin-fields">
              <Field label={t.admin.fields.brand} required><input value={form.brand} onChange={e => set('brand', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.model} required><input value={form.model} onChange={e => set('model', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.year} required><input inputMode="numeric" value={form.year} onChange={e => set('year', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.price} required><input inputMode="numeric" value={form.price} onChange={e => set('price', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.hostName} required><input value={form.hostName} onChange={e => set('hostName', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.status}>
                <select value={form.status} onChange={e => set('status', e.target.value as FormState['status'])} style={inputStyle}>
                  <option value="ACTIVE">{t.admin.statusActive}</option>
                  <option value="HIDDEN">{t.admin.statusHidden}</option>
                </select>
              </Field>
            </div>
          </FormSection>

          <FormSection title={t.admin.sections.specs}>
            <div className="admin-fields">
              <Field label={t.admin.fields.fuel}>
                <select value={form.fuel} onChange={e => set('fuel', e.target.value as Car['fuel'])} style={inputStyle}>
                  {(['Petrol', 'Electric', 'Hybrid'] as const).map(f => <option key={f} value={f}>{t.common.fuel[f]}</option>)}
                </select>
              </Field>
              <Field label={t.admin.fields.drive}>
                <select value={form.drive} onChange={e => set('drive', e.target.value as Car['drive'])} style={inputStyle}>
                  {(['AWD', 'RWD'] as const).map(d => <option key={d} value={d}>{t.car.drive[d]}</option>)}
                </select>
              </Field>
              <Field label={t.admin.fields.seats} required><input inputMode="numeric" value={form.seats} onChange={e => set('seats', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.horsepower} required><input inputMode="numeric" value={form.horsepower} onChange={e => set('horsepower', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.acceleration} required><input inputMode="decimal" value={form.acceleration} onChange={e => set('acceleration', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.topSpeed} required><input inputMode="numeric" value={form.topSpeed} onChange={e => set('topSpeed', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.transmission} required><input value={form.transmission} onChange={e => set('transmission', e.target.value)} style={inputStyle} /></Field>
              {form.fuel !== 'Petrol' && (
                <Field label={t.admin.fields.range} hint={t.admin.hints.range}><input inputMode="numeric" value={form.range} onChange={e => set('range', e.target.value)} style={inputStyle} /></Field>
              )}
            </div>
          </FormSection>

          <FormSection title={t.admin.sections.location}>
            <PickupField
              city={form.city}
              cities={cities}
              address={form.address}
              pickup={form.pickup}
              onCity={city => set('city', city)}
              onAddress={address => setForm(f => ({ ...f, address, pickup: null }))}
              onPick={place => setForm(f => ({ ...f, address: place.label, pickup: { address: place.label, lat: place.lat, lng: place.lng } }))}
            />
          </FormSection>

          <FormSection title={t.admin.sections.photos}>
            <Field label={t.admin.fields.photos} hint={t.admin.hints.photos} required>
              <textarea rows={4} value={form.photos} onChange={e => set('photos', e.target.value)} placeholder="https://…" style={{ ...inputStyle, resize: 'vertical', fontSize: 13, fontFamily: 'ui-monospace, monospace' }} />
            </Field>
            <PhotoPreviews photos={lines(form.photos)} />
          </FormSection>

          <FormSection title={t.admin.sections.description}>
            <p style={hintStyle}>{t.admin.hints.descriptions}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
              <Field label={t.admin.fields.descriptionEn} required><textarea rows={4} value={form.descriptionEn} onChange={e => set('descriptionEn', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
              <Field label={t.admin.fields.descriptionRo}><textarea rows={4} lang="ro" value={form.descriptionRo} onChange={e => set('descriptionRo', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
              <Field label={t.admin.fields.descriptionRu}><textarea rows={4} lang="ru" value={form.descriptionRu} onChange={e => set('descriptionRu', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
            </div>
          </FormSection>

          <FormSection title={t.admin.sections.features}>
            <Field label={t.admin.fields.features} hint={t.admin.hints.features}>
              <textarea rows={6} value={form.features} onChange={e => set('features', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
          </FormSection>

          {error && <p role="alert" style={{ fontSize: 14, color: '#d70015', margin: '24px 0 0' }}>{error}</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 28 }}>
            <button type="submit" disabled={busy} style={{ opacity: busy ? 0.6 : 1, padding: '14px 32px', fontSize: 15, fontWeight: 500, background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 980, cursor: 'pointer' }}>
              {busy ? t.admin.saving : t.admin.save}
            </button>
            <Link to="/admin/cars" style={{ fontSize: 15, color: '#6e6e73', textDecoration: 'none' }}>{t.admin.cancel}</Link>
          </div>
        </form>
      </main>
    </div>
  )
}

// City + street search: the car can only be saved once the address is found on the map.
function PickupField({ city, cities, address, pickup, onCity, onAddress, onPick }: {
  city: string
  cities: string[]
  address: string
  pickup: Pickup | null
  onCity: (city: string) => void
  onAddress: (address: string) => void
  onPick: (place: Place) => void
}) {
  const { lang, t } = useI18n()
  const [results, setResults] = useState<Place[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')
  const abort = useRef<AbortController | null>(null)

  async function find() {
    if (address.trim().length < 3) return
    abort.current?.abort()
    abort.current = new AbortController()
    setStatus('loading')
    setResults([])
    try {
      const query = address.toLowerCase().includes(city.toLowerCase()) ? address : `${address}, ${city}`
      const places = await searchAddress(query.trim(), lang, abort.current.signal)
      setResults(places)
      setStatus(places.length ? 'idle' : 'empty')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setStatus('error')
    }
  }

  const bbox = pickup && [pickup.lng - 0.012, pickup.lat - 0.006, pickup.lng + 0.012, pickup.lat + 0.006].join(',')

  return (
    <div>
      <div className="admin-fields">
        <Field label={t.admin.fields.city}>
          <select value={city} onChange={e => onCity(e.target.value)} style={inputStyle}>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ marginTop: 14 }}>
        <Field label={t.admin.fields.address} hint={t.admin.hints.address} required>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={address}
              onChange={e => onAddress(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); find() } }}
              style={{ ...inputStyle, flex: 1, minWidth: 0 }}
            />
            <button type="button" onClick={find} disabled={status === 'loading'} style={{ flexShrink: 0, fontSize: 14, fontWeight: 500, padding: '0 18px', borderRadius: 12, border: 'none', background: '#1d1d1f', color: '#fff', cursor: 'pointer' }}>
              {status === 'loading' ? '…' : t.admin.find}
            </button>
          </div>
        </Field>
      </div>

      {results.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 4, border: '1px solid #d2d2d7', borderRadius: 12 }}>
          {results.map(r => (
            <li key={`${r.lat},${r.lng}`}>
              <button
                type="button"
                onClick={() => { onPick(r); setResults([]) }}
                style={{ width: '100%', textAlign: 'left', fontSize: 14, color: '#1d1d1f', background: 'none', border: 'none', borderRadius: 8, padding: '9px 10px', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f7')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {status === 'empty' && <p style={{ ...hintStyle, color: '#d70015' }}>{t.admin.addressNotFound}</p>}
      {status === 'error' && <p style={{ ...hintStyle, color: '#d70015' }}>{t.admin.addressError}</p>}

      {pickup && (
        <div style={{ marginTop: 12, borderRadius: 14, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
          <iframe
            title={t.car.mapTitle(pickup.address)}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${pickup.lat},${pickup.lng}`}
            style={{ display: 'block', width: '100%', height: 200, border: 0 }}
          />
          <p style={{ fontSize: 13, color: '#1d1d1f', margin: 0, padding: '10px 14px' }}>✓ {t.admin.addressSet(pickup.address)}</p>
        </div>
      )}
    </div>
  )
}

function PhotoPreviews({ photos }: { photos: string[] }) {
  const { t } = useI18n()
  const [broken, setBroken] = useState<string[]>([])
  if (!photos.length) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginTop: 12 }}>
      {photos.map((photo, i) => (
        <div key={`${i}-${photo}`} style={{ aspectRatio: '16/10', borderRadius: 10, overflow: 'hidden', background: '#f5f5f7', position: 'relative' }}>
          {broken.includes(photo) ? (
            <p style={{ fontSize: 12, color: '#d70015', margin: 0, padding: 10 }}>{t.admin.photoBroken}</p>
          ) : (
            <img
              src={photoUrl(photo, 280, 175)}
              alt=""
              onError={() => setBroken(b => [...b, photo])}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
          {i === 0 && <span style={{ position: 'absolute', left: 6, top: 6, fontSize: 11, fontWeight: 500, background: 'rgba(28,28,30,0.75)', color: '#fff', padding: '2px 8px', borderRadius: 980 }}>1</span>}
        </div>
      ))}
    </div>
  )
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 36, paddingTop: 28, borderTop: '1px solid #f0f0f0' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: '0 0 16px' }}>{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, hint, required = false, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 13, color: '#6e6e73', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#d70015' }}> *</span>}
      </span>
      {children}
      {hint && <span style={{ ...hintStyle, display: 'block' }}>{hint}</span>}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', fontSize: 15, border: '1px solid #d2d2d7', borderRadius: 12,
  background: '#fff', color: '#1d1d1f', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
}

const hintStyle: React.CSSProperties = { fontSize: 12, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }

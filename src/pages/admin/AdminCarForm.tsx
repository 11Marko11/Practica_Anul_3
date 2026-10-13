import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { CITIES, photoUrl, type Car } from '../../data/cars'
import { saveCar, useAllCars, useFreshCatalog, type CarInput } from '../../lib/carStore'
import { api, ApiError } from '../../lib/api'
import { searchAddress, type Place } from '../../lib/delivery'
import { useAdminHosts } from '../../lib/hosts'
import { uploadPhoto } from '../../lib/photos'
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

function AdminCarFormContent({ slug }: { slug?: string }) {
  const existing = useAllCars().find(c => c.slug === slug)
  const location = useLocation()
  const { t } = useI18n()
  // Back to the car list as it was left (sorting, filters), when we came from it.
  const listSearch = (location.state as { listSearch?: string } | null)?.listSearch
  const listUrl = `/admin/cars${listSearch ? `?${listSearch}` : ''}`
  // "Add a car for this host" on the Hosts page opens the form with the host already chosen (?host=12).
  const [search] = useSearchParams()

  if (slug && !existing) return <NotFound backUrl={listUrl} backLabel={t.admin.back} />
  return (
    <CarForm
      mode="admin"
      existing={existing}
      initialHostId={search.get('host') ?? ''}
      backUrl={listUrl}
      backLabel={t.admin.back}
      title={existing ? t.admin.editTitle : t.admin.newTitle}
      save={input => saveCar(input, existing?.id)}
    />
  )
}

// /host/cars/new and /host/cars/:id: a host adds or edits one of their own cars.
export function HostCarForm() {
  const { id } = useParams()
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div style={{ minHeight: '70vh' }} />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!user.host) return <Navigate to="/host" replace />
  return <HostCarFormContent key={id ?? 'new'} id={id} />
}

function HostCarFormContent({ id }: { id?: string }) {
  const { t } = useI18n()
  const h = t.hostPortal
  const [existing, setExisting] = useState<Car | null | undefined>(id ? undefined : null)
  useEffect(() => {
    if (id) api<{ car: Car }>(`/host/cars/${id}`).then(r => setExisting(r.car)).catch(() => setExisting(null))
  }, [id])

  if (existing === undefined) return <div style={{ minHeight: '80vh' }} />
  if (id && !existing) return <NotFound backUrl="/host" backLabel={h.back} />
  return (
    <CarForm
      mode="host"
      existing={existing ?? undefined}
      backUrl="/host"
      backLabel={h.back}
      title={existing ? h.editTitle : h.newTitle}
      save={input => (existing ? api(`/host/cars/${existing.id}`, { method: 'PUT', body: input }) : api('/host/cars', { body: input }))}
    />
  )
}

function NotFound({ backUrl, backLabel }: { backUrl: string; backLabel: string }) {
  const { t } = useI18n()
  return (
    <div style={{ paddingTop: 52, textAlign: 'center', padding: '140px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1d1d1f', margin: '0 0 20px' }}>{t.car.notFound}</h1>
      <Link to={backUrl} style={{ color: '#0071e3', textDecoration: 'none' }}>{backLabel}</Link>
    </div>
  )
}

type Pickup = { address: string; lat: number; lng: number }
type Status = 'ACTIVE' | 'HIDDEN' | 'REMOVED'

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
  status: Status
  range: string
  hostId: string
  city: string
  address: string
  pickup: Pickup | null
  photos: string[]
  descriptionEn: string
  descriptionRo: string
  descriptionRu: string
  features: string
  defects: string
}

const EMPTY: FormState = {
  brand: '', model: '', year: String(new Date().getFullYear()), price: '', fuel: 'Petrol', seats: '4',
  horsepower: '', acceleration: '', topSpeed: '', transmission: '', drive: 'FWD', status: 'ACTIVE', range: '', hostId: '',
  city: CITIES[0], address: '', pickup: null, photos: [], descriptionEn: '', descriptionRo: '', descriptionRu: '', features: '', defects: '',
}

function fromCar(car: Car): FormState {
  return {
    brand: car.brand, model: car.model, year: String(car.year), price: String(car.pricePerDay), fuel: car.fuel, seats: String(car.seats),
    horsepower: String(car.horsepower), acceleration: String(car.acceleration), topSpeed: String(car.topSpeed), transmission: car.transmission,
    drive: car.drive, status: car.status ?? 'ACTIVE', range: car.range ? String(car.range) : '', hostId: car.host.id ? String(car.host.id) : '',
    city: car.location.split(',')[0], address: car.pickup.address, pickup: car.pickup,
    photos: car.photos, descriptionEn: car.description, descriptionRo: car.translations?.ro?.description ?? '', descriptionRu: car.translations?.ru?.description ?? '',
    features: car.features.join('\n'), defects: (car.defects ?? []).join('\n'),
  }
}

const lines = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean)
const positive = (text: string) => Number(text.replace(',', '.')) > 0

// The car form shared by admins (who also pick the host) and hosts (their own cars).
function CarForm({ mode, existing, initialHostId = '', backUrl, backLabel, title, save }: {
  mode: 'admin' | 'host'
  existing?: Car
  initialHostId?: string
  backUrl: string
  backLabel: string
  title: string
  save: (input: CarInput) => Promise<unknown>
}) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const isAdmin = mode === 'admin'
  const { hosts } = useAdminHosts(isAdmin)
  const [form, setForm] = useState<FormState>(() => (existing ? fromCar(existing) : { ...EMPTY, hostId: initialHostId }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const f = form
    const required = [f.brand, f.model, f.transmission, f.descriptionEn, isAdmin ? f.hostId : 'host'].every(v => v.trim())
    const numbers = [f.year, f.price, f.seats, f.horsepower, f.acceleration, f.topSpeed].every(positive)
    if (!required || !numbers) return setError(t.admin.errors.required)
    if (!f.pickup) return setError(t.admin.errors.address)
    if (!f.photos.length) return setError(t.admin.errors.photos)

    const num = (text: string) => Number(text.replace(',', '.'))
    const translations: Car['translations'] = {}
    if (f.descriptionRo.trim()) translations.ro = { description: f.descriptionRo.trim() }
    if (f.descriptionRu.trim()) translations.ru = { description: f.descriptionRu.trim() }

    const input: CarInput = {
      brand: f.brand.trim(),
      model: f.model.trim(),
      year: Math.round(num(f.year)),
      pricePerDay: Math.round(num(f.price)),
      fuel: f.fuel,
      seats: Math.round(num(f.seats)),
      photos: f.photos,
      horsepower: Math.round(num(f.horsepower)),
      acceleration: num(f.acceleration),
      topSpeed: Math.round(num(f.topSpeed)),
      transmission: f.transmission.trim(),
      drive: f.drive,
      range: (f.fuel === 'Electric' || f.fuel === 'Hybrid') && positive(f.range) ? Math.round(num(f.range)) : undefined,
      city: f.city,
      pickup: f.pickup,
      ...(isAdmin ? { hostId: Number(f.hostId) } : {}),
      description: f.descriptionEn.trim(),
      features: lines(f.features),
      defects: lines(f.defects),
      translations,
      status: f.status,
    }
    setBusy(true)
    try {
      // The server creates the slug (the car's web address); it stays the same when the car is edited.
      await save(input)
      navigate(backUrl)
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'validation' ? t.admin.errors.required : t.admin.saveError)
      setBusy(false)
    }
  }

  const cities = CITIES.includes(form.city) ? CITIES : [form.city, ...CITIES]

  return (
    <div style={{ paddingTop: 52 }}>
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px 96px' }}>
        <Link to={backUrl} style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none' }}>{backLabel}</Link>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '16px 0 8px' }}>{title}</h1>
        {existing && <p style={{ fontSize: 15, color: '#6e6e73', margin: 0 }}>{existing.brand} {existing.model}</p>}

        <form onSubmit={submit} noValidate>
          <FormSection title={t.admin.sections.basics}>
            <div className="admin-fields">
              <Field label={t.admin.fields.brand} required><input value={form.brand} onChange={e => set('brand', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.model} required><input value={form.model} onChange={e => set('model', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.year} required><input inputMode="numeric" value={form.year} onChange={e => set('year', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.price} required><input inputMode="numeric" value={form.price} onChange={e => set('price', e.target.value)} style={inputStyle} /></Field>
              {isAdmin && (
                <Field label={t.admin.fields.host} required>
                  <select value={form.hostId} onChange={e => set('hostId', e.target.value)} style={inputStyle}>
                    <option value="" disabled>{hosts ? t.admin.fields.hostChoose : '…'}</option>
                    {(hosts ?? []).map(h => (
                      <option key={h.id} value={h.id}>
                        {h.name} — {t.admin.fields.hostSummary(h.rating?.toFixed(1) ?? null, t.common.trips(h.trips), t.adminHosts.cars(h.cars.length))}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label={t.admin.status}>
                <select value={form.status} onChange={e => set('status', e.target.value as Status)} style={inputStyle}>
                  <option value="ACTIVE">{t.admin.statusActive}</option>
                  <option value="HIDDEN">{t.admin.statusHidden}</option>
                  {isAdmin && existing?.status === 'REMOVED' && <option value="REMOVED">{t.admin.statusRemoved}</option>}
                </select>
              </Field>
            </div>
          </FormSection>

          <FormSection title={t.admin.sections.specs}>
            <div className="admin-fields">
              <Field label={t.admin.fields.fuel}>
                <select value={form.fuel} onChange={e => set('fuel', e.target.value as Car['fuel'])} style={inputStyle}>
                  {(['Petrol', 'Diesel', 'Electric', 'Hybrid'] as const).map(f => <option key={f} value={f}>{t.common.fuel[f]}</option>)}
                </select>
              </Field>
              <Field label={t.admin.fields.drive}>
                <select value={form.drive} onChange={e => set('drive', e.target.value as Car['drive'])} style={inputStyle}>
                  {(['FWD', 'AWD', 'RWD'] as const).map(d => <option key={d} value={d}>{t.car.drive[d]}</option>)}
                </select>
              </Field>
              <Field label={t.admin.fields.seats} required><input inputMode="numeric" value={form.seats} onChange={e => set('seats', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.horsepower} required><input inputMode="numeric" value={form.horsepower} onChange={e => set('horsepower', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.acceleration} required><input inputMode="decimal" value={form.acceleration} onChange={e => set('acceleration', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.topSpeed} required><input inputMode="numeric" value={form.topSpeed} onChange={e => set('topSpeed', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.fields.transmission} required><input value={form.transmission} onChange={e => set('transmission', e.target.value)} style={inputStyle} /></Field>
              {(form.fuel === 'Electric' || form.fuel === 'Hybrid') && (
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
            <PhotoManager photos={form.photos} onChange={photos => set('photos', photos)} />
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

          <FormSection title={t.admin.defectsSection}>
            <Field label={t.admin.defectsLabel} hint={t.admin.defectsHint}>
              <textarea rows={4} value={form.defects} onChange={e => set('defects', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
          </FormSection>

          {error && <p role="alert" style={{ fontSize: 14, color: '#d70015', margin: '24px 0 0' }}>{error}</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 28 }}>
            <button type="submit" disabled={busy} style={{ opacity: busy ? 0.6 : 1, padding: '14px 32px', fontSize: 15, fontWeight: 500, background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 980, cursor: 'pointer' }}>
              {busy ? t.admin.saving : t.admin.save}
            </button>
            <Link to={backUrl} style={{ fontSize: 15, color: '#6e6e73', textDecoration: 'none' }}>{t.admin.cancel}</Link>
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

// The car's photos: upload from the device (stored on our server) or paste links; the first
// one is the cover. Photos can be moved to the front or removed.
function PhotoManager({ photos, onChange }: { photos: string[]; onChange: (photos: string[]) => void }) {
  const { t } = useI18n()
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const [links, setLinks] = useState('')
  const [broken, setBroken] = useState<string[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setFailed(false)
    const added: string[] = []
    for (let i = 0; i < files.length; i++) {
      setProgress({ done: i + 1, total: files.length })
      try {
        added.push(await uploadPhoto(files[i]))
      } catch {
        setFailed(true)
      }
    }
    setProgress(null)
    onChange([...photos, ...added])
    if (fileInput.current) fileInput.current.value = ''
  }

  function addLinks() {
    const urls = lines(links).filter(u => /^https?:\/\//.test(u))
    if (urls.length) onChange([...photos, ...urls])
    setLinks('')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => fileInput.current?.click()} disabled={!!progress} style={{ fontSize: 14, fontWeight: 500, padding: '11px 20px', borderRadius: 980, border: 'none', background: '#1d1d1f', color: '#fff', cursor: 'pointer', opacity: progress ? 0.6 : 1 }}>
          {progress ? t.admin.uploading(progress.done, progress.total) : t.admin.upload}
        </button>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e => upload(e.target.files)} />
        <span style={hintStyle}>{t.admin.hints.photos}</span>
      </div>
      {failed && <p style={{ ...hintStyle, color: '#d70015' }}>{t.admin.uploadError}</p>}

      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginTop: 12 }}>
          {photos.map((photo, i) => (
            <div key={`${i}-${photo}`} style={{ aspectRatio: '16/10', borderRadius: 10, overflow: 'hidden', background: '#f5f5f7', position: 'relative' }}>
              {broken.includes(photo) ? (
                <p style={{ fontSize: 12, color: '#d70015', margin: 0, padding: 10 }}>{t.admin.photoBroken}</p>
              ) : (
                <img src={photoUrl(photo, 280, 175)} alt="" onError={() => setBroken(b => [...b, photo])} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}
              {i === 0 ? (
                <span style={{ ...photoChip, left: 6 }}>1</span>
              ) : (
                <button type="button" title="1" onClick={() => onChange([photo, ...photos.filter((_, j) => j !== i)])} style={{ ...photoChip, left: 6, border: 'none', cursor: 'pointer' }}>↑ 1</button>
              )}
              <button type="button" aria-label={t.admin.removePhoto} title={t.admin.removePhoto} onClick={() => onChange(photos.filter((_, j) => j !== i))} style={{ ...photoChip, right: 6, border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <details style={{ marginTop: 14 }}>
        <summary style={{ fontSize: 13, color: '#0071e3', cursor: 'pointer' }}>{t.admin.fields.photos}</summary>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <textarea rows={2} value={links} onChange={e => setLinks(e.target.value)} placeholder="https://…" style={{ ...inputStyle, resize: 'vertical', fontSize: 13, fontFamily: 'ui-monospace, monospace' }} />
          <button type="button" onClick={addLinks} style={{ flexShrink: 0, fontSize: 14, fontWeight: 500, padding: '0 18px', borderRadius: 12, border: 'none', background: '#f5f5f7', color: '#1d1d1f', cursor: 'pointer' }}>+</button>
        </div>
      </details>
    </div>
  )
}

const photoChip: React.CSSProperties = { position: 'absolute', top: 6, fontSize: 11, fontWeight: 500, background: 'rgba(28,28,30,0.75)', color: '#fff', padding: '2px 8px', borderRadius: 980 }

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

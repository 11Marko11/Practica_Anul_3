import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { CITIES, photoUrl, type Car } from '../data/cars'
import type { CarInput } from '../lib/carStore'
import { api, ApiError } from '../lib/api'
import { searchAddress, type Place } from '../lib/delivery'
import { uploadPhoto } from '../lib/photos'
import { useI18n } from '../i18n/I18nContext'
import { DocumentCards, DocumentUploadForm } from '../components/PrivateDocuments'
import {
  CAR_DOCUMENT_TYPES,
  hostDocumentUrl,
  CAR_REVIEW_COLORS,
  REQUIRED_CAR_DOCUMENTS,
  uploadCarDocument,
  type CarDocumentType,
  type CarReviewStatus,
  type PrivateDocument,
} from '../lib/privateDocuments'

type CarDocument = PrivateDocument<CarDocumentType>
type Review = { status: CarReviewStatus; note: string | null }

// /host/cars/new and /host/cars/:id: a host adds or edits one of their own cars. Only the owner
// of a car can change it; admins can hide or delete cars from the admin list.
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
  const [existing, setExisting] = useState<{ car: Car; review: Review; documents: CarDocument[] } | null | undefined>(id ? undefined : null)
  useEffect(() => {
    if (id) api<{ car: Car; review: Review; documents: CarDocument[] }>(`/host/cars/${id}`).then(setExisting).catch(() => setExisting(null))
  }, [id])

  if (existing === undefined) return <div style={{ minHeight: '80vh' }} />
  if (id && !existing) return <NotFound backUrl="/host" backLabel={h.back} />
  return (
    <CarForm
      existing={existing?.car}
      review={existing?.review}
      initialDocuments={existing?.documents ?? []}
      backUrl="/host"
      backLabel={h.back}
      title={existing ? h.editTitle : h.newTitle}
      save={input => (existing ? api(`/host/cars/${existing.car.id}`, { method: 'PUT', body: input }) : api('/host/cars', { body: input }))}
    />
  )
}

function NotFound({ backUrl, backLabel }: { backUrl: string; backLabel: string }) {
  const { t } = useI18n()
  return (
    <div style={{ paddingTop: 52, textAlign: 'center', padding: '140px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1d1d1f', margin: '0 0 20px' }}>{t.car.notFound}</h1>
      <Link to={backUrl} className="btn-action btn-action--neutral btn-back">{backLabel}</Link>
    </div>
  )
}

type Pickup = { address: string; lat: number; lng: number }
type Status = 'ACTIVE' | 'HIDDEN'

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
  city: string
  address: string
  pickup: Pickup | null
  freeReturn: boolean // false: the customer must bring the car back to the pick-up address
  photos: string[]
  descriptionEn: string
  descriptionRo: string
  descriptionRu: string
  features: string
  defects: string
}

const EMPTY: FormState = {
  brand: '', model: '', year: String(new Date().getFullYear()), price: '', fuel: 'Petrol', seats: '4',
  horsepower: '', acceleration: '', topSpeed: '', transmission: '', drive: 'FWD', status: 'ACTIVE', range: '',
  city: CITIES[0], address: '', pickup: null, freeReturn: true, photos: [], descriptionEn: '', descriptionRo: '', descriptionRu: '', features: '', defects: '',
}

function fromCar(car: Car): FormState {
  return {
    brand: car.brand, model: car.model, year: String(car.year), price: String(car.pricePerDay), fuel: car.fuel, seats: String(car.seats),
    horsepower: String(car.horsepower), acceleration: String(car.acceleration), topSpeed: String(car.topSpeed), transmission: car.transmission,
    drive: car.drive, status: car.status === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE', range: car.range ? String(car.range) : '',
    city: car.location.split(',')[0], address: car.pickup.address, pickup: car.pickup, freeReturn: car.freeReturn !== false,
    photos: car.photos, descriptionEn: car.description, descriptionRo: car.translations?.ro?.description ?? '', descriptionRu: car.translations?.ru?.description ?? '',
    features: car.features.join('\n'), defects: (car.defects ?? []).join('\n'),
  }
}

// The fields checked before saving, in the order they appear on the page.
const CHECKED = ['brand', 'model', 'year', 'price', 'seats', 'horsepower', 'acceleration', 'topSpeed', 'transmission', 'address', 'photos', 'descriptionEn'] as const
type Checked = (typeof CHECKED)[number]
type FieldErrors = Partial<Record<Checked, string>>

const lines = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean)
const positive = (text: string) => Number(text.replace(',', '.')) > 0

// The form for a host's own car.
function CarForm({ existing, review, initialDocuments, backUrl, backLabel, title, save }: {
  existing?: Car
  review?: Review
  initialDocuments: CarDocument[]
  backUrl: string
  backLabel: string
  title: string
  save: (input: CarInput) => Promise<unknown>
}) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [form, setForm] = useState<FormState>(() => (existing ? fromCar(existing) : EMPTY))
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const [documents, setDocuments] = useState<CarDocument[]>(initialDocuments)
  const papers = t.carPapers
  // A car may be saved without its papers, but it stays off the site until they are approved.
  const hasPapers = REQUIRED_CAR_DOCUMENTS.every(type => documents.some(d => d.type === type))

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setError('')
    // A corrected field loses its red mark.
    const checked = (key === 'pickup' ? 'address' : key) as Checked
    if (fieldErrors[checked]) setFieldErrors(({ [checked]: _, ...rest }) => rest)
  }

  const cf = t.carForm
  const fieldLabels: Record<Checked, string> = {
    brand: t.admin.fields.brand, model: t.admin.fields.model, year: t.admin.fields.year, price: t.admin.fields.price,
    seats: t.admin.fields.seats, horsepower: t.admin.fields.horsepower, acceleration: t.admin.fields.acceleration,
    topSpeed: t.admin.fields.topSpeed, transmission: t.admin.fields.transmission, address: t.admin.fields.address,
    photos: t.admin.sections.photos, descriptionEn: `${t.admin.sections.description} (${t.admin.fields.descriptionEn})`,
  }

  // What is wrong with each field, with the same limits as the server.
  function validate(f: FormState): FieldErrors {
    const out: FieldErrors = {}
    const text = (key: Checked, value: string) => { if (!value.trim()) out[key] = cf.required }
    const number = (key: Checked, value: string, min: number, max: number) => {
      if (!value.trim()) return (out[key] = cf.required)
      const n = Number(value.replace(',', '.'))
      if (!Number.isFinite(n) || n <= 0) out[key] = cf.number
      else if (n < min || n > max) out[key] = cf.range(min, max)
    }
    text('brand', f.brand)
    text('model', f.model)
    number('year', f.year, 1950, new Date().getFullYear() + 1)
    number('price', f.price, 1, 1_000_000)
    number('seats', f.seats, 1, 12)
    number('horsepower', f.horsepower, 1, 3000)
    number('acceleration', f.acceleration, 0.1, 60)
    number('topSpeed', f.topSpeed, 1, 600)
    text('transmission', f.transmission)
    if (!f.pickup) out.address = f.address.trim() ? cf.address : cf.required
    if (!f.photos.length) out.photos = cf.photos
    text('descriptionEn', f.descriptionEn)
    return out
  }

  // Scrolls to the first wrong field and puts the cursor in it.
  function showFirst(errors: FieldErrors) {
    const first = CHECKED.find(k => errors[k])
    if (!first) return
    const box = document.getElementById(`field-${first}`)
    box?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    box?.querySelector<HTMLElement>('input, textarea, select, button')?.focus({ preventScroll: true })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const f = form
    const errors = validate(f)
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      setError(cf.summary(CHECKED.filter(k => errors[k]).map(k => fieldLabels[k]).join(', ')))
      showFirst(errors)
      return
    }
    if (!f.pickup) return

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
      freeReturn: f.freeReturn,
      description: f.descriptionEn.trim(),
      features: lines(f.features),
      defects: lines(f.defects),
      translations,
      status: f.status,
      documentIds: documents.map(d => d.id),
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
        <Link to={backUrl} className="btn-action btn-action--neutral btn-back">{backLabel}</Link>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '16px 0 8px' }}>{title}</h1>
        {existing && <p style={{ fontSize: 15, color: '#6e6e73', margin: 0 }}>{existing.brand} {existing.model}</p>}
        {review && review.status !== 'APPROVED' && (
          <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 16, background: CAR_REVIEW_COLORS[review.status].background }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: CAR_REVIEW_COLORS[review.status].color }}>{papers.status[review.status]}</div>
            <div style={{ fontSize: 14, color: '#1d1d1f', marginTop: 4, lineHeight: 1.5 }}>{review.status === 'PENDING' ? papers.pendingText : review.status === 'NO_DOCUMENTS' ? papers.noDocsText : papers.rejectedText}</div>
            {review.status === 'REJECTED' && review.note && <div style={{ fontSize: 14, color: '#1d1d1f', marginTop: 6 }}><strong style={{ fontWeight: 600 }}>{papers.reason}:</strong> {review.note}</div>}
          </div>
        )}

        <form onSubmit={submit} noValidate>
          <FormSection title={t.admin.sections.basics}>
            <div className="admin-fields">
              <Field name="brand" label={t.admin.fields.brand} required error={fieldErrors.brand}><input value={form.brand} onChange={e => set('brand', e.target.value)} style={inputStyle} /></Field>
              <Field name="model" label={t.admin.fields.model} required error={fieldErrors.model}><input value={form.model} onChange={e => set('model', e.target.value)} style={inputStyle} /></Field>
              <Field name="year" label={t.admin.fields.year} required error={fieldErrors.year}><input inputMode="numeric" value={form.year} onChange={e => set('year', e.target.value)} style={inputStyle} /></Field>
              <Field name="price" label={t.admin.fields.price} required error={fieldErrors.price}><input inputMode="numeric" value={form.price} onChange={e => set('price', e.target.value)} style={inputStyle} /></Field>
              <Field label={t.admin.status}>
                <select value={form.status} onChange={e => set('status', e.target.value as Status)} style={inputStyle}>
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
                  {(['Petrol', 'Diesel', 'Electric', 'Hybrid'] as const).map(f => <option key={f} value={f}>{t.common.fuel[f]}</option>)}
                </select>
              </Field>
              <Field label={t.admin.fields.drive}>
                <select value={form.drive} onChange={e => set('drive', e.target.value as Car['drive'])} style={inputStyle}>
                  {(['FWD', 'AWD', 'RWD'] as const).map(d => <option key={d} value={d}>{t.car.drive[d]}</option>)}
                </select>
              </Field>
              <Field name="seats" label={t.admin.fields.seats} required error={fieldErrors.seats}><input inputMode="numeric" value={form.seats} onChange={e => set('seats', e.target.value)} style={inputStyle} /></Field>
              <Field name="horsepower" label={t.admin.fields.horsepower} required error={fieldErrors.horsepower}><input inputMode="numeric" value={form.horsepower} onChange={e => set('horsepower', e.target.value)} style={inputStyle} /></Field>
              <Field name="acceleration" label={t.admin.fields.acceleration} required error={fieldErrors.acceleration}><input inputMode="decimal" value={form.acceleration} onChange={e => set('acceleration', e.target.value)} style={inputStyle} /></Field>
              <Field name="topSpeed" label={t.admin.fields.topSpeed} required error={fieldErrors.topSpeed}><input inputMode="numeric" value={form.topSpeed} onChange={e => set('topSpeed', e.target.value)} style={inputStyle} /></Field>
              <Field name="transmission" label={t.admin.fields.transmission} required error={fieldErrors.transmission}><input value={form.transmission} onChange={e => set('transmission', e.target.value)} style={inputStyle} /></Field>
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
              onPick={place => { setForm(f => ({ ...f, address: place.label })); set('pickup', { address: place.label, lat: place.lat, lng: place.lng }) }}
              error={fieldErrors.address}
            />
            <fieldset style={{ border: 'none', margin: '20px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <legend style={{ fontSize: 13, color: '#6e6e73', padding: 0, marginBottom: 8 }}>{t.carReturn.title}</legend>
              {([true, false] as const).map(free => (
                <label key={String(free)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 12, border: '1px solid', borderColor: form.freeReturn === free ? '#1d1d1f' : '#d2d2d7' }}>
                  <input type="radio" name="freeReturn" checked={form.freeReturn === free} onChange={() => set('freeReturn', free)} style={{ accentColor: '#1d1d1f', marginTop: 3 }} />
                  <span>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{free ? t.carReturn.anywhere : t.carReturn.same}</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#6e6e73', marginTop: 2 }}>{free ? t.carReturn.anywhereHint : t.carReturn.sameHint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </FormSection>

          <FormSection title={t.admin.sections.photos}>
            <div id="field-photos" className={fieldErrors.photos ? 'field--error' : undefined} style={{ scrollMarginTop: 140 }}>
              <PhotoManager photos={form.photos} onChange={photos => set('photos', photos)} />
              {fieldErrors.photos && <FieldError text={fieldErrors.photos} />}
            </div>
          </FormSection>

          <FormSection title={t.admin.sections.description}>
            <p style={hintStyle}>{t.admin.hints.descriptions}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
              <Field name="descriptionEn" label={t.admin.fields.descriptionEn} required error={fieldErrors.descriptionEn}><textarea rows={4} value={form.descriptionEn} onChange={e => set('descriptionEn', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
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

          <FormSection title={papers.section}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 14, color: '#424245', lineHeight: 1.6, margin: 0 }}>{papers.intro}</p>
            {documents.length === 0 ? (
              <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>{papers.noDocuments}</p>
            ) : (
              <DocumentCards documents={documents} label={type => papers.docTypes[type]} url={hostDocumentUrl} onRemove={id => setDocuments(docs => docs.filter(d => d.id !== id))} />
            )}
            <DocumentUploadForm
              key={documents.length} // after an upload, start again on the next missing type
              types={CAR_DOCUMENT_TYPES}
              label={type => papers.docTypes[type]}
              initialType={CAR_DOCUMENT_TYPES.find(type => !documents.some(d => d.type === type))}
              errorText={err => (err instanceof ApiError && err.code in t.profile.errors ? t.profile.errors[err.code as keyof typeof t.profile.errors] : t.profile.errors.unknown)}
              onUpload={async (type, file) => {
                const doc = await uploadCarDocument(type, file)
                setDocuments(docs => [...docs, doc])
                setError('')
              }}
            />
            <p style={{ fontSize: 12, color: '#86868b', margin: 0 }}>{papers.required} {existing ? papers.recheck : papers.newNote}</p>
            {!hasPapers && <p style={{ fontSize: 13, color: '#9a5b00', margin: 0 }}>{papers.noDocsText}</p>}
            </div>
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
function PickupField({ city, cities, address, pickup, onCity, onAddress, onPick, error }: {
  city: string
  cities: string[]
  address: string
  pickup: Pickup | null
  onCity: (city: string) => void
  onAddress: (address: string) => void
  onPick: (place: Place) => void
  error?: string
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
        <Field name="address" label={t.admin.fields.address} hint={t.admin.hints.address} required error={error}>
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

// A labelled field; with an `error` it is outlined in red and the reason shows under it.
function Field({ name, label, hint, required = false, error, children }: { name?: string; label: string; hint?: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <label id={name ? `field-${name}` : undefined} className={error ? 'field--error' : undefined} style={{ display: 'block', minWidth: 0, scrollMarginTop: 140 }}>
      <span style={{ display: 'block', fontSize: 13, color: error ? '#d70015' : '#6e6e73', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#d70015' }}> *</span>}
      </span>
      {children}
      {error ? <FieldError text={error} /> : hint && <span style={{ ...hintStyle, display: 'block' }}>{hint}</span>}
    </label>
  )
}

function FieldError({ text }: { text: string }) {
  return <span role="alert" style={{ display: 'block', fontSize: 13, color: '#d70015', margin: '6px 0 0', lineHeight: 1.4 }}>{text}</span>
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', fontSize: 15, border: '1px solid #d2d2d7', borderRadius: 12,
  background: '#fff', color: '#1d1d1f', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
}

const hintStyle: React.CSSProperties = { fontSize: 12, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }

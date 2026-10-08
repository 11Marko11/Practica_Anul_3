import { useEffect, useState } from 'react'
import { BookingCard } from '../../components/BookingCard'
import { useI18n } from '../../i18n/I18nContext'
import { ApiError } from '../../lib/api'
import { adminBookingAction, adminBookings, type Booking, type BookingStatus } from '../../lib/bookings'
import { refreshAwaitingCount } from '../../lib/adminNotifications'
import { fmt } from '../../lib/rental'
import { AdminGuard } from './AdminGuard'
import { AdminTabs } from './AdminTabs'

const FILTERS: (BookingStatus | 'ALL')[] = ['AWAITING_CONFIRMATION', 'CONFIRMED', 'PENDING_PAYMENT', 'COMPLETED', 'ALL']

export function AdminBookings() {
  return (
    <AdminGuard>
      <AdminBookingsContent />
    </AdminGuard>
  )
}

function AdminBookingsContent() {
  const { lang, t } = useI18n()
  const [filter, setFilter] = useState<BookingStatus | 'ALL'>('AWAITING_CONFIRMATION')
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setBookings(await adminBookings(filter === 'ALL' ? undefined : filter).catch(() => []))
  }

  useEffect(() => {
    setBookings(null)
    load()
  }, [filter])

  async function act(b: Booking, action: 'confirm' | 'reject' | 'complete') {
    const question = action === 'confirm' ? t.adminBookings.confirmAsk(fmt(b.total)) : action === 'reject' ? t.adminBookings.rejectAsk : t.adminBookings.completeAsk
    if (!confirm(question)) return
    setBusyId(b.id)
    try {
      await adminBookingAction(b.id, action)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown'
      alert(code in t.adminBookings.errors ? t.adminBookings.errors[code as keyof typeof t.adminBookings.errors] : t.adminBookings.errors.unknown)
    }
    setBusyId(null)
    await Promise.all([load(), refreshAwaitingCount()])
  }

  const time = (iso: string) => new Date(iso).toLocaleString(lang, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  const label = (f: BookingStatus | 'ALL') => (f === 'ALL' ? t.adminBookings.all : t.bookings.status[f])

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '40px 24px 28px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <AdminTabs />
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{t.adminBookings.title}</h1>
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 96px' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ fontSize: 13, padding: '7px 14px', borderRadius: 980, border: '1px solid', borderColor: filter === f ? '#1d1d1f' : '#d2d2d7', background: filter === f ? '#1d1d1f' : 'transparent', color: filter === f ? '#fff' : '#6e6e73', cursor: 'pointer' }}
            >
              {label(f)}
            </button>
          ))}
        </div>

        {filter === 'AWAITING_CONFIRMATION' && bookings && bookings.length > 0 && (
          <p style={{ fontSize: 15, fontWeight: 500, color: '#0058b8', margin: '0 0 14px' }}>{t.adminBookings.awaiting(bookings.length)}</p>
        )}
        {!bookings && <p style={{ fontSize: 15, color: '#6e6e73' }}>{t.bookings.loading}</p>}
        {bookings?.length === 0 && <p style={{ fontSize: 15, color: '#6e6e73', padding: '32px 0' }}>{t.adminBookings.empty}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {bookings?.map(b => (
            <BookingCard key={b.id} booking={b}>
              <div style={{ fontSize: 14, color: '#1d1d1f', marginTop: 10, lineHeight: 1.6 }}>
                <strong style={{ fontWeight: 600 }}>{t.adminBookings.customer}:</strong> {b.customer?.name} ·{' '}
                <a href={`mailto:${b.customer?.email}`} style={{ color: '#0071e3', textDecoration: 'none' }}>{b.customer?.email}</a> ·{' '}
                <a href={`tel:${b.phone.replace(/[^+\d]/g, '')}`} style={{ color: '#0071e3', textDecoration: 'none' }}>{b.phone}</a>
                {b.note && <div style={{ color: '#424245', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>“{b.note}”</div>}
                <div style={{ fontSize: 12, color: '#86868b' }}>{t.bookings.bookedOn(time(b.createdAt))}</div>
                {b.status === 'AWAITING_CONFIRMATION' && b.holdExpiresAt && (
                  <div style={{ fontSize: 12, color: '#9a5b00' }}>{t.adminBookings.holdUntil(time(b.holdExpiresAt))}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {b.status === 'AWAITING_CONFIRMATION' && (
                  <>
                    <ActionButton primary disabled={busyId === b.id} onClick={() => act(b, 'confirm')}>{t.adminBookings.confirm}</ActionButton>
                    <ActionButton danger disabled={busyId === b.id} onClick={() => act(b, 'reject')}>{t.adminBookings.reject}</ActionButton>
                  </>
                )}
                {b.status === 'CONFIRMED' && (
                  <ActionButton disabled={busyId === b.id} onClick={() => act(b, 'complete')}>{t.adminBookings.complete}</ActionButton>
                )}
              </div>
            </BookingCard>
          ))}
        </div>
      </main>
    </div>
  )
}

function ActionButton({ primary, danger, disabled, onClick, children }: { primary?: boolean; danger?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 14, fontWeight: 500, padding: '9px 18px', borderRadius: 980, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        border: primary ? 'none' : '1px solid', borderColor: danger ? '#f0c4c4' : '#d2d2d7',
        background: primary ? '#1d1d1f' : '#fff', color: primary ? '#fff' : danger ? '#d70015' : '#1d1d1f',
      }}
    >
      {children}
    </button>
  )
}

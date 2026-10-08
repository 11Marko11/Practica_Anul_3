import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { photoUrl } from '../data/cars'
import { useI18n } from '../i18n/I18nContext'
import type { Booking, BookingStatus } from '../lib/bookings'
import { fmt, formatDate } from '../lib/rental'

const STATUS_COLORS: Record<BookingStatus, { bg: string; fg: string }> = {
  PENDING_PAYMENT: { bg: '#fff4e0', fg: '#9a5b00' },
  AWAITING_CONFIRMATION: { bg: '#e6f0ff', fg: '#0058b8' },
  CONFIRMED: { bg: '#e3f6e8', fg: '#1b7a35' },
  COMPLETED: { bg: '#ececf0', fg: '#3a3a3c' },
  EXPIRED: { bg: '#f2f2f4', fg: '#6e6e73' },
  REJECTED: { bg: '#fdeaea', fg: '#b3261e' },
  CANCELLED: { bg: '#f2f2f4', fg: '#6e6e73' },
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useI18n()
  const c = STATUS_COLORS[status]
  return (
    <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 500, background: c.bg, color: c.fg, padding: '4px 10px', borderRadius: 980, whiteSpace: 'nowrap' }}>
      {t.bookings.status[status]}
    </span>
  )
}

// One booking in a list: car, dates, how the car is handed over, total and status.
// `to` links the car name to the booking; `children` holds extra details or actions.
export function BookingCard({ booking: b, to, children }: { booking: Booking; to?: string; children?: ReactNode }) {
  const { lang, t } = useI18n()
  const name = `${b.car.brand} ${b.car.model}`
  return (
    <article style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: 18, borderRadius: 18, background: '#f5f5f7' }}>
      <div style={{ width: 132, aspectRatio: '16/10', borderRadius: 12, overflow: 'hidden', background: '#e8e8ed', flexShrink: 0 }}>
        {b.car.photo && <img src={photoUrl(b.car.photo, 264, 165)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', margin: 0 }}>
            {to ? <Link to={to} style={{ color: 'inherit', textDecoration: 'none' }}>{name}</Link> : name}
          </h3>
          <StatusBadge status={b.status} />
        </div>
        <p style={{ fontSize: 14, color: '#424245', margin: '6px 0 0' }}>
          {formatDate(b.pickupDate, lang)} – {formatDate(b.returnDate, lang)} · {t.common.days(b.days)}
        </p>
        <p style={{ fontSize: 13, color: '#6e6e73', margin: '4px 0 0', overflowWrap: 'anywhere' }}>
          {b.handover === 'DELIVERY' ? `${t.bookings.deliveryTo}: ${b.deliveryAddress}` : t.bookings.pickupAt}
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', margin: '8px 0 0' }}>
          {fmt(b.total)}
          {b.refundedAmount > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: '#6e6e73' }}> · {t.bookings.refunded} {fmt(b.refundedAmount)}</span>}
        </p>
        {children}
      </div>
    </article>
  )
}

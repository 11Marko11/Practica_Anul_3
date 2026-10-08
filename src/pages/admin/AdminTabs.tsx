import { NavLink } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { isAdmin } from '../../auth/admin'
import { CountBadge } from '../../components/CountBadge'
import { useI18n } from '../../i18n/I18nContext'
import { useAwaitingCount } from '../../lib/adminNotifications'

// "Cars | Bookings" switch at the top of the admin pages; Bookings shows how many wait for confirmation.
export function AdminTabs() {
  const { t } = useI18n()
  const { user } = useAuth()
  const awaiting = useAwaitingCount(isAdmin(user))
  const tab = ({ isActive }: { isActive: boolean }) => ({
    display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, padding: '8px 16px', borderRadius: 980,
    textDecoration: 'none', background: isActive ? '#f5f5f7' : 'transparent', color: isActive ? '#1c1c1e' : '#a1a1a6',
  })
  return (
    <nav style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
      <NavLink to="/admin" end style={tab}>{t.adminBookings.tabCars}</NavLink>
      <NavLink to="/admin/bookings" style={tab}>
        {t.adminBookings.tabBookings} <CountBadge n={awaiting} />
      </NavLink>
    </nav>
  )
}

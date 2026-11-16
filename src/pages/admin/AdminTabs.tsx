import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { isAdmin } from '../../auth/admin'
import { CountBadge } from '../../components/CountBadge'
import { useI18n } from '../../i18n/I18nContext'
import { useAdminCounts } from '../../lib/adminNotifications'
import { useNavScroll } from '../../lib/useNavScroll'

// The admin sections, centred in a bar fixed under the site menu; Bookings shows how many wait for confirmation.
export function AdminTabs() {
  const { t } = useI18n()
  const { user } = useAuth()
  const counts = useAdminCounts(isAdmin(user))
  // Moves up with the site menu when that hides while scrolling down.
  const { hidden } = useNavScroll()
  // On narrow screens the bar scrolls sideways: bring the current section into view.
  const bar = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  useEffect(() => {
    const active = bar.current?.querySelector<HTMLElement>('a.active')
    if (bar.current && active) bar.current.scrollLeft = active.offsetLeft - (bar.current.clientWidth - active.offsetWidth) / 2
  }, [pathname])
  const tab = ({ isActive }: { isActive: boolean }) => ({
    display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, padding: '8px 16px', borderRadius: 980,
    textDecoration: 'none', background: isActive ? '#f5f5f7' : 'transparent', color: isActive ? '#1c1c1e' : '#a1a1a6',
  })
  // The bar is fixed under the site menu, so the sections stay at hand while scrolling; the
  // empty block keeps the bar's place in the page header.
  return (
    <>
    <div className="admin-tabs-space" aria-hidden />
    <nav ref={bar} className="admin-tabs" style={{ transform: hidden ? 'translateY(-52px)' : 'none' }}>
      <div className="admin-tabs-inner">
      <NavLink to="/admin" end style={tab}>{t.dashboard.tab}</NavLink>
      <NavLink to="/admin/cars" style={tab}>{t.adminBookings.tabCars} <CountBadge n={counts.carReviews} /></NavLink>
      <NavLink to="/admin/bookings" style={tab}>
        {t.adminBookings.tabBookings}
      </NavLink>
      <NavLink to="/admin/transactions" style={tab}>{t.transactions.tab}</NavLink>
      <NavLink to="/admin/users" style={tab}>{t.users.tab} <CountBadge n={counts.verifications + counts.hostRequests} /></NavLink>
      <NavLink to="/admin/reviews" style={tab}>{t.reviewsAdmin.tab}</NavLink>
      <NavLink to="/admin/promotions" style={tab}>{t.adminPromos.tab}</NavLink>
      <NavLink to="/admin/pages" style={tab}>{t.adminPages.tab}</NavLink>
      </div>
    </nav>
    </>
  )
}

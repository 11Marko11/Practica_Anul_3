import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { isAdmin } from '../../auth/admin'
import { CountBadge } from '../../components/CountBadge'
import { useI18n } from '../../i18n/I18nContext'
import { useAdminCounts } from '../../lib/adminNotifications'

// The admin sections, centred at the top of the page header; they scroll away with it.
export function AdminTabs() {
  const { t } = useI18n()
  const { user } = useAuth()
  const counts = useAdminCounts(isAdmin(user))
  // On narrow screens the bar scrolls sideways: bring the current section into view.
  const bar = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  useEffect(() => {
    const center = () => {
      const active = bar.current?.querySelector<HTMLElement>('a.active')
      if (bar.current && active) bar.current.scrollLeft = active.offsetLeft - (bar.current.clientWidth - active.offsetWidth) / 2
    }
    center()
    // Again whenever the tabs change width (the web font arriving, a red counter appearing).
    const inner = bar.current?.firstElementChild
    if (!inner) return
    const watch = new ResizeObserver(center)
    watch.observe(inner)
    return () => watch.disconnect()
  }, [pathname])
  const tab = ({ isActive }: { isActive: boolean }) => ({
    display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, padding: '8px 16px', borderRadius: 980,
    textDecoration: 'none', background: isActive ? '#f5f5f7' : 'transparent', color: isActive ? '#1c1c1e' : '#a1a1a6',
  })
  return (
    <>
    <nav ref={bar} className="host-tabs">
      <div className="admin-tabs-inner" style={{ padding: '0 24px 24px' }}>
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

import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { isAdmin } from '../../auth/admin'
import { useI18n } from '../../i18n/I18nContext'

// Sends signed-out visitors to the login page and shows "No access" to non-admins.
export function AdminGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { t } = useI18n()
  const location = useLocation()

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (isAdmin(user)) return <>{children}</>

  return (
    <div style={{ paddingTop: 52, minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px' }}>
      <div>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '0 0 8px' }}>{t.admin.noAccess}</h1>
        <p style={{ fontSize: 16, color: '#6e6e73', margin: '0 0 24px' }}>{t.admin.noAccessText}</p>
        <Link to="/" style={{ fontSize: 15, fontWeight: 500, padding: '12px 28px', borderRadius: 980, background: '#1d1d1f', color: '#fff', textDecoration: 'none' }}>
          {t.admin.backHome}
        </Link>
      </div>
    </div>
  )
}

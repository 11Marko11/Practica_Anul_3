import { Outlet, NavLink, useLocation, useNavigate } from 'react-router'
import { Avatar } from '../components/Avatar'
import { useState, useEffect, useRef } from 'react'
import { NAV_HEIGHT, useNavScroll } from '../lib/useNavScroll'
import { useAuth } from '../auth/AuthContext'
import { isAdmin } from '../auth/admin'
import { useI18n } from '../i18n/I18nContext'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { CountBadge } from '../components/CountBadge'
import { useAwaitingCount } from '../lib/adminNotifications'
import { useHostAwaiting } from '../lib/hostNotifications'
import { useUnreadNotifications } from '../lib/notifications'

const NAV_LINKS = [['marketplace', 'rent'], ['about', 'about'], ['contact', 'contact']] as const

export function Root() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrolled, hidden } = useNavScroll()
  const { t } = useI18n()
  const { user } = useAuth()
  const awaiting = useAwaitingCount(isAdmin(user))
  // Bookings waiting for a host's answer.
  const hostAwaiting = useHostAwaiting(!!user?.host)
  const unread = useUnreadNotifications(!!user)
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  // The admin and host pages have a section bar under the menu: there both stay in place.
  const pinned = /^\/(admin|host)(\/|$)/.test(location.pathname)

  // Whenever the user is signed out – by "Sign out" or because the session ended – go to the home page.
  // The current page is not shown meanwhile, so pages for signed-in users don't send them to the
  // login page first.
  const wasSignedIn = useRef(false)
  const justSignedOut = wasSignedIn.current && !user
  useEffect(() => {
    if (justSignedOut) navigate('/', { replace: true })
    wasSignedIn.current = !!user
  }, [user, justSignedOut, navigate])

  useEffect(() => {
    window.scrollTo(0, 0)
    setMenuOpen(false)
  }, [location.pathname])

  // Transparent only at the top of the home hero, and never while the phone menu is open.
  const transparent = isHome && !scrolled && !menuOpen
  const navBg = transparent
    ? 'rgba(0,0,0,0)'
    : 'rgba(28,28,30,0.9)'

  const navBorder = transparent ? 'transparent' : '#2c2c2e'
  const linkColor = 'rgba(255,255,255,0.7)'
  const btnStyle = transparent
    ? { background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }
    : { background: '#f5f5f7', color: '#1c1c1e', border: 'none' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', color: '#1d1d1f' }}>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: navBg,
        backdropFilter: transparent ? 'none' : 'blur(20px)',
        borderBottom: `1px solid ${navBorder}`,
        transform: hidden && !menuOpen && !pinned ? 'translateY(-100%)' : 'none',
        transition: 'transform 0.3s ease, background 0.3s ease, border-color 0.3s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: NAV_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <NavLink to="/" aria-label="Rent Motors" style={{ display: 'flex', alignItems: 'center', height: NAV_HEIGHT }}>
            <img src="/brand/logo-white.png" alt="Rent Motors" width={92} height={40} style={{ height: 40, width: 'auto', display: 'block' }} />
          </NavLink>
          <div className="nav-links" style={{ gap: 28, alignItems: 'center' }}>
            {NAV_LINKS.map(([path, key]) => (
              <NavLink
                key={path}
                to={`/${path}`}
                style={({ isActive }) => ({
                  fontSize: 14,
                  color: isActive ? '#fff' : linkColor,
                  textDecoration: 'none',
                  fontWeight: isActive ? 500 : 400,
                  transition: 'color 0.3s',
                })}
              >
                {t.nav[key]}
              </NavLink>
            ))}
          </div>
          <div className="nav-account" style={{ alignItems: 'center', gap: 12 }}>
            <LanguageSwitcher />
            <NotificationBell />
            <AccountButton btnStyle={btnStyle} />
          </div>
          <button
            className="nav-toggle"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={menuOpen}
            style={{ position: 'relative', width: 40, height: 40, marginRight: -8, alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}
          >
            {awaiting + hostAwaiting + unread > 0 && !menuOpen && <span aria-hidden style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: '#ff3b30' }} />}
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
              {menuOpen
                ? <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                : <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
        {menuOpen && <MobileMenu />}
      </nav>

      <div style={{ flex: 1 }}>
        {!justSignedOut && <Outlet />}
      </div>

      <footer style={{ background: '#161618', padding: '28px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <img src="/brand/logo-white.png" alt="Rent Motors" width={74} height={32} style={{ height: 32, width: 'auto', display: 'block' }} />
          <p style={{ fontSize: 13, color: '#86868b', margin: 0 }}>{t.footer.rights}</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {(['privacy', 'terms', 'contact'] as const).map(path => (
              <NavLink key={path} to={`/${path}`} style={({ isActive }) => ({ fontSize: 13, color: isActive ? '#f5f5f7' : '#a1a1a6', textDecoration: 'none' })}>
                {t.footer[path]}
              </NavLink>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

// The bell next to the account menu: opens the notifications, with a red count of unread ones.
function NotificationBell() {
  const { user } = useAuth()
  const { t } = useI18n()
  const unread = useUnreadNotifications(!!user)
  if (!user) return null
  return (
    <NavLink to="/notifications" aria-label={t.notifications.title} title={t.notifications.title} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', color: '#f5f5f7', background: 'rgba(255,255,255,0.12)' }}>
      <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden>
        <path d="M10 2.5a5 5 0 0 0-5 5v3.2L3.5 13.5h13L15 10.7V7.5a5 5 0 0 0-5-5ZM8 16a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -6 }}><CountBadge n={unread} /></span>}
    </NavLink>
  )
}

function AccountButton({ btnStyle }: { btnStyle: React.CSSProperties }) {
  const { user, loading, signOut } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  const awaiting = useAwaitingCount(isAdmin(user))
  // Bookings waiting for a host's answer.
  const hostAwaiting = useHostAwaiting(!!user?.host)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const pill = { fontSize: 13, fontWeight: 500, borderRadius: 980, padding: '8px 18px', cursor: 'pointer', transition: 'all 0.3s', ...btnStyle }

  // Until the server says who is signed in, keep the space empty instead of flashing "Sign In".
  if (loading) return <span style={{ display: 'inline-block', width: 86 }} />

  if (!user) {
    return (
      <NavLink to="/login" state={{ from: location.pathname }} style={{ ...pill, display: 'inline-block', textDecoration: 'none' }}>
        {t.account.signIn}
      </NavLink>
    )
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ ...pill, display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px 5px 5px' }}
      >
        <Avatar name={user.name} url={user.avatarUrl} size={24} background="#0071e3" />
        {user.name.split(' ')[0]}
        <CountBadge n={awaiting + hostAwaiting} />
      </button>
      {open && (
        <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', minWidth: 220, background: '#2a2a2d', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: '1px solid #3a3a3d', padding: 8 }}>
          <NavLink to="/profile" role="menuitem" style={{ display: 'block', padding: '8px 10px 12px', borderBottom: '1px solid #3a3a3d', marginBottom: 6, textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#f5f5f7' }}>
              {user.name}
              {user.verificationStatus === 'VERIFIED' && <span title={t.profile.status.VERIFIED} style={{ color: '#30d158', fontSize: 13 }}>✓</span>}
            </div>
            <div style={{ fontSize: 13, color: '#a1a1a6', marginTop: 2 }}>{user.email}</div>
          </NavLink>
          <MenuLink to="/profile">{t.profile.menu}</MenuLink>
          {isAdmin(user) ? (
            <MenuLink to="/admin">
              {t.dashboard.menu} <CountBadge n={awaiting} />
            </MenuLink>
          ) : (
            <MenuLink to="/bookings">{t.bookings.menu}</MenuLink>
          )}
          {user.host && <MenuLink to="/host">{t.hostPortal.menu} <CountBadge n={hostAwaiting} /></MenuLink>}
          <button
            role="menuitem"
            onClick={() => { signOut(); setOpen(false) }}
            style={{ width: '100%', textAlign: 'left', fontSize: 14, color: '#ff6961', background: 'none', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#3a3a3d')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {t.account.signOut}
          </button>
        </div>
      )}
    </div>
  )
}

function MenuLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      role="menuitem"
      to={to}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 14, color: '#f5f5f7', textDecoration: 'none', borderRadius: 8, padding: '8px 10px' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#3a3a3d')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {children}
    </NavLink>
  )
}

function MobileMenu() {
  const { user, loading, signOut } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  const awaiting = useAwaitingCount(isAdmin(user))
  // Bookings waiting for a host's answer.
  const hostAwaiting = useHostAwaiting(!!user?.host)
  const unread = useUnreadNotifications(!!user)
  const item = ({ isActive }: { isActive: boolean }) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', fontSize: 20, fontWeight: 500, letterSpacing: '-0.02em', color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', textDecoration: 'none', borderBottom: '1px solid #2c2c2e' })
  return (
    <div className="mobile-menu" style={{ background: '#1c1c1e', borderTop: '1px solid #2c2c2e', padding: '8px 24px 24px' }}>
      {NAV_LINKS.map(([path, key]) => (
        <NavLink
          key={path}
          to={`/${path}`}
          style={({ isActive }) => ({ display: 'block', padding: '14px 0', fontSize: 20, fontWeight: 500, letterSpacing: '-0.02em', color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', textDecoration: 'none', borderBottom: '1px solid #2c2c2e' })}
        >
          {t.nav[key]}
        </NavLink>
      ))}
      {user && <NavLink to="/profile" style={item}>{t.profile.menu}</NavLink>}
      {user && <NavLink to="/notifications" style={item}>{t.notifications.menu} <CountBadge n={unread} /></NavLink>}
      {isAdmin(user) ? (
        <NavLink to="/admin" style={item}>
          {t.dashboard.menu} <CountBadge n={awaiting} />
        </NavLink>
      ) : (
        user && <NavLink to="/bookings" end style={item}>{t.bookings.menu}</NavLink>
      )}
      {user?.host && <NavLink to="/host" style={item}>{t.hostPortal.menu} <CountBadge n={hostAwaiting} /></NavLink>}
      {loading ? null : user ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f7' }}>{user.name}</div>
            <div style={{ fontSize: 13, color: '#a1a1a6', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
          </div>
          <button onClick={signOut} style={{ flexShrink: 0, fontSize: 14, fontWeight: 500, color: '#ff6961', background: '#2a2a2d', border: 'none', borderRadius: 980, padding: '10px 18px', cursor: 'pointer' }}>
            {t.account.signOut}
          </button>
        </div>
      ) : (
        <NavLink
          to="/login"
          state={{ from: location.pathname }}
          style={{ display: 'block', marginTop: 20, textAlign: 'center', fontSize: 15, fontWeight: 500, padding: '14px 0', borderRadius: 980, background: '#f5f5f7', color: '#1c1c1e', textDecoration: 'none' }}
        >
          {t.account.signIn}
        </NavLink>
      )}
      <div style={{ marginTop: 20 }}>
        <LanguageSwitcher large />
      </div>
    </div>
  )
}

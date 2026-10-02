import { Outlet, NavLink, useLocation } from 'react-router'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { LanguageSwitcher } from '../components/LanguageSwitcher'

const NAV_LINKS = [['marketplace', 'rent'], ['about', 'about'], ['contact', 'contact']] as const

const NAV_HEIGHT = 52

// Hide the nav while scrolling down, bring it back as soon as the user scrolls up.
function useNavScroll() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastY.current
      setScrolled(y > 20)
      if (y <= NAV_HEIGHT) setHidden(false)
      else if (delta > 4) setHidden(true)
      else if (delta < -4) setHidden(false)
      if (Math.abs(delta) > 4 || y <= NAV_HEIGHT) lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return { scrolled, hidden }
}

export function Root() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrolled, hidden } = useNavScroll()
  const { t } = useI18n()
  const location = useLocation()
  const isHome = location.pathname === '/'

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
  const logoColor = '#fff'
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
        transform: hidden && !menuOpen ? 'translateY(-100%)' : 'none',
        transition: 'transform 0.3s ease, background 0.3s ease, border-color 0.3s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: NAV_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <NavLink to="/" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: logoColor, textDecoration: 'none', transition: 'color 0.3s' }}>
            Rent Motors
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
            <AccountButton btnStyle={btnStyle} />
          </div>
          <button
            className="nav-toggle"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={menuOpen}
            style={{ width: 40, height: 40, marginRight: -8, alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}
          >
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
        <Outlet />
      </div>

      <footer style={{ background: '#161618', padding: '28px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f7', letterSpacing: '-0.02em' }}>Rent Motors</span>
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

function AccountButton({ btnStyle }: { btnStyle: React.CSSProperties }) {
  const { user, signOut } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
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
        <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#0071e3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
          {user.name.charAt(0).toUpperCase()}
        </span>
        {user.name.split(' ')[0]}
      </button>
      {open && (
        <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', minWidth: 220, background: '#2a2a2d', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: '1px solid #3a3a3d', padding: 8 }}>
          <div style={{ padding: '8px 10px 12px', borderBottom: '1px solid #3a3a3d', marginBottom: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f7' }}>{user.name}</div>
            <div style={{ fontSize: 13, color: '#a1a1a6', marginTop: 2 }}>{user.email}</div>
          </div>
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

function MobileMenu() {
  const { user, signOut } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
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
      {user ? (
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

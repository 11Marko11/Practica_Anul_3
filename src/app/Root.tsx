import { Outlet, NavLink, useLocation } from 'react-router'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthContext'

export function Root() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const navBg = isHome && !scrolled
    ? 'rgba(0,0,0,0)'
    : 'rgba(28,28,30,0.9)'

  const navBorder = isHome && !scrolled ? 'transparent' : '#2c2c2e'
  const linkColor = 'rgba(255,255,255,0.7)'
  const logoColor = '#fff'
  const btnStyle = isHome && !scrolled
    ? { background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }
    : { background: '#f5f5f7', color: '#1c1c1e', border: 'none' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', color: '#1d1d1f' }}>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: navBg,
        backdropFilter: scrolled || !isHome ? 'blur(20px)' : 'none',
        borderBottom: `1px solid ${navBorder}`,
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <NavLink to="/" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: logoColor, textDecoration: 'none', transition: 'color 0.3s' }}>
            Rent Motors
          </NavLink>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            {[['marketplace', 'Rent a Car'],['about', 'About'], ['contact', 'Contact']].map(([path, label]) => (
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
                {label}
              </NavLink>
            ))}
          </div>
          <AccountButton btnStyle={btnStyle} />
        </div>
      </nav>

      <div style={{ flex: 1 }}>
        <Outlet />
      </div>

      <footer style={{ background: '#161618', padding: '28px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f7', letterSpacing: '-0.02em' }}>Rent Motors</span>
          <p style={{ fontSize: 13, color: '#86868b', margin: 0 }}>© 2026 Rent Motors, Inc. All rights reserved.</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['privacy', 'Privacy'], ['terms', 'Terms'], ['contact', 'Contact']].map(([, l]) => (
              <a key={l} href="#" style={{ fontSize: 13, color: '#a1a1a6', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

function AccountButton({ btnStyle }: { btnStyle: React.CSSProperties }) {
  const { user, signOut } = useAuth()
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
        Sign In
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
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

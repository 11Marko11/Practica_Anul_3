import { Outlet, NavLink, useLocation } from 'react-router'
import { useState, useEffect } from 'react'

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
    : 'rgba(255,255,255,0.85)'

  const navBorder = isHome && !scrolled ? 'transparent' : '#f0f0f0'
  const linkColor = isHome && !scrolled ? 'rgba(255,255,255,0.8)' : '#6e6e73'
  const logoColor = isHome && !scrolled ? '#fff' : '#1d1d1f'
  const btnStyle = isHome && !scrolled
    ? { background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }
    : { background: '#1d1d1f', color: '#fff', border: 'none' }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#1d1d1f' }}>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: navBg,
        backdropFilter: scrolled || !isHome ? 'blur(20px)' : 'none',
        borderBottom: `1px solid ${navBorder}`,
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <NavLink to="/" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: logoColor, textDecoration: 'none', transition: 'color 0.3s' }}>
            AutoMarkt
          </NavLink>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            {[['marketplace', 'Browse'], ['about', 'About'], ['contact', 'Contact']].map(([path, label]) => (
              <NavLink
                key={path}
                to={`/${path}`}
                style={({ isActive }) => ({
                  fontSize: 14,
                  color: isActive ? (isHome && !scrolled ? '#fff' : '#1d1d1f') : linkColor,
                  textDecoration: 'none',
                  fontWeight: isActive ? 500 : 400,
                  transition: 'color 0.3s',
                })}
              >
                {label}
              </NavLink>
            ))}
          </div>
          <NavLink to="/marketplace">
            <button style={{ fontSize: 13, fontWeight: 500, borderRadius: 980, padding: '8px 18px', cursor: 'pointer', transition: 'all 0.3s', ...btnStyle }}>
              List a Car
            </button>
          </NavLink>
        </div>
      </nav>

      <Outlet />

      <footer style={{ borderTop: '1px solid #f0f0f0', padding: '28px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em' }}>AutoMarkt</span>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>© 2026 AutoMarkt, Inc. All rights reserved.</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['privacy', 'Privacy'], ['terms', 'Terms'], ['contact', 'Contact']].map(([, l]) => (
              <a key={l} href="#" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

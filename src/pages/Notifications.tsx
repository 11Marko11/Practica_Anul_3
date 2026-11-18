import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { same, useLivePoll } from '../lib/livePoll'
import { getNotifications, markRead, setUnread, type Notification } from '../lib/notifications'

// /notifications: the signed-in user's notification box, newest first. Notifications stay unread
// until the user marks them (one by one or all at once) or opens them.
export function Notifications() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div style={{ minHeight: '80vh' }} />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <NotificationList />
}

function NotificationList() {
  const { lang, t } = useI18n()
  const n = t.notifications
  const navigate = useNavigate()
  const [items, setItems] = useState<Notification[] | null>(null)

  useEffect(() => {
    getNotifications().then(res => setItems(res.notifications)).catch(() => setItems([]))
  }, [])
  // New notifications show without a refresh.
  useLivePoll(() => {
    getNotifications().then(res => setItems(prev => (prev && same(prev, res.notifications) ? prev : res.notifications))).catch(() => {})
  }, 30_000)

  // Marks the given notifications (all of them when none are given) as read, here and on the bell.
  const read = (ids?: string[]) => {
    const marked = (x: Notification) => !ids || ids.includes(x.id)
    const next = (items ?? []).map(x => (marked(x) ? { ...x, read: true } : x))
    setItems(next)
    setUnread(next.filter(x => !x.read).length)
    markRead(ids).catch(() => {})
  }
  const open = (x: Notification) => {
    if (!x.read) read([x.id])
    navigate(x.link!)
  }

  const text = (x: Notification) => {
    const fn = (n.text as Record<string, ((d: never) => string) | undefined>)[x.type]
    return fn ? fn(x.data as never) : x.type
  }
  const time = (iso: string) => new Date(iso).toLocaleString(lang, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const unread = (items ?? []).filter(x => !x.read).length

  return (
    <div style={{ paddingTop: 52 }}>
      <div style={{ padding: '56px 24px 36px', background: '#1c1c1e' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#a1a1a6', margin: '0 0 8px' }}>{n.eyebrow}</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0, lineHeight: 1.05 }}>{n.title}</h1>
          {unread > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
              <p style={{ fontSize: 14, color: '#a1a1a6', margin: 0 }}>{n.unreadLabel(unread)}</p>
              <button onClick={() => read()} style={{ fontSize: 14, fontWeight: 500, padding: '8px 18px', borderRadius: 980, background: '#f5f5f7', color: '#1c1c1e', border: 'none', cursor: 'pointer' }}>{n.markAll}</button>
            </div>
          )}
        </div>
      </div>
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '24px 24px 96px' }}>
        {!items && <p style={{ fontSize: 15, color: '#6e6e73' }}>{t.bookings.loading}</p>}
        {items?.length === 0 && <p style={{ fontSize: 16, color: '#6e6e73', textAlign: 'center', padding: '48px 0' }}>{n.empty}</p>}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items?.map(x => (
            <li key={x.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 18px', borderRadius: 16, background: x.read ? '#f5f5f7' : '#e8f1fd', flexWrap: 'wrap' }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 7, flexShrink: 0, background: x.read ? 'transparent' : '#0071e3' }} />
              <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                <p style={{ fontSize: 15, color: '#1d1d1f', margin: 0, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{text(x)}</p>
                <p style={{ fontSize: 12, color: '#86868b', margin: '4px 0 0' }}>{time(x.createdAt)}</p>
              </div>
              <div className="row-actions">
                {!x.read && <button onClick={() => read([x.id])} className="btn-action btn-action--neutral" style={{ background: '#fff' }}>{n.markOne}</button>}
                {x.link && <button onClick={() => open(x)} className="btn-action btn-action--neutral" style={{ background: '#fff' }}>{n.open}</button>}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

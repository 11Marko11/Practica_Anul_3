// A round profile photo, or the first letter of the name when there is none.
export function Avatar({ name, url, size, background = '#1c1c1e', color = '#fff', className }: {
  name: string
  url?: string | null
  size: number
  background?: string
  color?: string
  className?: string
}) {
  const box: React.CSSProperties = { width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden' }
  if (url) return <img src={url} alt="" className={className} loading="lazy" style={{ ...box, objectFit: 'cover', display: 'block', background: '#e8e8ed' }} />
  return (
    <span className={className} style={{ ...box, background, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.4), fontWeight: 600 }}>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

// Small red counter, e.g. next to "Admin" when bookings wait for confirmation.
export function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#ff3b30', color: '#fff', fontSize: 11, fontWeight: 600, lineHeight: 1 }}>
      {n > 99 ? '99+' : n}
    </span>
  )
}

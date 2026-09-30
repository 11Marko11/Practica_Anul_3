// Dark date input used on the rental listing and the car details booking card.
// It fills its container; wrap pairs in .date-pair to lay them out (see index.css).
export function DateField({ label, value, min, onChange }: {
  label: string
  value: string
  min: string
  onChange: (v: string) => void
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#a1a1a6', minWidth: 0 }}>
      {label}
      <input
        type="date"
        className="date-input"
        value={value}
        min={min}
        onChange={e => e.target.value && onChange(e.target.value)}
        style={{ fontSize: 15, padding: '10px 14px', border: '1px solid #3a3a3d', borderRadius: 12, color: '#f5f5f7', fontFamily: 'inherit', background: '#2a2a2d', colorScheme: 'dark' }}
      />
    </label>
  )
}

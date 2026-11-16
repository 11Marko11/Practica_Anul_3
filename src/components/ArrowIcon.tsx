// Small arrows for buttons: → (opens a page) or ↗ (opens in a new tab).
export function ArrowIcon({ external = false, size = 12 }: { external?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden style={{ flexShrink: 0 }}>
      <path
        d={external ? 'M4.5 9.5 10 4M5.5 4H10v4.5' : 'M3 7h8M7.5 3.5 11 7l-3.5 3.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

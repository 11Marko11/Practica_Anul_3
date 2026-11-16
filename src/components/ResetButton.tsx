// "Reset filters": a light rounded button with a small ×.
export function ResetButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="btn-action btn-action--neutral" style={{ gap: 6 }}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden style={{ flexShrink: 0 }}>
        <path d="M2 2l6 6M8 2 2 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {children}
    </button>
  )
}

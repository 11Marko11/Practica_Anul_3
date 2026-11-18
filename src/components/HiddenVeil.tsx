// Darkens a hidden car's photo and details and writes "Ascunsă" across them; the row's buttons
// stay outside it.
export function HiddenVeil({ label }: { label: string }) {
  return (
    <div className="car-row__veil" aria-hidden="true">
      <span>{label}</span>
    </div>
  )
}

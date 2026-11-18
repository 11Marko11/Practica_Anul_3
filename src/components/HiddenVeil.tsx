// A hidden car's row: the row is darkened (HiddenVeil, first in the row) and "Ascunsă" is written in
// large letters over the car's details (HiddenStamp, inside them); the row's buttons stay on top.
export function HiddenVeil() {
  return <div className="car-row__veil" aria-hidden="true" />
}

export function HiddenStamp({ label }: { label: string }) {
  return <span className="car-row__stamp">{label}</span>
}

import { fmt } from '../lib/rental'

// "260 020 MDL" with a smaller currency label, so large amounts fit their tile.
export function Money({ value }: { value: number }) {
  const [number] = fmt(value).split(' MDL')
  return (
    <>
      {number}
      <span style={{ fontSize: '0.55em', fontWeight: 500, marginLeft: 4 }}>MDL</span>
    </>
  )
}

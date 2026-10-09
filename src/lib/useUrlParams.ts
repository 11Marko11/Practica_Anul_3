import { useRef } from 'react'
import { useSearchParams } from 'react-router'

// URL query parameters that several quick changes can update one after another.
// React Router's own setter starts from the parameters of the last render, so a second
// click before the page re-renders would undo the first; this keeps the pending change.
export function useUrlParams() {
  const [params, setParams] = useSearchParams()
  const pending = useRef<URLSearchParams | null>(null)
  if (pending.current?.toString() === params.toString()) pending.current = null
  const current = pending.current ?? params

  function edit(change: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(pending.current ?? params)
    change(next)
    pending.current = next
    setParams(next, { replace: true })
  }

  return { params: current, edit }
}

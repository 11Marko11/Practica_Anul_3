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

  // Filters replace the history entry; `push` adds one (e.g. a page change, so Back returns to the previous page).
  function edit(change: (next: URLSearchParams) => void, { push = false } = {}) {
    const next = new URLSearchParams(pending.current ?? params)
    change(next)
    pending.current = next
    setParams(next, { replace: !push })
  }

  return { params: current, edit }
}

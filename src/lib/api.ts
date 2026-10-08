// Calls to the Rent Motors API. In development Vite forwards /api to the local server;
// on Vercel, vercel.json forwards it to Render. The session cookie is sent automatically.

// `code` is the server's stable error code (e.g. 'invalid-credentials'), or 'network'
// when the server could not be reached.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code)
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = options.body !== undefined
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? (hasBody ? 'POST' : 'GET'),
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(0, 'network')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? 'unknown')
  return data as T
}

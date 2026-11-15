import { api, ApiError } from './api'

export type PrivateDocument<T extends string = string> = { id: string; type: T; fileName: string; mimeType: string; size: number; createdAt: string }

// Multipart upload of one private document (the JSON helper can't send files): the type, then the file.
export async function uploadPrivateDocument<T extends string>(endpoint: string, type: T, file: File) {
  const form = new FormData()
  form.append('type', type)
  form.append('file', file)
  let res: Response
  try {
    res = await fetch(`/api${endpoint}`, { method: 'POST', body: form, credentials: 'same-origin' })
  } catch {
    throw new ApiError(0, 'network')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? 'unknown')
  return (data as { document: PrivateDocument<T> }).document
}

// Host documents (the request to become a host, and each car's papers) are served to their
// owner and to admins only; the session cookie goes with the request.
export const hostDocumentUrl = (id: string) => `/api/host-documents/${id}/file`

export type HostDocumentType = 'BUSINESS_REGISTRATION' | 'BANK_DETAILS'
export const HOST_DOCUMENT_TYPES: HostDocumentType[] = ['BUSINESS_REGISTRATION', 'BANK_DETAILS']

export type HostApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type HostApplication = {
  status: HostApplicationStatus | null
  message: string | null
  note: string | null
  submittedAt: string | null
  isHost: boolean
  identityVerified: boolean
}
type ApplicationResponse = { application: HostApplication; documents: PrivateDocument<HostDocumentType>[] }

export const getHostApplication = () => api<ApplicationResponse>('/host-application')
export const uploadHostDocument = (type: HostDocumentType, file: File) => uploadPrivateDocument('/host-application/documents', type, file)
export const removeHostDocument = (id: string) => api<ApplicationResponse>(`/host-application/documents/${id}`, { method: 'DELETE' })
export const sendHostApplication = (message: string) => api<ApplicationResponse>('/host-application', { body: { message } })
export const withdrawHostApplication = () => api<ApplicationResponse>('/host-application', { method: 'DELETE' })

import type { VerificationStatus } from '../auth/AuthContext'
import { api, ApiError } from './api'

export type DocumentType = 'DRIVING_LICENSE' | 'ID_CARD' | 'PASSPORT' | 'OTHER'
export const DOCUMENT_TYPES: DocumentType[] = ['DRIVING_LICENSE', 'ID_CARD', 'PASSPORT', 'OTHER']

export type IdentityDocument = { id: string; type: DocumentType; fileName: string; mimeType: string; size: number; createdAt: string }
export type Profile = {
  name: string
  email: string
  phone: string | null
  birthDate: string | null
  verificationStatus: VerificationStatus
  verificationNote: string | null
  verificationSubmittedAt: string | null
  verifiedAt: string | null
}
type ProfileResponse = { profile: Profile; documents: IdentityDocument[] }

export const getProfile = () => api<ProfileResponse>('/profile')
export const updateProfile = (input: { name: string; phone: string; birthDate: string }) => api<ProfileResponse>('/profile', { method: 'PATCH', body: input })
export const changePassword = (current: string, next: string) => api('/profile/password', { body: { current, next } })
export const removeDocument = (id: string) => api<ProfileResponse>(`/profile/documents/${id}`, { method: 'DELETE' })
export const submitVerification = () => api<ProfileResponse>('/profile/verification', { method: 'POST' })

// The file is served only to its owner and admins; the session cookie goes with the request.
export const documentUrl = (id: string) => `/api/documents/${id}/file`

// Multipart upload (the JSON helper can't send files). The type goes first, then the file.
export async function uploadDocument(type: DocumentType, file: File) {
  const form = new FormData()
  form.append('type', type)
  form.append('file', file)
  let res: Response
  try {
    res = await fetch('/api/profile/documents', { method: 'POST', body: form, credentials: 'same-origin' })
  } catch {
    throw new ApiError(0, 'network')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? 'unknown')
  return (data as { document: IdentityDocument }).document
}

// Same rule as the server: a driving licence and an ID card or passport.
export const hasRequiredDocuments = (docs: IdentityDocument[]) =>
  docs.some(d => d.type === 'DRIVING_LICENSE') && docs.some(d => d.type === 'ID_CARD' || d.type === 'PASSPORT')

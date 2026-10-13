import { ApiError } from './api'

const MAX_SIDE = 1600

// Shrinks a photo in the browser (longest side 1600 px, JPEG) so uploads stay small and
// fast, then stores it on our server. Returns the address to use in the car's photos.
export async function uploadPhoto(file: File): Promise<string> {
  const body = new FormData()
  body.append('file', await shrink(file), 'photo.jpg')
  const res = await fetch('/api/photos', { method: 'POST', body, credentials: 'same-origin' })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'unknown')
  return data.url as string
}

async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.85))
}

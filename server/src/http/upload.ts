import type { FastifyRequest } from 'fastify'
import { z } from 'zod'
import { detectType } from '../routes/profile.js'
import { HttpError } from './errors.js'

// One private document from a multipart form: the `type` field, then the `file`. Only JPEG,
// PNG, WebP or PDF, judged by the file's content and not by its name.
export async function readDocumentUpload<T extends string>(request: FastifyRequest, types: readonly [T, ...T[]]) {
  let type: string | undefined
  let file: { name: string; data: Buffer } | undefined
  for await (const part of request.parts()) {
    if (part.type === 'field' && part.fieldname === 'type') type = String(part.value)
    if (part.type === 'file' && part.fieldname === 'file') {
      const data = await part.toBuffer()
      if (part.file.truncated) throw new HttpError(413, 'file-too-large')
      file = { name: part.filename.slice(0, 200) || 'document', data }
    }
  }
  const parsedType = z.enum(types).safeParse(type)
  if (!parsedType.success || !file) throw new HttpError(400, 'validation')
  const mimeType = detectType(file.data)
  if (!mimeType) throw new HttpError(415, 'unsupported-file')
  return { type: parsedType.data as T, fileName: file.name, mimeType, size: file.data.length, data: new Uint8Array(file.data) }
}

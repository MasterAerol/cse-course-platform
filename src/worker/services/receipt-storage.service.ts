import { AppError } from '../utils/app-error'

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024
export const RECEIPT_REQUEST_MAX_BYTES = RECEIPT_MAX_BYTES + 256 * 1024

const RECEIPT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

function encodeHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export function requirePaymentReceiptsBucket(
  bucket: R2Bucket | undefined,
): R2Bucket {
  if (bucket === undefined) {
    throw new AppError(
      503,
      'RECEIPT_STORAGE_UNAVAILABLE',
      'Payment receipt storage is not configured.',
    )
  }
  return bucket
}

export async function storePaymentReceipt(
  bucket: R2Bucket,
  input: {
    file: File
    learnerPublicId: string
    paymentRequestPublicId: string
  },
): Promise<{
  key: string
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
  size: number
  sha256: string
}> {
  if (!RECEIPT_MIME_TYPES.has(input.file.type)) {
    throw new AppError(
      400,
      'UNSUPPORTED_RECEIPT_TYPE',
      'Upload a JPEG, PNG, or WebP receipt image.',
    )
  }
  if (input.file.size <= 0 || input.file.size > RECEIPT_MAX_BYTES) {
    throw new AppError(
      413,
      'RECEIPT_TOO_LARGE',
      'Receipt images must be no larger than 5 MB.',
    )
  }

  const data = await input.file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', data)
  const contentType = input.file.type as
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp'
  const key = [
    'payment-receipts',
    input.learnerPublicId,
    input.paymentRequestPublicId,
    crypto.randomUUID(),
  ].join('/')

  await bucket.put(key, data, {
    httpMetadata: {
      contentType,
      cacheControl: 'private, no-store',
    },
    customMetadata: {
      purpose: 'payment-receipt',
      paymentRequestId: input.paymentRequestPublicId,
    },
    sha256: digest,
  })

  return {
    key,
    contentType,
    size: input.file.size,
    sha256: encodeHex(digest),
  }
}

export async function storePaymentMethodQr(
  bucket: R2Bucket,
  input: { file: File; paymentMethodPublicId: string },
): Promise<string> {
  if (!RECEIPT_MIME_TYPES.has(input.file.type)) {
    throw new AppError(
      400,
      'UNSUPPORTED_QR_TYPE',
      'Upload a JPEG, PNG, or WebP QR image.',
    )
  }
  if (input.file.size <= 0 || input.file.size > RECEIPT_MAX_BYTES) {
    throw new AppError(
      413,
      'QR_IMAGE_TOO_LARGE',
      'QR images must be no larger than 5 MB.',
    )
  }

  const data = await input.file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', data)
  const contentType = input.file.type as
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp'
  const key = [
    'payment-method-qr',
    input.paymentMethodPublicId,
    crypto.randomUUID(),
  ].join('/')
  await bucket.put(key, data, {
    httpMetadata: {
      contentType,
      cacheControl: 'private, no-store',
    },
    customMetadata: {
      purpose: 'payment-method-qr',
      paymentMethodId: input.paymentMethodPublicId,
    },
    sha256: digest,
  })
  return key
}

export async function deletePrivateObject(
  bucket: R2Bucket,
  key: string,
): Promise<void> {
  await bucket.delete(key)
}

export async function getPrivateImage(
  bucket: R2Bucket,
  key: string,
): Promise<Response> {
  if (
    key.length === 0 ||
    key.startsWith('/') ||
    key.includes('..') ||
    key.includes('\\')
  ) {
    throw new AppError(400, 'INVALID_OBJECT_KEY', 'Invalid receipt object key.')
  }

  const object = await bucket.get(key)
  if (object === null) {
    throw new AppError(404, 'RECEIPT_NOT_FOUND', 'Receipt image not found.')
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('cache-control', 'private, no-store')
  headers.set('content-security-policy', "default-src 'none'; sandbox")
  headers.set('content-disposition', 'inline')
  headers.set('etag', object.httpEtag)
  headers.set('x-content-type-options', 'nosniff')

  return new Response(object.body, { headers })
}

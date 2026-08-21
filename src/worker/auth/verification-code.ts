const VERIFICATION_CODE_MAXIMUM = 1_000_000
const RANDOM_ACCEPTANCE_LIMIT = Math.floor(0x1_0000_0000 / VERIFICATION_CODE_MAXIMUM) * VERIFICATION_CODE_MAXIMUM
const encoder = new TextEncoder()

export const REGISTRATION_VERIFICATION_PURPOSE =
  'EMAIL_REGISTRATION_VERIFICATION'
export const VERIFICATION_CODE_DIGITS = 6

function encodeHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export function createVerificationCode(): string {
  const random = new Uint32Array(1)
  do {
    crypto.getRandomValues(random)
  } while ((random[0] ?? 0) >= RANDOM_ACCEPTANCE_LIMIT)

  return String((random[0] ?? 0) % VERIFICATION_CODE_MAXIMUM).padStart(
    VERIFICATION_CODE_DIGITS,
    '0',
  )
}

export async function hashVerificationCode(
  secret: string,
  registrationId: string,
  code: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(
      `${REGISTRATION_VERIFICATION_PURPOSE}:${registrationId}:${code}`,
    ),
  )
  return encodeHex(digest)
}

export function verificationCodeMatches(
  candidateHash: string,
  expectedHash: string,
): boolean {
  if (
    candidateHash.length !== expectedHash.length ||
    !/^[0-9a-f]+$/u.test(candidateHash) ||
    !/^[0-9a-f]+$/u.test(expectedHash)
  ) {
    return false
  }

  const candidate = Uint8Array.from(
    candidateHash.match(/.{2}/gu) ?? [],
    (value) => Number.parseInt(value, 16),
  )
  const expected = Uint8Array.from(
    expectedHash.match(/.{2}/gu) ?? [],
    (value) => Number.parseInt(value, 16),
  )
  return crypto.subtle.timingSafeEqual(candidate, expected)
}

export function maskEmailAddress(email: string): string {
  const separator = email.lastIndexOf('@')
  if (separator <= 0) return '••••'
  const local = email.slice(0, separator)
  const domain = email.slice(separator + 1)
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${'•'.repeat(Math.max(3, Math.min(6, local.length)))}@${domain}`
}

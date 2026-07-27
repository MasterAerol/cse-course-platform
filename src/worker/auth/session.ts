const SESSION_TOKEN_BYTES = 32
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

const encoder = new TextEncoder()

export interface SessionCredentials {
  token: string
  tokenHash: string
  expiresAt: Date
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
}

function encodeHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token))
  return encodeHex(digest)
}

export async function createSessionCredentials(
  now = new Date(),
): Promise<SessionCredentials> {
  const tokenBytes = crypto.getRandomValues(
    new Uint8Array(SESSION_TOKEN_BYTES),
  )
  const token = encodeBase64Url(tokenBytes)
  const tokenHash = await hashSessionToken(token)

  return {
    token,
    tokenHash,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
  }
}

const PASSWORD_HASH_ALGORITHM = 'pbkdf2-sha256'
const PASSWORD_HASH_VERSION = 'v1'
const PASSWORD_HASH_ITERATIONS = 100_000
const PASSWORD_HASH_MAX_ITERATIONS = 100_000
const PASSWORD_SALT_BYTES = 16
const PASSWORD_HASH_BYTES = 32

const encoder = new TextEncoder()

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

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    return null
  }

  const paddingLength = (4 - (value.length % 4)) % 4
  const base64 = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(value.length + paddingLength, '=')

  try {
    const binary = atob(base64)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations,
    },
    passwordKey,
    PASSWORD_HASH_BYTES * 8,
  )

  return new Uint8Array(derivedBits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES))
  const hash = await derivePasswordHash(
    password,
    salt,
    PASSWORD_HASH_ITERATIONS,
  )

  return [
    PASSWORD_HASH_ALGORITHM,
    PASSWORD_HASH_VERSION,
    PASSWORD_HASH_ITERATIONS.toString(),
    encodeBase64Url(salt),
    encodeBase64Url(hash),
  ].join('$')
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split('$')

  if (parts.length !== 5) {
    return false
  }

  const [algorithm, version, iterationValue, saltValue, hashValue] = parts
  const iterations = Number(iterationValue)

  if (
    algorithm !== PASSWORD_HASH_ALGORITHM ||
    version !== PASSWORD_HASH_VERSION ||
    !Number.isSafeInteger(iterations) ||
    iterations < PASSWORD_HASH_ITERATIONS ||
    iterations > PASSWORD_HASH_MAX_ITERATIONS ||
    saltValue === undefined ||
    hashValue === undefined
  ) {
    return false
  }

  const salt = decodeBase64Url(saltValue)
  const expectedHash = decodeBase64Url(hashValue)

  if (
    salt?.byteLength !== PASSWORD_SALT_BYTES ||
    expectedHash?.byteLength !== PASSWORD_HASH_BYTES
  ) {
    return false
  }

  const candidateHash = await derivePasswordHash(password, salt, iterations)

  return crypto.subtle.timingSafeEqual(candidateHash, expectedHash)
}

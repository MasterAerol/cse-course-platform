import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose'

import { emailSchema } from '../schemas/auth.schemas'
import { AppError } from '../utils/app-error'

const GOOGLE_ISSUERS = [
  'https://accounts.google.com',
  'accounts.google.com',
] as const
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
)

export interface VerifiedGoogleIdentity {
  subject: string
  email: string
  firstName: string
  lastName: string
}

function invalidGoogleCredential(): AppError {
  return new AppError(
    401,
    'GOOGLE_CREDENTIAL_INVALID',
    'Google authentication could not be verified. Please try again.',
  )
}

function requiredText(value: unknown, maximumLength: number): string {
  if (typeof value !== 'string') throw invalidGoogleCredential()
  const normalized = value.trim()
  if (normalized.length === 0 || normalized.length > maximumLength) {
    throw invalidGoogleCredential()
  }
  return normalized
}

function optionalName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length === 0 ? null : normalized.slice(0, 80)
}

function googleProfileNames(payload: Record<string, unknown>): {
  firstName: string
  lastName: string
} {
  const displayName = optionalName(payload.name)
  const displayParts = displayName?.split(/\s+/u) ?? []
  const firstName = optionalName(payload.given_name) ?? displayParts[0] ?? 'Google'
  const lastName = optionalName(payload.family_name)
    ?? (displayParts.length > 1
      ? displayParts.slice(1).join(' ').slice(0, 80)
      : 'Learner')
  return { firstName, lastName }
}

export async function verifyGoogleIdToken(
  credential: string,
  clientId: string,
  keySet: JWTVerifyGetKey = GOOGLE_JWKS,
  now?: Date,
): Promise<VerifiedGoogleIdentity> {
  try {
    const { payload } = await jwtVerify(credential, keySet, {
      algorithms: ['RS256'],
      audience: clientId,
      issuer: [...GOOGLE_ISSUERS],
      requiredClaims: [
        'aud',
        'email',
        'email_verified',
        'exp',
        'iat',
        'iss',
        'sub',
      ],
      currentDate: now,
    })
    if (payload.email_verified !== true) throw invalidGoogleCredential()

    const subject = requiredText(payload.sub, 255)
    const parsedEmail = emailSchema.safeParse(payload.email)
    if (!parsedEmail.success) throw invalidGoogleCredential()

    return {
      subject,
      email: parsedEmail.data,
      ...googleProfileNames(payload),
    }
  } catch (error: unknown) {
    if (error instanceof AppError) throw error
    throw invalidGoogleCredential()
  }
}

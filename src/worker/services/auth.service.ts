import { createSessionCredentials, hashSessionToken } from '../auth/session'
import { hashPassword, verifyPassword } from '../auth/password'
import {
  createSession,
  createUserWithSession,
  findActiveSessionPrincipal,
  findUserByEmail,
  revokeSessionByTokenHash,
  revokeSessionsForUser,
} from '../repositories/auth.repository'
import type {
  LoginInput,
  RegistrationInput,
} from '../schemas/auth.schemas'
import type {
  AuthenticatedPrincipal,
  PublicUser,
  SessionMetadata,
  UserRecord,
} from '../types/auth'
import { AppError } from '../utils/app-error'

export interface AuthenticatedSessionResult {
  user: PublicUser
  sessionToken: string
  expiresAt: Date
}

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.publicId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  }
}

export function getPublicUser(
  principal: AuthenticatedPrincipal,
): PublicUser {
  return {
    id: principal.id,
    email: principal.email,
    firstName: principal.firstName,
    lastName: principal.lastName,
    role: principal.role,
  }
}

function invalidCredentialsError(): AppError {
  return new AppError(
    401,
    'INVALID_CREDENTIALS',
    'Invalid email or password.',
  )
}

export async function registerStudent(
  database: D1Database,
  input: RegistrationInput,
  metadata: SessionMetadata,
): Promise<AuthenticatedSessionResult> {
  const existingUser = await findUserByEmail(database, input.email)

  if (existingUser !== null) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_REGISTERED',
      'An account with this email already exists.',
    )
  }

  const [passwordHash, session] = await Promise.all([
    hashPassword(input.password),
    createSessionCredentials(),
  ])
  const publicId = crypto.randomUUID()

  let user: UserRecord | null

  try {
    user = await createUserWithSession(database, {
      publicId,
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt.toISOString(),
      metadata,
    })
  } catch (error: unknown) {
    const duplicateUser = await findUserByEmail(database, input.email)

    if (duplicateUser !== null) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists.',
      )
    }

    throw error
  }

  if (user === null) {
    throw new Error('The registered user could not be loaded.')
  }

  return {
    user: toPublicUser(user),
    sessionToken: session.token,
    expiresAt: session.expiresAt,
  }
}

export async function loginUser(
  database: D1Database,
  input: LoginInput,
  metadata: SessionMetadata,
): Promise<AuthenticatedSessionResult> {
  const user = await findUserByEmail(database, input.email)

  if (user === null) {
    await hashPassword(input.password)
    throw invalidCredentialsError()
  }

  const passwordMatches = await verifyPassword(
    input.password,
    user.passwordHash,
  )

  if (!passwordMatches) {
    throw invalidCredentialsError()
  }

  if (user.status === 'suspended') {
    await revokeSessionsForUser(database, user.id)
    throw new AppError(
      403,
      'ACCOUNT_SUSPENDED',
      'This account is suspended.',
    )
  }

  const session = await createSessionCredentials()

  await createSession(database, {
    userId: user.id,
    tokenHash: session.tokenHash,
    expiresAt: session.expiresAt.toISOString(),
    metadata,
  })

  return {
    user: toPublicUser(user),
    sessionToken: session.token,
    expiresAt: session.expiresAt,
  }
}

export async function authenticateSession(
  database: D1Database,
  token: string,
): Promise<AuthenticatedPrincipal> {
  const tokenHash = await hashSessionToken(token)
  const principal = await findActiveSessionPrincipal(database, tokenHash)

  if (principal === null) {
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      'Authentication is required.',
    )
  }

  if (principal.status === 'suspended') {
    await revokeSessionsForUser(database, principal.internalUserId)
    throw new AppError(
      403,
      'ACCOUNT_SUSPENDED',
      'This account is suspended.',
    )
  }

  return {
    internalUserId: principal.internalUserId,
    id: principal.id,
    email: principal.email,
    firstName: principal.firstName,
    lastName: principal.lastName,
    role: principal.role,
  }
}

export async function logoutSession(
  database: D1Database,
  token: string,
): Promise<void> {
  const tokenHash = await hashSessionToken(token)
  await revokeSessionByTokenHash(database, tokenHash)
}

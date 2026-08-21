import { hashPassword, verifyPassword } from '../auth/password'
import { createSessionCredentials, hashSessionToken } from '../auth/session'
import type { VerifiedGoogleIdentity } from '../auth/google'
import {
  createUserWithSession,
  findUserByEmail,
  findUserByGoogleSubject,
  findUserById,
  linkGoogleIdentity,
  revokeSessionByTokenHash,
  revokeSessionsForUser,
  updatePasswordAndRevokeOtherSessions,
} from '../repositories/auth.repository'
import { findCourseIdBySlug } from '../repositories/course.repository'
import {
  createLatestSession,
  findSessionPrincipal,
} from '../repositories/commercial-session.repository'
import type {
  ChangePasswordInput,
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
import { recordLearnerActivity } from './commercial.service'

const CSE_PROFESSIONAL_SLUG = 'cse-professional'

export interface AuthenticatedSessionResult {
  user: PublicUser
  sessionToken: string
  expiresAt: Date
}

interface CreateStudentAccountInput {
  email: string
  passwordHash: string | null
  firstName: string
  lastName: string
  emailVerifiedAt: string | null
  googleSubject: string | null
}

export interface GoogleAuthenticationOptions {
  registrationEnabled: boolean
  beforeCreate?: () => Promise<void>
}

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.publicId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    signInMethods: {
      hasPassword: user.passwordHash !== null,
      googleConnected: user.hasGoogleIdentity,
    },
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
    signInMethods: principal.signInMethods,
  }
}

function invalidCredentialsError(): AppError {
  return new AppError(
    401,
    'INVALID_CREDENTIALS',
    'Invalid email or password.',
  )
}

function registrationClosedError(): AppError {
  return new AppError(
    403,
    'REGISTRATION_CLOSED',
    'Registration is currently closed.',
  )
}

function googleLinkingRequiredError(): AppError {
  return new AppError(
    409,
    'GOOGLE_ACCOUNT_LINKING_REQUIRED',
    'An account already uses this email. Sign in with your password, then connect Google from Profile & Account.',
  )
}

async function assertUserCanSignIn(
  database: D1Database,
  user: UserRecord,
): Promise<void> {
  if (user.status === 'suspended') {
    await revokeSessionsForUser(database, user.id)
    throw new AppError(
      403,
      'ACCOUNT_SUSPENDED',
      'This account is suspended.',
    )
  }
}

async function createStudentAccount(
  database: D1Database,
  input: CreateStudentAccountInput,
  metadata: SessionMetadata,
): Promise<AuthenticatedSessionResult> {
  const courseId = await findCourseIdBySlug(database, CSE_PROFESSIONAL_SLUG)
  if (courseId === null) {
    throw new AppError(
      409,
      'REGISTRATION_COURSE_UNAVAILABLE',
      'Student registration is temporarily unavailable.',
    )
  }

  const session = await createSessionCredentials()
  const user = await createUserWithSession(database, {
    publicId: crypto.randomUUID(),
    email: input.email,
    passwordHash: input.passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    emailVerifiedAt: input.emailVerifiedAt,
    googleSubject: input.googleSubject,
    tokenHash: session.tokenHash,
    expiresAt: session.expiresAt.toISOString(),
    metadata,
    courseId: courseId.id,
  })

  if (user === null) {
    throw new Error('The registered user could not be loaded.')
  }

  return {
    user: toPublicUser(user),
    sessionToken: session.token,
    expiresAt: session.expiresAt,
  }
}

async function startLatestUserSession(
  database: D1Database,
  user: UserRecord,
  metadata: SessionMetadata,
): Promise<AuthenticatedSessionResult> {
  await assertUserCanSignIn(database, user)
  const session = await createSessionCredentials()

  await createLatestSession(database, {
    userId: user.id,
    role: user.role,
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

  const passwordHash = await hashPassword(input.password)

  try {
    return await createStudentAccount(database, {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      emailVerifiedAt: null,
      googleSubject: null,
    }, metadata)
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
}

export async function loginUser(
  database: D1Database,
  input: LoginInput,
  metadata: SessionMetadata,
): Promise<AuthenticatedSessionResult> {
  const user = await findUserByEmail(database, input.email)

  if (user === null || user.passwordHash === null) {
    await hashPassword(input.password)
    throw invalidCredentialsError()
  }

  const passwordMatches = await verifyPassword(
    input.password,
    user.passwordHash,
  )
  if (!passwordMatches) throw invalidCredentialsError()

  return startLatestUserSession(database, user, metadata)
}

export async function authenticateWithGoogle(
  database: D1Database,
  identity: VerifiedGoogleIdentity,
  metadata: SessionMetadata,
  options: GoogleAuthenticationOptions,
): Promise<AuthenticatedSessionResult> {
  const linkedUser = await findUserByGoogleSubject(database, identity.subject)
  if (linkedUser !== null) {
    return startLatestUserSession(database, linkedUser, metadata)
  }

  if (await findUserByEmail(database, identity.email) !== null) {
    throw googleLinkingRequiredError()
  }

  if (!options.registrationEnabled) throw registrationClosedError()
  await options.beforeCreate?.()

  try {
    return await createStudentAccount(database, {
      email: identity.email,
      passwordHash: null,
      firstName: identity.firstName,
      lastName: identity.lastName,
      emailVerifiedAt: new Date().toISOString(),
      googleSubject: identity.subject,
    }, metadata)
  } catch (error: unknown) {
    const racedIdentity = await findUserByGoogleSubject(
      database,
      identity.subject,
    )
    if (racedIdentity !== null) {
      return startLatestUserSession(database, racedIdentity, metadata)
    }
    if (await findUserByEmail(database, identity.email) !== null) {
      throw googleLinkingRequiredError()
    }
    throw error
  }
}

export async function connectGoogleIdentity(
  database: D1Database,
  principal: AuthenticatedPrincipal,
  identity: VerifiedGoogleIdentity,
): Promise<PublicUser> {
  const user = await findUserById(database, principal.internalUserId)
  if (user === null || user.publicId !== principal.id) {
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      'Authentication is required.',
    )
  }
  await assertUserCanSignIn(database, user)

  if (identity.email !== user.email.toLowerCase()) {
    throw new AppError(
      409,
      'GOOGLE_EMAIL_MISMATCH',
      'Choose the Google account that uses the same email as your PasaWise account.',
    )
  }

  const subjectOwner = await findUserByGoogleSubject(database, identity.subject)
  if (subjectOwner !== null) {
    if (subjectOwner.id === user.id) return toPublicUser(subjectOwner)
    throw new AppError(
      409,
      'GOOGLE_IDENTITY_ALREADY_LINKED',
      'This Google account is already connected to another PasaWise account.',
    )
  }

  if (user.hasGoogleIdentity) {
    throw new AppError(
      409,
      'GOOGLE_METHOD_ALREADY_CONNECTED',
      'A Google account is already connected to this PasaWise account.',
    )
  }

  try {
    await linkGoogleIdentity(database, user.id, identity.subject)
  } catch (error: unknown) {
    const racedOwner = await findUserByGoogleSubject(database, identity.subject)
    if (racedOwner?.id === user.id) return toPublicUser(racedOwner)
    if (racedOwner !== null) {
      throw new AppError(
        409,
        'GOOGLE_IDENTITY_ALREADY_LINKED',
        'This Google account is already connected to another PasaWise account.',
      )
    }
    throw error
  }

  const updatedUser = await findUserById(database, user.id)
  if (updatedUser === null) throw new Error('The connected account could not be loaded.')
  return toPublicUser(updatedUser)
}

export async function authenticateSession(
  database: D1Database,
  token: string,
): Promise<AuthenticatedPrincipal> {
  const tokenHash = await hashSessionToken(token)
  const session = await findSessionPrincipal(database, tokenHash)

  if (session === null || !session.active) {
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      'Authentication is required.',
    )
  }

  if (session.replaced) {
    throw new AppError(
      401,
      'SESSION_REPLACED',
      'Your learner account was signed in on another device.',
    )
  }

  const { principal } = session
  if (principal.status === 'suspended') {
    await revokeSessionsForUser(database, principal.internalUserId)
    throw new AppError(
      403,
      'ACCOUNT_SUSPENDED',
      'This account is suspended.',
    )
  }

  const authenticatedPrincipal: AuthenticatedPrincipal = {
    internalUserId: principal.internalUserId,
    id: principal.id,
    email: principal.email,
    firstName: principal.firstName,
    lastName: principal.lastName,
    role: principal.role,
    signInMethods: principal.signInMethods,
  }
  await recordLearnerActivity(database, authenticatedPrincipal, tokenHash)
  return authenticatedPrincipal
}

export async function changePassword(
  database: D1Database,
  principal: AuthenticatedPrincipal,
  currentSessionToken: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await findUserById(database, principal.internalUserId)
  if (user === null || user.publicId !== principal.id) {
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      'Authentication is required.',
    )
  }
  if (user.passwordHash === null) {
    throw new AppError(
      409,
      'PASSWORD_NOT_CONFIGURED',
      'This account does not have a password. Continue with Google to sign in.',
    )
  }

  const currentPasswordMatches = await verifyPassword(
    input.currentPassword,
    user.passwordHash,
  )
  if (!currentPasswordMatches) {
    throw new AppError(
      400,
      'CURRENT_PASSWORD_INCORRECT',
      'The current password is incorrect.',
    )
  }

  const [passwordHash, currentTokenHash] = await Promise.all([
    hashPassword(input.newPassword),
    hashSessionToken(currentSessionToken),
  ])

  await updatePasswordAndRevokeOtherSessions(database, {
    userId: user.id,
    passwordHash,
    currentTokenHash,
  })
}

export async function logoutSession(
  database: D1Database,
  token: string,
): Promise<void> {
  const tokenHash = await hashSessionToken(token)
  await revokeSessionByTokenHash(database, tokenHash)
}

import { hashPassword, verifyPassword } from '../auth/password'
import { createSessionCredentials, hashSessionToken } from '../auth/session'
import type { VerifiedGoogleIdentity } from '../auth/google'
import {
  createVerificationCode,
  hashVerificationCode,
  maskEmailAddress,
  verificationCodeMatches,
} from '../auth/verification-code'
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
import {
  deleteExpiredPendingRegistrations,
  findPendingRegistrationByEmail,
  findPendingRegistrationByPublicId,
  invalidatePendingVerificationCode,
  recordFailedVerificationAttempt,
  replacePendingVerificationCode,
  savePendingRegistration,
  type PendingRegistrationRecord,
} from '../repositories/pending-registration.repository'
import { findCourseIdBySlug } from '../repositories/course.repository'
import {
  createLatestSession,
  findSessionPrincipal,
} from '../repositories/commercial-session.repository'
import type {
  ChangePasswordInput,
  LoginInput,
  RegistrationInput,
  ResendRegistrationVerificationInput,
  VerifyRegistrationEmailInput,
} from '../schemas/auth.schemas'
import type {
  AuthenticatedPrincipal,
  EmailVerificationMethod,
  PublicUser,
  SessionMetadata,
  UserRecord,
} from '../types/auth'
import { AppError } from '../utils/app-error'
import { recordLearnerActivity } from './commercial.service'
import type { TransactionalEmailService } from './transactional-email.service'

const CSE_PROFESSIONAL_SLUG = 'cse-professional'
const VERIFICATION_CODE_DURATION_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const PENDING_REGISTRATION_DURATION_MS = 24 * 60 * 60 * 1000
const MAXIMUM_VERIFICATION_ATTEMPTS = 5

export interface AuthenticatedSessionResult {
  user: PublicUser
  sessionToken: string
  expiresAt: Date
}

export interface PendingRegistrationResult {
  registrationId: string
  maskedEmail: string
  codeExpiresAt: string
  resendAvailableAt: string
}

interface CreateStudentAccountInput {
  email: string
  passwordHash: string | null
  firstName: string
  lastName: string
  emailVerifiedAt: string | null
  emailVerificationMethod: EmailVerificationMethod
  googleSubject: string | null
  pendingRegistration?: {
    id: number
    codeHash: string
    verifiedAt: string
  }
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
    emailVerification: {
      verified: user.emailVerifiedAt !== null,
      method: user.emailVerificationMethod,
    },
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
    emailVerification: principal.emailVerification,
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
    emailVerificationMethod: input.emailVerificationMethod,
    googleSubject: input.googleSubject,
    pendingRegistration: input.pendingRegistration,
    tokenHash: session.tokenHash,
    expiresAt: session.expiresAt.toISOString(),
    metadata,
    courseId: courseId.id,
  })

  if (user === null) {
    if (input.pendingRegistration !== undefined) {
      throw new AppError(
        409,
        'VERIFICATION_CODE_CHANGED',
        'This verification code is no longer current. Enter the latest code.',
      )
    }
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

function pendingRegistrationResult(
  pending: PendingRegistrationRecord,
): PendingRegistrationResult {
  return {
    registrationId: pending.publicId,
    maskedEmail: maskEmailAddress(pending.email),
    codeExpiresAt: pending.codeExpiresAt,
    resendAvailableAt: pending.resendAvailableAt,
  }
}

function verificationUnavailableError(): AppError {
  return new AppError(
    503,
    'EMAIL_VERIFICATION_UNAVAILABLE',
    'Email verification is temporarily unavailable. Please try again later.',
  )
}

function verificationNotFoundError(): AppError {
  return new AppError(
    404,
    'VERIFICATION_NOT_FOUND',
    'This verification request is no longer available. Start registration again.',
  )
}

function ensurePendingRegistrationIsActive(
  pending: PendingRegistrationRecord,
  now: Date,
): void {
  if (Date.parse(pending.pendingExpiresAt) <= now.getTime()) {
    throw verificationNotFoundError()
  }
}

async function sendVerificationCode(
  database: D1Database,
  emailService: TransactionalEmailService,
  pending: PendingRegistrationRecord,
  code: string,
  now: Date,
): Promise<void> {
  try {
    await emailService.sendRegistrationVerificationCode({
      to: pending.email,
      firstName: pending.firstName,
      code,
      expiresInMinutes: VERIFICATION_CODE_DURATION_MS / 60_000,
    })
  } catch (error: unknown) {
    await invalidatePendingVerificationCode(
      database,
      pending.id,
      pending.codeHash,
      now.toISOString(),
    )
    console.error(JSON.stringify({
      message: 'Transactional verification email failed',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
    throw verificationUnavailableError()
  }
}

export async function beginPasswordRegistration(
  database: D1Database,
  input: RegistrationInput,
  emailService: TransactionalEmailService,
  verificationSecret: string,
  now = new Date(),
): Promise<PendingRegistrationResult> {
  await deleteExpiredPendingRegistrations(database, now.toISOString())
  if (await findUserByEmail(database, input.email) !== null) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_REGISTERED',
      'An account with this email already exists.',
    )
  }

  const registrationId = crypto.randomUUID()
  const code = createVerificationCode()
  const [passwordHash, codeHash] = await Promise.all([
    hashPassword(input.password),
    hashVerificationCode(verificationSecret, registrationId, code),
  ])
  const sentAt = now.toISOString()
  const pending = await savePendingRegistration(database, {
    publicId: registrationId,
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    codeHash,
    codeExpiresAt: new Date(
      now.getTime() + VERIFICATION_CODE_DURATION_MS,
    ).toISOString(),
    resendAvailableAt: new Date(
      now.getTime() + RESEND_COOLDOWN_MS,
    ).toISOString(),
    pendingExpiresAt: new Date(
      now.getTime() + PENDING_REGISTRATION_DURATION_MS,
    ).toISOString(),
    sentAt,
  })

  await sendVerificationCode(database, emailService, pending, code, now)
  return pendingRegistrationResult(pending)
}

export async function resendPasswordRegistrationVerification(
  database: D1Database,
  input: ResendRegistrationVerificationInput,
  emailService: TransactionalEmailService,
  verificationSecret: string,
  now = new Date(),
): Promise<PendingRegistrationResult> {
  await deleteExpiredPendingRegistrations(database, now.toISOString())
  const pending = await findPendingRegistrationByPublicId(
    database,
    input.registrationId,
  )
  if (pending === null) throw verificationNotFoundError()
  ensurePendingRegistrationIsActive(pending, now)

  if (Date.parse(pending.resendAvailableAt) > now.getTime()) {
    throw new AppError(
      429,
      'VERIFICATION_RESEND_TOO_SOON',
      'Please wait before requesting another verification code.',
    )
  }

  const code = createVerificationCode()
  const codeHash = await hashVerificationCode(
    verificationSecret,
    pending.publicId,
    code,
  )
  const sentAt = now.toISOString()
  const codeExpiresAt = new Date(
    now.getTime() + VERIFICATION_CODE_DURATION_MS,
  ).toISOString()
  const resendAvailableAt = new Date(
    now.getTime() + RESEND_COOLDOWN_MS,
  ).toISOString()
  const pendingExpiresAt = pending.pendingExpiresAt

  await replacePendingVerificationCode(database, {
    pendingId: pending.id,
    codeHash,
    codeExpiresAt,
    resendAvailableAt,
    pendingExpiresAt,
    sentAt,
  })
  const updated = {
    ...pending,
    codeHash,
    codeExpiresAt,
    attemptCount: 0,
    resendAvailableAt,
    pendingExpiresAt,
    lastSentAt: sentAt,
  }
  await sendVerificationCode(database, emailService, updated, code, now)
  return pendingRegistrationResult(updated)
}

export async function verifyPasswordRegistration(
  database: D1Database,
  input: VerifyRegistrationEmailInput,
  metadata: SessionMetadata,
  verificationSecret: string,
  now = new Date(),
): Promise<AuthenticatedSessionResult> {
  await deleteExpiredPendingRegistrations(database, now.toISOString())
  const pending = await findPendingRegistrationByPublicId(
    database,
    input.registrationId,
  )
  if (pending === null) throw verificationNotFoundError()
  ensurePendingRegistrationIsActive(pending, now)

  if (pending.attemptCount >= MAXIMUM_VERIFICATION_ATTEMPTS) {
    throw new AppError(
      429,
      'VERIFICATION_ATTEMPTS_EXCEEDED',
      'Too many incorrect codes. Request a new verification code.',
    )
  }
  if (Date.parse(pending.codeExpiresAt) <= now.getTime()) {
    throw new AppError(
      400,
      'VERIFICATION_CODE_EXPIRED',
      'This verification code has expired. Request a new code.',
    )
  }

  const candidateHash = await hashVerificationCode(
    verificationSecret,
    pending.publicId,
    input.code,
  )
  if (!verificationCodeMatches(candidateHash, pending.codeHash)) {
    const attempts = await recordFailedVerificationAttempt(
      database,
      pending.id,
      pending.codeHash,
      now.toISOString(),
    )
    if (attempts === null) {
      throw new AppError(
        409,
        'VERIFICATION_CODE_CHANGED',
        'This verification code is no longer current. Enter the latest code.',
      )
    }
    if (attempts >= MAXIMUM_VERIFICATION_ATTEMPTS) {
      throw new AppError(
        429,
        'VERIFICATION_ATTEMPTS_EXCEEDED',
        'Too many incorrect codes. Request a new verification code.',
      )
    }
    throw new AppError(
      400,
      'VERIFICATION_CODE_INVALID',
      'The code is incorrect. Check the six digits and try again.',
    )
  }

  if (await findUserByEmail(database, pending.email) !== null) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_REGISTERED',
      'An account with this email already exists. Sign in instead.',
    )
  }

  try {
    return await createStudentAccount(database, {
      email: pending.email,
      passwordHash: pending.passwordHash,
      firstName: pending.firstName,
      lastName: pending.lastName,
      emailVerifiedAt: now.toISOString(),
      emailVerificationMethod: 'email_otp',
      googleSubject: null,
      pendingRegistration: {
        id: pending.id,
        codeHash: pending.codeHash,
        verifiedAt: now.toISOString(),
      },
    }, metadata)
  } catch (error: unknown) {
    if (await findUserByEmail(database, pending.email) !== null) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists. Sign in instead.',
      )
    }
    throw error
  }
}

export async function createVerifiedPasswordStudent(
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
      emailVerifiedAt: new Date().toISOString(),
      emailVerificationMethod: 'email_otp',
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

  if (user === null) {
    const pending = await findPendingRegistrationByEmail(
      database,
      input.email,
    )
    if (
      pending !== null &&
      Date.parse(pending.pendingExpiresAt) > Date.now() &&
      await verifyPassword(input.password, pending.passwordHash)
    ) {
      throw new AppError(
        403,
        'EMAIL_VERIFICATION_REQUIRED',
        'Verify your email before signing in.',
        { verification: pendingRegistrationResult(pending) },
      )
    }

    await hashPassword(input.password)
    throw invalidCredentialsError()
  }

  if (user.passwordHash === null) {
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
      emailVerificationMethod: 'google',
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
      `That Google account does not match ${maskEmailAddress(user.email)}.`,
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
    emailVerification: principal.emailVerification,
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

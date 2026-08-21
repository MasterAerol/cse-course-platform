import type {
  AuthenticatedPrincipal,
  EmailVerificationMethod,
  SessionMetadata,
  UserRecord,
  UserRole,
  UserStatus,
} from '../types/auth'

interface UserRow {
  id: number
  public_id: string
  email: string
  password_hash: string | null
  first_name: string
  last_name: string
  role: UserRole
  status: UserStatus
  has_google_identity: 0 | 1
  email_verified_at: string | null
  email_verification_method: EmailVerificationMethod | null
}

interface SessionPrincipalRow {
  id: number
  public_id: string
  email: string
  password_hash: string | null
  first_name: string
  last_name: string
  role: UserRole
  status: UserStatus
  has_google_identity: 0 | 1
  email_verified_at: string | null
  email_verification_method: EmailVerificationMethod | null
}

export interface CreateUserWithSessionInput {
  publicId: string
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
  tokenHash: string
  expiresAt: string
  metadata: SessionMetadata
  courseId: number
}

export interface CreateSessionInput {
  userId: number
  tokenHash: string
  expiresAt: string
  metadata: SessionMetadata
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    publicId: row.public_id,
    email: row.email,
    passwordHash: row.password_hash,
    hasGoogleIdentity: row.has_google_identity === 1,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    status: row.status,
    emailVerifiedAt: row.email_verified_at,
    emailVerificationMethod: row.email_verification_method,
  }
}

const userSelect = `SELECT
  users.id,
  users.public_id,
  users.email,
  users.password_hash,
  users.first_name,
  users.last_name,
  users.role,
  users.status,
  users.email_verified_at,
  users.email_verification_method,
  CASE WHEN EXISTS (
    SELECT 1
    FROM user_identities
    WHERE user_identities.user_id = users.id
      AND user_identities.provider = 'google'
  ) THEN 1 ELSE 0 END AS has_google_identity
FROM users`

export async function findUserByEmail(
  database: D1Database,
  email: string,
): Promise<UserRecord | null> {
  const row = await database
    .prepare(`${userSelect}
      WHERE users.email = ?1
      LIMIT 1`)
    .bind(email)
    .first<UserRow>()

  return row === null ? null : mapUser(row)
}

export async function findUserById(
  database: D1Database,
  userId: number,
): Promise<UserRecord | null> {
  const row = await database
    .prepare(`${userSelect}
      WHERE users.id = ?1
      LIMIT 1`)
    .bind(userId)
    .first<UserRow>()

  return row === null ? null : mapUser(row)
}

export async function findUserByGoogleSubject(
  database: D1Database,
  providerSubject: string,
): Promise<UserRecord | null> {
  const row = await database
    .prepare(`${userSelect}
      INNER JOIN user_identities
        ON user_identities.user_id = users.id
      WHERE user_identities.provider = 'google'
        AND user_identities.provider_subject = ?1
      LIMIT 1`)
    .bind(providerSubject)
    .first<UserRow>()

  return row === null ? null : mapUser(row)
}

export async function createUserWithSession(
  database: D1Database,
  input: CreateUserWithSessionInput,
): Promise<UserRecord | null> {
  const createUser = input.pendingRegistration === undefined
    ? database
        .prepare(
          `INSERT INTO users (
            public_id,
            email,
            password_hash,
            first_name,
            last_name,
            role,
            status,
            email_verified_at,
            email_verification_method
          ) VALUES (?1, ?2, ?3, ?4, ?5, 'student', 'active', ?6, ?7)`,
        )
        .bind(
          input.publicId,
          input.email,
          input.passwordHash,
          input.firstName,
          input.lastName,
          input.emailVerifiedAt,
          input.emailVerificationMethod,
        )
    : database
        .prepare(
          `INSERT INTO users (
            public_id,
            email,
            password_hash,
            first_name,
            last_name,
            role,
            status,
            email_verified_at,
            email_verification_method
          )
          SELECT ?1, ?2, ?3, ?4, ?5, 'student', 'active', ?6, ?7
          FROM pending_registrations
          WHERE id = ?8
            AND code_hash = ?9
            AND attempt_count < 5
            AND datetime(code_expires_at) > datetime(?10)
            AND datetime(pending_expires_at) > datetime(?10)`,
        )
        .bind(
          input.publicId,
          input.email,
          input.passwordHash,
          input.firstName,
          input.lastName,
          input.emailVerifiedAt,
          input.emailVerificationMethod,
          input.pendingRegistration.id,
          input.pendingRegistration.codeHash,
          input.pendingRegistration.verifiedAt,
        )
  const createIdentity = input.googleSubject === null
    ? null
    : database
        .prepare(
          `INSERT INTO user_identities (
            user_id,
            provider,
            provider_subject
          )
          SELECT id, 'google', ?1
          FROM users
          WHERE public_id = ?2`,
        )
        .bind(input.googleSubject, input.publicId)
  const createSession = database
    .prepare(
      `INSERT INTO user_sessions (
        user_id,
        token_hash,
        expires_at,
        user_agent,
        ip_address,
        learner_session_generation
      )
      SELECT id, ?1, ?2, ?3, ?4, learner_session_generation
      FROM users
      WHERE public_id = ?5`,
    )
    .bind(
      input.tokenHash,
      input.expiresAt,
      input.metadata.userAgent,
      input.metadata.ipAddress,
      input.publicId,
    )
  const createEnrollment = database
    .prepare(
      `INSERT INTO course_enrollments (
        user_id,
        course_id,
        enrollment_status,
        enrollment_source
      )
      SELECT id, ?2, 'active', 'free'
      FROM users
      WHERE public_id = ?1`,
    )
    .bind(input.publicId, input.courseId)
  const consumePendingRegistration =
    input.pendingRegistration === undefined
      ? null
      : database
          .prepare(
            `DELETE FROM pending_registrations
            WHERE id = ?1
              AND code_hash = ?2
              AND attempt_count < 5
              AND datetime(code_expires_at) > datetime(?3)
              AND datetime(pending_expires_at) > datetime(?3)`,
          )
          .bind(
            input.pendingRegistration.id,
            input.pendingRegistration.codeHash,
            input.pendingRegistration.verifiedAt,
          )

  const [createUserResult] = await database.batch([
    createUser,
    ...(createIdentity === null ? [] : [createIdentity]),
    createSession,
    createEnrollment,
    ...(consumePendingRegistration === null
      ? []
      : [consumePendingRegistration]),
  ])

  if (createUserResult?.meta.changes !== 1) {
    return null
  }

  return findUserByEmail(database, input.email)
}

export async function linkGoogleIdentity(
  database: D1Database,
  userId: number,
  providerSubject: string,
): Promise<void> {
  await database
    .prepare(
      `INSERT INTO user_identities (
        user_id,
        provider,
        provider_subject
      ) VALUES (?1, 'google', ?2)`,
    )
    .bind(userId, providerSubject)
    .run()
}

export async function updatePasswordAndRevokeOtherSessions(
  database: D1Database,
  input: { userId: number; passwordHash: string; currentTokenHash: string },
): Promise<void> {
  await database.batch([
    database
      .prepare(
        `UPDATE users
        SET password_hash = ?1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?2`,
      )
      .bind(input.passwordHash, input.userId),
    database
      .prepare(
        `UPDATE user_sessions
        SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
        WHERE user_id = ?1
          AND token_hash <> ?2
          AND revoked_at IS NULL`,
      )
      .bind(input.userId, input.currentTokenHash),
  ])
}

export async function createSession(
  database: D1Database,
  input: CreateSessionInput,
): Promise<void> {
  await database
    .prepare(
      `INSERT INTO user_sessions (
        user_id,
        token_hash,
        expires_at,
        user_agent,
        ip_address
      ) VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(
      input.userId,
      input.tokenHash,
      input.expiresAt,
      input.metadata.userAgent,
      input.metadata.ipAddress,
    )
    .run()
}

export async function findActiveSessionPrincipal(
  database: D1Database,
  tokenHash: string,
): Promise<(AuthenticatedPrincipal & { status: UserStatus }) | null> {
  const row = await database
    .prepare(
      `SELECT
        users.id,
        users.public_id,
        users.email,
        users.password_hash,
        users.first_name,
        users.last_name,
        users.role,
        users.status,
        users.email_verified_at,
        users.email_verification_method,
        CASE WHEN EXISTS (
          SELECT 1
          FROM user_identities
          WHERE user_identities.user_id = users.id
            AND user_identities.provider = 'google'
        ) THEN 1 ELSE 0 END AS has_google_identity
      FROM user_sessions
      INNER JOIN users ON users.id = user_sessions.user_id
      WHERE user_sessions.token_hash = ?1
        AND user_sessions.revoked_at IS NULL
        AND datetime(user_sessions.expires_at) > CURRENT_TIMESTAMP
      LIMIT 1`,
    )
    .bind(tokenHash)
    .first<SessionPrincipalRow>()

  if (row === null) {
    return null
  }

  return {
    internalUserId: row.id,
    id: row.public_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    status: row.status,
    emailVerification: {
      verified: row.email_verified_at !== null,
      method: row.email_verification_method,
    },
    signInMethods: {
      hasPassword: row.password_hash !== null,
      googleConnected: row.has_google_identity === 1,
    },
  }
}

export async function revokeSessionByTokenHash(
  database: D1Database,
  tokenHash: string,
): Promise<void> {
  await database
    .prepare(
      `UPDATE user_sessions
      SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
      WHERE token_hash = ?1`,
    )
    .bind(tokenHash)
    .run()
}

export async function revokeSessionsForUser(
  database: D1Database,
  userId: number,
): Promise<void> {
  await database
    .prepare(
      `UPDATE user_sessions
      SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
      WHERE user_id = ?1
        AND revoked_at IS NULL`,
    )
    .bind(userId)
    .run()
}

import type {
  AuthenticatedPrincipal,
  SessionMetadata,
  UserRecord,
  UserRole,
  UserStatus,
} from '../types/auth'

interface UserRow {
  id: number
  public_id: string
  email: string
  password_hash: string
  first_name: string
  last_name: string
  role: UserRole
  status: UserStatus
}

interface SessionPrincipalRow {
  id: number
  public_id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  status: UserStatus
}

export interface CreateUserWithSessionInput {
  publicId: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
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
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    status: row.status,
  }
}

export async function findUserByEmail(
  database: D1Database,
  email: string,
): Promise<UserRecord | null> {
  const row = await database
    .prepare(
      `SELECT
        id,
        public_id,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        status
      FROM users
      WHERE email = ?1
      LIMIT 1`,
    )
    .bind(email)
    .first<UserRow>()

  return row === null ? null : mapUser(row)
}

export async function findUserById(
  database: D1Database,
  userId: number,
): Promise<UserRecord | null> {
  const row = await database
    .prepare(
      `SELECT
        id,
        public_id,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        status
      FROM users
      WHERE id = ?1
      LIMIT 1`,
    )
    .bind(userId)
    .first<UserRow>()

  return row === null ? null : mapUser(row)
}

export async function createUserWithSession(
  database: D1Database,
  input: CreateUserWithSessionInput,
): Promise<UserRecord | null> {
  const createUser = database
    .prepare(
      `INSERT INTO users (
        public_id,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        status
      ) VALUES (?1, ?2, ?3, ?4, ?5, 'student', 'active')`,
    )
    .bind(
      input.publicId,
      input.email,
      input.passwordHash,
      input.firstName,
      input.lastName,
    )
  const createSession = database
    .prepare(
      `INSERT INTO user_sessions (
        user_id,
        token_hash,
        expires_at,
        user_agent,
        ip_address
      )
      SELECT id, ?1, ?2, ?3, ?4
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
      ) VALUES (
        (SELECT id FROM users WHERE public_id = ?1),
        ?2,
        'active',
        'free'
      )`,
    )
    .bind(input.publicId, input.courseId)

  await database.batch([createUser, createSession, createEnrollment])

  return findUserByEmail(database, input.email)
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
        users.first_name,
        users.last_name,
        users.role,
        users.status
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

import type {
  AuthenticatedPrincipal,
  EmailVerificationMethod,
  SessionMetadata,
  UserRole,
  UserStatus,
} from '../types/auth'

interface SessionPrincipalRow {
  id: number
  public_id: string
  email: string
  password_hash: string | null
  first_name: string
  last_name: string
  role: UserRole
  status: UserStatus
  email_verified_at: string | null
  email_verification_method: EmailVerificationMethod | null
  has_google_identity: 0 | 1
  session_generation: number | null
  user_generation: number
  session_active: 0 | 1
}

export interface SessionPrincipalResult {
  principal: AuthenticatedPrincipal & { status: UserStatus }
  replaced: boolean
  active: boolean
}

export async function createLatestSession(
  database: D1Database,
  input: {
    userId: number
    role: UserRole
    tokenHash: string
    expiresAt: string
    metadata: SessionMetadata
  },
): Promise<void> {
  if (input.role === 'admin') {
    await database
      .prepare(
        `INSERT INTO user_sessions (
          user_id,
          token_hash,
          expires_at,
          user_agent,
          ip_address,
          learner_session_generation
        ) VALUES (?1, ?2, ?3, ?4, ?5, NULL)`,
      )
      .bind(
        input.userId,
        input.tokenHash,
        input.expiresAt,
        input.metadata.userAgent,
        input.metadata.ipAddress,
      )
      .run()
    return
  }

  await database.batch([
    database
      .prepare(
        `UPDATE users
        SET learner_session_generation = learner_session_generation + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1 AND role = 'student'`,
      )
      .bind(input.userId),
    database
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
        WHERE id = ?5 AND role = 'student'`,
      )
      .bind(
        input.tokenHash,
        input.expiresAt,
        input.metadata.userAgent,
        input.metadata.ipAddress,
        input.userId,
      ),
  ])
}

export async function findSessionPrincipal(
  database: D1Database,
  tokenHash: string,
): Promise<SessionPrincipalResult | null> {
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
          SELECT 1 FROM user_identities
          WHERE user_identities.user_id = users.id
            AND user_identities.provider = 'google'
        ) THEN 1 ELSE 0 END AS has_google_identity,
        user_sessions.learner_session_generation AS session_generation,
        users.learner_session_generation AS user_generation,
        CASE
          WHEN user_sessions.revoked_at IS NULL
            AND datetime(user_sessions.expires_at) > CURRENT_TIMESTAMP
          THEN 1 ELSE 0
        END AS session_active
      FROM user_sessions
      INNER JOIN users ON users.id = user_sessions.user_id
      WHERE user_sessions.token_hash = ?1
      LIMIT 1`,
    )
    .bind(tokenHash)
    .first<SessionPrincipalRow>()

  if (row === null) return null

  const replaced =
    row.role === 'student' &&
    !(
      row.session_generation === row.user_generation ||
      (row.session_generation === null && row.user_generation === 0)
    )

  return {
    principal: {
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
    },
    replaced,
    active: row.session_active === 1,
  }
}

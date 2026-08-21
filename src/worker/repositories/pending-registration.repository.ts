export interface PendingRegistrationRecord {
  id: number
  publicId: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  purpose: 'EMAIL_REGISTRATION_VERIFICATION'
  codeHash: string
  codeExpiresAt: string
  attemptCount: number
  resendAvailableAt: string
  pendingExpiresAt: string
  lastSentAt: string | null
}

interface PendingRegistrationRow {
  id: number
  public_id: string
  email: string
  password_hash: string
  first_name: string
  last_name: string
  purpose: 'EMAIL_REGISTRATION_VERIFICATION'
  code_hash: string
  code_expires_at: string
  attempt_count: number
  resend_available_at: string
  pending_expires_at: string
  last_sent_at: string | null
}

export interface SavePendingRegistrationInput {
  publicId: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  codeHash: string
  codeExpiresAt: string
  resendAvailableAt: string
  pendingExpiresAt: string
  sentAt: string
}

function mapPendingRegistration(
  row: PendingRegistrationRow,
): PendingRegistrationRecord {
  return {
    id: row.id,
    publicId: row.public_id,
    email: row.email,
    passwordHash: row.password_hash,
    firstName: row.first_name,
    lastName: row.last_name,
    purpose: row.purpose,
    codeHash: row.code_hash,
    codeExpiresAt: row.code_expires_at,
    attemptCount: row.attempt_count,
    resendAvailableAt: row.resend_available_at,
    pendingExpiresAt: row.pending_expires_at,
    lastSentAt: row.last_sent_at,
  }
}

const pendingSelect = `SELECT
  id,
  public_id,
  email,
  password_hash,
  first_name,
  last_name,
  purpose,
  code_hash,
  code_expires_at,
  attempt_count,
  resend_available_at,
  pending_expires_at,
  last_sent_at
FROM pending_registrations`

export async function deleteExpiredPendingRegistrations(
  database: D1Database,
  now: string,
): Promise<void> {
  await database.prepare(
    `DELETE FROM pending_registrations
    WHERE datetime(pending_expires_at) <= datetime(?1)`,
  ).bind(now).run()
}

export async function savePendingRegistration(
  database: D1Database,
  input: SavePendingRegistrationInput,
): Promise<PendingRegistrationRecord> {
  await database.prepare(
    `INSERT INTO pending_registrations (
      public_id,
      email,
      password_hash,
      first_name,
      last_name,
      purpose,
      code_hash,
      code_expires_at,
      attempt_count,
      resend_available_at,
      pending_expires_at,
      last_sent_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, 'EMAIL_REGISTRATION_VERIFICATION', ?6, ?7, 0, ?8, ?9, ?10)
    ON CONFLICT(email) DO UPDATE SET
      public_id = excluded.public_id,
      password_hash = excluded.password_hash,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      purpose = excluded.purpose,
      code_hash = excluded.code_hash,
      code_expires_at = excluded.code_expires_at,
      attempt_count = 0,
      resend_available_at = excluded.resend_available_at,
      pending_expires_at = excluded.pending_expires_at,
      last_sent_at = excluded.last_sent_at,
      updated_at = CURRENT_TIMESTAMP`,
  ).bind(
    input.publicId,
    input.email,
    input.passwordHash,
    input.firstName,
    input.lastName,
    input.codeHash,
    input.codeExpiresAt,
    input.resendAvailableAt,
    input.pendingExpiresAt,
    input.sentAt,
  ).run()

  const pending = await findPendingRegistrationByPublicId(
    database,
    input.publicId,
  )
  if (pending === null) throw new Error('The pending registration was not saved.')
  return pending
}

export async function findPendingRegistrationByPublicId(
  database: D1Database,
  publicId: string,
): Promise<PendingRegistrationRecord | null> {
  const row = await database.prepare(
    `${pendingSelect} WHERE public_id = ?1 LIMIT 1`,
  ).bind(publicId).first<PendingRegistrationRow>()
  return row === null ? null : mapPendingRegistration(row)
}

export async function findPendingRegistrationByEmail(
  database: D1Database,
  email: string,
): Promise<PendingRegistrationRecord | null> {
  const row = await database.prepare(
    `${pendingSelect} WHERE email = ?1 LIMIT 1`,
  ).bind(email).first<PendingRegistrationRow>()
  return row === null ? null : mapPendingRegistration(row)
}

export async function recordFailedVerificationAttempt(
  database: D1Database,
  pendingId: number,
  expectedCodeHash: string,
  now: string,
): Promise<number | null> {
  await database.prepare(
    `UPDATE pending_registrations
    SET attempt_count = MIN(attempt_count + 1, 5),
        code_expires_at = CASE
          WHEN attempt_count + 1 >= 5 THEN ?1
          ELSE code_expires_at
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?2
      AND code_hash = ?3`,
  ).bind(now, pendingId, expectedCodeHash).run()

  const row = await database.prepare(
    `SELECT attempt_count
    FROM pending_registrations
    WHERE id = ?1
      AND code_hash = ?2`,
  ).bind(pendingId, expectedCodeHash).first<{ attempt_count: number }>()
  return row?.attempt_count ?? null
}

export async function replacePendingVerificationCode(
  database: D1Database,
  input: {
    pendingId: number
    codeHash: string
    codeExpiresAt: string
    resendAvailableAt: string
    pendingExpiresAt: string
    sentAt: string
  },
): Promise<void> {
  await database.prepare(
    `UPDATE pending_registrations
    SET code_hash = ?1,
        code_expires_at = ?2,
        attempt_count = 0,
        resend_available_at = ?3,
        pending_expires_at = ?4,
        last_sent_at = ?5,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?6`,
  ).bind(
    input.codeHash,
    input.codeExpiresAt,
    input.resendAvailableAt,
    input.pendingExpiresAt,
    input.sentAt,
    input.pendingId,
  ).run()
}

export async function invalidatePendingVerificationCode(
  database: D1Database,
  pendingId: number,
  expectedCodeHash: string,
  now: string,
): Promise<void> {
  await database.prepare(
    `UPDATE pending_registrations
    SET code_expires_at = ?1,
        last_sent_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?2
      AND code_hash = ?3`,
  ).bind(now, pendingId, expectedCodeHash).run()
}

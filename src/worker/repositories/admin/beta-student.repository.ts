export interface BetaStudentRow {
  public_id: string
  email: string
  first_name: string
  last_name: string
  role: 'student'
  status: 'active' | 'suspended'
  created_at: string
  enrollment_status: string | null
  last_login_at: string | null
  active_session_count: number
}

export interface CreateBetaStudentRecordInput {
  actorUserId: number
  publicId: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  enrollInCseProfessional: boolean
  auditMetadataJson: string
}

const betaStudentSelect = `SELECT
  users.public_id,
  users.email,
  users.first_name,
  users.last_name,
  users.role,
  users.status,
  users.created_at,
  course_enrollments.enrollment_status,
  MAX(user_sessions.created_at) AS last_login_at,
  COALESCE(SUM(CASE
    WHEN user_sessions.revoked_at IS NULL
      AND datetime(user_sessions.expires_at) > CURRENT_TIMESTAMP
    THEN 1 ELSE 0 END), 0) AS active_session_count
FROM users
LEFT JOIN courses ON courses.slug = 'cse-professional'
LEFT JOIN course_enrollments
  ON course_enrollments.user_id = users.id
  AND course_enrollments.course_id = courses.id
LEFT JOIN user_sessions ON user_sessions.user_id = users.id`

export async function findBetaStudentByEmail(
  database: D1Database,
  email: string,
): Promise<BetaStudentRow | null> {
  return database
    .prepare(`${betaStudentSelect}
      WHERE users.role = 'student' AND users.email = ?1
      GROUP BY users.id, course_enrollments.id
      LIMIT 1`)
    .bind(email)
    .first<BetaStudentRow>()
}

export async function findBetaStudentByPublicId(
  database: D1Database,
  publicId: string,
): Promise<BetaStudentRow | null> {
  return database
    .prepare(`${betaStudentSelect}
      WHERE users.role = 'student' AND users.public_id = ?1
      GROUP BY users.id, course_enrollments.id
      LIMIT 1`)
    .bind(publicId)
    .first<BetaStudentRow>()
}

export async function listBetaStudentRows(
  database: D1Database,
): Promise<BetaStudentRow[]> {
  const result = await database
    .prepare(`${betaStudentSelect}
      WHERE users.role = 'student'
      GROUP BY users.id, course_enrollments.id
      ORDER BY users.created_at DESC, users.id DESC`)
    .all<BetaStudentRow>()

  return result.results
}

export async function createBetaStudentRecord(
  database: D1Database,
  input: CreateBetaStudentRecordInput,
): Promise<BetaStudentRow | null> {
  const statements: D1PreparedStatement[] = [
    database
      .prepare(`INSERT INTO users (
        public_id,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        status
      ) VALUES (?1, ?2, ?3, ?4, ?5, 'student', 'active')`)
      .bind(
        input.publicId,
        input.email,
        input.passwordHash,
        input.firstName,
        input.lastName,
      ),
  ]

  if (input.enrollInCseProfessional) {
    statements.push(
      database
        .prepare(`INSERT INTO course_enrollments (
          user_id,
          course_id,
          enrollment_status,
          enrollment_source
        ) VALUES (
          (SELECT id FROM users WHERE public_id = ?1),
          (SELECT id FROM courses WHERE slug = 'cse-professional'),
          'active',
          'admin'
        )
        ON CONFLICT(user_id, course_id) DO UPDATE SET
          enrollment_status = 'active',
          access_starts_at = CURRENT_TIMESTAMP,
          access_expires_at = NULL,
          completed_at = NULL,
          enrollment_source = 'admin'`)
        .bind(input.publicId),
    )
  }

  statements.push(
    database
      .prepare(`INSERT INTO audit_logs (
        actor_user_id,
        action,
        entity_type,
        entity_id,
        metadata_json
      ) VALUES (?1, 'beta_student.created', 'user', ?2, ?3)`)
      .bind(
        input.actorUserId,
        input.publicId,
        input.auditMetadataJson,
      ),
  )

  await database.batch(statements)

  return findBetaStudentByPublicId(database, input.publicId)
}

import type { QaStudentMode } from '../../schemas/admin/qa-student.schemas'

export interface QaStudentTargetRow {
  id: number
  public_id: string
  email: string
  first_name: string
  last_name: string
  role: 'student' | 'admin'
  status: 'active' | 'suspended'
  enrollment_id: number | null
  enrollment_status: string | null
  access_starts_at: string | null
  access_expires_at: string | null
  has_active_access: 0 | 1
}

export interface QaStudentStateCounts {
  requiredLessonCount: number
  progressRecordCount: number
  completedLessonCount: number
  missingProgressCount: number
  incompleteProgressCount: number
  practiceAttemptCount: number
  quizAttemptCount: number
  subjectAssessmentAttemptCount: number
  mockExamAttemptCount: number
  activeRecoveryAttemptCount: number
  submittedRecoveryAttemptCount: number
}

export interface ConfigureQaStudentRecordInput {
  actorUserId: number
  publicId: string
  email: string
  passwordHash: string
  mode: QaStudentMode
  metadataJson: string
}

export async function repairQaStudentPublicId(
  database: D1Database,
  userId: number,
  publicId: string,
): Promise<number> {
  const result = await database
    .prepare(
      `UPDATE users
      SET public_id = ?1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?2 AND role = 'student'`,
    )
    .bind(publicId, userId)
    .run()
  return result.meta.changes
}

const targetSelect = `SELECT
  users.id,
  users.public_id,
  users.email,
  users.first_name,
  users.last_name,
  users.role,
  users.status,
  course_enrollments.id AS enrollment_id,
  course_enrollments.enrollment_status,
  course_enrollments.access_starts_at,
  course_enrollments.access_expires_at,
  CASE
    WHEN course_enrollments.enrollment_status = 'active'
      AND datetime(course_enrollments.access_starts_at) <= CURRENT_TIMESTAMP
      AND (
        course_enrollments.access_expires_at IS NULL
        OR datetime(course_enrollments.access_expires_at) > CURRENT_TIMESTAMP
      )
    THEN 1 ELSE 0
  END AS has_active_access
FROM users
LEFT JOIN courses ON courses.slug = 'cse-professional'
LEFT JOIN course_enrollments
  ON course_enrollments.user_id = users.id
  AND course_enrollments.course_id = courses.id`

export async function findQaStudentTargetByEmail(
  database: D1Database,
  email: string,
): Promise<QaStudentTargetRow | null> {
  return database
    .prepare(`${targetSelect} WHERE users.email = ?1 LIMIT 1`)
    .bind(email)
    .first<QaStudentTargetRow>()
}

export async function findPublishedCseCourse(
  database: D1Database,
): Promise<{ id: number; public_id: string; title: string; slug: string } | null> {
  return database
    .prepare(
      `SELECT id, public_id, title, slug
      FROM courses
      WHERE slug = 'cse-professional' AND status = 'published'
      LIMIT 1`,
    )
    .first()
}

async function count(
  database: D1Database,
  sql: string,
  email: string,
): Promise<number> {
  const row = await database.prepare(sql).bind(email).first<{ count: number }>()
  return row?.count ?? 0
}

export async function countQaStudentState(
  database: D1Database,
  email: string,
): Promise<QaStudentStateCounts> {
  const userId = `(SELECT id FROM users WHERE email = ?1 AND role = 'student')`
  const courseId = `(SELECT id FROM courses WHERE slug = 'cse-professional')`
  const lessonScope = `SELECT lessons.id
    FROM lessons
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    WHERE subjects.course_id = ${courseId}`
  const publishedRequiredLessons = `${lessonScope}
    AND subjects.status = 'published'
    AND topics.status = 'published'
    AND lessons.status = 'published'
    AND lessons.is_preview = 0`

  const [
    requiredLessonCount,
    progressRecordCount,
    completedLessonCount,
    missingProgressCount,
    incompleteProgressCount,
    practiceAttemptCount,
    quizAttemptCount,
    subjectAssessmentAttemptCount,
    mockExamAttemptCount,
    activeRecoveryAttemptCount,
    submittedRecoveryAttemptCount,
  ] = await Promise.all([
    count(database, `SELECT COUNT(*) AS count FROM lessons WHERE id IN (${publishedRequiredLessons}) AND ?1 IS NOT NULL`, email),
    count(database, `SELECT COUNT(*) AS count FROM lesson_progress WHERE user_id = ${userId} AND lesson_id IN (${lessonScope})`, email),
    count(database, `SELECT COUNT(*) AS count FROM lesson_progress WHERE user_id = ${userId} AND lesson_id IN (${publishedRequiredLessons}) AND status = 'completed' AND progress_percent = 100 AND completed_at IS NOT NULL`, email),
    count(database, `SELECT COUNT(*) AS count FROM lessons WHERE id IN (${publishedRequiredLessons}) AND ?1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lesson_progress WHERE lesson_progress.user_id = ${userId} AND lesson_progress.lesson_id = lessons.id)`, email),
    count(database, `SELECT COUNT(*) AS count FROM lesson_progress WHERE user_id = ${userId} AND lesson_id IN (${publishedRequiredLessons}) AND (status <> 'completed' OR progress_percent <> 100 OR completed_at IS NULL)`, email),
    count(database, `SELECT COUNT(*) AS count FROM practice_attempts WHERE user_id = ${userId} AND practice_set_id IN (SELECT practice_sets.id FROM practice_sets INNER JOIN lessons ON lessons.id = practice_sets.lesson_id WHERE lessons.id IN (${lessonScope}))`, email),
    count(database, `SELECT COUNT(*) AS count FROM quiz_attempts WHERE user_id = ${userId} AND quiz_id IN (SELECT quizzes.id FROM quizzes LEFT JOIN lessons ON lessons.id = quizzes.lesson_id LEFT JOIN topics ON topics.id = COALESCE(lessons.topic_id, quizzes.topic_id) LEFT JOIN subjects ON subjects.id = topics.subject_id WHERE subjects.course_id = ${courseId})`, email),
    count(database, `SELECT COUNT(*) AS count FROM subject_assessment_attempts WHERE user_id = ${userId} AND assessment_id IN (SELECT subject_assessments.id FROM subject_assessments INNER JOIN subjects ON subjects.id = subject_assessments.subject_id WHERE subjects.course_id = ${courseId})`, email),
    count(database, `SELECT COUNT(*) AS count FROM mock_exam_attempts WHERE user_id = ${userId} AND mock_exam_id IN (SELECT id FROM mock_examinations WHERE course_id = ${courseId})`, email),
    count(database, `SELECT COUNT(*) AS count FROM recovery_attempts WHERE user_id = ${userId} AND course_id = ${courseId} AND status = 'in_progress'`, email),
    count(database, `SELECT COUNT(*) AS count FROM recovery_attempts WHERE user_id = ${userId} AND course_id = ${courseId} AND status = 'submitted'`, email),
  ])

  return {
    requiredLessonCount,
    progressRecordCount,
    completedLessonCount,
    missingProgressCount,
    incompleteProgressCount,
    practiceAttemptCount,
    quizAttemptCount,
    subjectAssessmentAttemptCount,
    mockExamAttemptCount,
    activeRecoveryAttemptCount,
    submittedRecoveryAttemptCount,
  }
}

export async function configureQaStudentRecords(
  database: D1Database,
  input: ConfigureQaStudentRecordInput,
): Promise<void> {
  const userId = `(SELECT id FROM users WHERE email = ?1 AND role = 'student')`
  const courseId = `(SELECT id FROM courses WHERE slug = 'cse-professional' AND status = 'published')`
  const lessonScope = `SELECT lessons.id
    FROM lessons
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    WHERE subjects.course_id = ${courseId}`
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `INSERT INTO users (
          public_id, email, password_hash, first_name, last_name, role, status
        ) VALUES (?2, ?1, ?3, 'CSE', 'QA Student', 'student', 'active')
        ON CONFLICT(email) DO UPDATE SET
          password_hash = excluded.password_hash,
          status = 'active',
          updated_at = CURRENT_TIMESTAMP
        WHERE users.role = 'student'`,
      )
      .bind(input.email, input.publicId, input.passwordHash),
    database
      .prepare(
        `INSERT INTO course_enrollments (
          user_id, course_id, enrollment_status, enrollment_source
        )
        SELECT ${userId}, ${courseId}, 'active', 'admin'
        WHERE ${userId} IS NOT NULL AND ${courseId} IS NOT NULL
        ON CONFLICT(user_id, course_id) DO UPDATE SET
          enrollment_status = 'active',
          access_starts_at = CURRENT_TIMESTAMP,
          access_expires_at = NULL,
          completed_at = NULL
        WHERE course_enrollments.enrollment_status <> 'active'
          OR datetime(course_enrollments.access_starts_at) > CURRENT_TIMESTAMP
          OR course_enrollments.access_expires_at IS NOT NULL
          OR course_enrollments.completed_at IS NOT NULL`,
      )
      .bind(input.email),
  ]

  if (input.mode === 'unlocked') {
    statements.push(
      database
        .prepare(
          `INSERT INTO lesson_progress (
            user_id, lesson_id, status, started_at, completed_at,
            last_viewed_at, progress_percent
          )
          SELECT
            ${userId}, lessons.id, 'completed', CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 100
          FROM lessons
          INNER JOIN topics ON topics.id = lessons.topic_id
          INNER JOIN subjects ON subjects.id = topics.subject_id
          WHERE subjects.course_id = ${courseId}
            AND subjects.status = 'published'
            AND topics.status = 'published'
            AND lessons.status = 'published'
            AND lessons.is_preview = 0
            AND ${userId} IS NOT NULL
          ON CONFLICT(user_id, lesson_id) DO UPDATE SET
            status = 'completed',
            started_at = COALESCE(lesson_progress.started_at, CURRENT_TIMESTAMP),
            completed_at = COALESCE(lesson_progress.completed_at, CURRENT_TIMESTAMP),
            last_viewed_at = COALESCE(lesson_progress.last_viewed_at, CURRENT_TIMESTAMP),
            progress_percent = 100
          WHERE lesson_progress.status <> 'completed'
            OR lesson_progress.progress_percent <> 100
            OR lesson_progress.completed_at IS NULL`,
        )
        .bind(input.email),
    )
  } else {
    statements.push(
      database.prepare(`DELETE FROM practice_attempts WHERE user_id = ${userId} AND practice_set_id IN (SELECT practice_sets.id FROM practice_sets INNER JOIN lessons ON lessons.id = practice_sets.lesson_id WHERE lessons.id IN (${lessonScope}))`).bind(input.email),
      database.prepare(`DELETE FROM quiz_attempts WHERE user_id = ${userId} AND quiz_id IN (SELECT quizzes.id FROM quizzes LEFT JOIN lessons ON lessons.id = quizzes.lesson_id LEFT JOIN topics ON topics.id = COALESCE(lessons.topic_id, quizzes.topic_id) LEFT JOIN subjects ON subjects.id = topics.subject_id WHERE subjects.course_id = ${courseId})`).bind(input.email),
      database.prepare(`DELETE FROM subject_assessment_attempts WHERE user_id = ${userId} AND assessment_id IN (SELECT subject_assessments.id FROM subject_assessments INNER JOIN subjects ON subjects.id = subject_assessments.subject_id WHERE subjects.course_id = ${courseId})`).bind(input.email),
      database.prepare(`DELETE FROM mock_exam_attempts WHERE user_id = ${userId} AND mock_exam_id IN (SELECT id FROM mock_examinations WHERE course_id = ${courseId})`).bind(input.email),
      database.prepare(`DELETE FROM recovery_attempts WHERE user_id = ${userId} AND course_id = ${courseId} AND status = 'in_progress'`).bind(input.email),
      database.prepare(`DELETE FROM lesson_progress WHERE user_id = ${userId} AND lesson_id IN (${lessonScope})`).bind(input.email),
    )
  }

  statements.push(
    database
      .prepare(
        `INSERT INTO audit_logs (
          actor_user_id, action, entity_type, entity_id, metadata_json
        ) VALUES (
          ?1, ?2, 'user',
          (SELECT public_id FROM users WHERE email = ?3 AND role = 'student'),
          ?4
        )`,
      )
      .bind(
        input.actorUserId,
        `qa_student.${input.mode}`,
        input.email,
        input.metadataJson,
      ),
  )

  await database.batch(statements)
}

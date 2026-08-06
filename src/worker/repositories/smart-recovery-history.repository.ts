export interface RecoveryHistorySkillRow {
  attempt_public_id: string
  attempt_formula_version: number
  attempt_taxonomy_version: number
  started_at: string
  submitted_at: string
  score_percent: number
  correct_count: number
  question_count: number
  total_submitted_attempts: number
  skill_slug: string
  skill_title: string
  subject_slug: string
  subject_title: string
  topic_slug: string | null
  topic_title: string | null
  related_lesson_slug: string | null
  related_lesson_title: string | null
  questions: number
  correct: number
}

export async function findRecoveryHistorySkillRows(
  database: D1Database,
  userId: number,
  courseId: number,
  limit = 20,
): Promise<RecoveryHistorySkillRow[]> {
  const result = await database
    .prepare(
      `WITH submitted_attempts AS (
        SELECT
          attempts.id,
          attempts.public_id,
          attempts.weakness_formula_version,
          attempts.taxonomy_version,
          attempts.started_at,
          attempts.submitted_at,
          attempts.score_percent,
          attempts.correct_count,
          attempts.question_count,
          COUNT(*) OVER() AS total_submitted_attempts
        FROM recovery_attempts attempts
        WHERE attempts.user_id = ?1
          AND attempts.course_id = ?2
          AND attempts.status = 'submitted'
          AND attempts.submitted_at IS NOT NULL
          AND attempts.score_percent IS NOT NULL
        ORDER BY datetime(attempts.submitted_at) DESC, attempts.id DESC
        LIMIT ?3
      )
      SELECT
        attempts.public_id AS attempt_public_id,
        attempts.weakness_formula_version AS attempt_formula_version,
        attempts.taxonomy_version AS attempt_taxonomy_version,
        attempts.started_at,
        attempts.submitted_at,
        attempts.score_percent,
        attempts.correct_count,
        attempts.question_count,
        attempts.total_submitted_attempts,
        snapshots.skill_slug,
        snapshots.skill_title,
        snapshots.subject_slug,
        snapshots.subject_title,
        snapshots.topic_slug,
        snapshots.topic_title,
        snapshots.related_lesson_slug,
        snapshots.related_lesson_title,
        COUNT(snapshots.id) AS questions,
        SUM(CASE WHEN answers.is_correct = 1 THEN 1 ELSE 0 END) AS correct
      FROM submitted_attempts attempts
      INNER JOIN recovery_question_snapshots snapshots
        ON snapshots.attempt_id = attempts.id
      LEFT JOIN recovery_answers answers
        ON answers.attempt_id = attempts.id
        AND answers.snapshot_id = snapshots.id
      GROUP BY
        attempts.id,
        snapshots.skill_slug,
        snapshots.skill_title,
        snapshots.subject_slug,
        snapshots.subject_title,
        snapshots.topic_slug,
        snapshots.topic_title,
        snapshots.related_lesson_slug,
        snapshots.related_lesson_title
      ORDER BY datetime(attempts.submitted_at) DESC,
        attempts.id DESC,
        snapshots.skill_slug`,
    )
    .bind(userId, courseId, limit)
    .all<RecoveryHistorySkillRow>()
  return result.results
}

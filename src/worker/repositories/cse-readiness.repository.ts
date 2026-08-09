import type { ReadinessSubjectSlug } from '../domain/cse-readiness'

export interface ReadinessMockRow { score_percent: number; submitted_at: string; recent_rank: number; attempt_count: number; best_score_percent: number }
export interface ReadinessAssessmentRow { subject_slug: ReadinessSubjectSlug; subject_title: string; assessment_slug: string; score_percent: number; submitted_at: string; recent_rank: number; attempt_count: number }
export interface ReadinessPracticeRow { is_correct: 0 | 1 | null; submitted_at: string }

export async function findReadinessMockEvidence(database: D1Database, userId: number, courseId: number): Promise<ReadinessMockRow[]> {
  const result = await database.prepare(`WITH ranked AS (
    SELECT attempts.score_percent, attempts.submitted_at,
      ROW_NUMBER() OVER (ORDER BY attempts.submitted_at DESC, attempts.attempt_number DESC) AS recent_rank,
      COUNT(*) OVER () AS attempt_count,
      MAX(attempts.score_percent) OVER () AS best_score_percent
    FROM mock_exam_attempts attempts
    INNER JOIN mock_examinations exams ON exams.id = attempts.mock_exam_id
    WHERE attempts.user_id = ?1 AND exams.course_id = ?2
      AND attempts.status IN ('submitted', 'expired')
      AND attempts.submitted_at IS NOT NULL AND attempts.score_percent IS NOT NULL
  ) SELECT * FROM ranked WHERE recent_rank <= 2 ORDER BY recent_rank`).bind(userId, courseId).all<ReadinessMockRow>()
  return result.results
}

export async function findReadinessAssessmentEvidence(database: D1Database, userId: number, courseId: number): Promise<ReadinessAssessmentRow[]> {
  const result = await database.prepare(`WITH ranked AS (
    SELECT subjects.slug AS subject_slug, subjects.title AS subject_title,
      assessments.slug AS assessment_slug, attempts.score_percent, attempts.submitted_at,
      ROW_NUMBER() OVER (PARTITION BY subjects.slug ORDER BY attempts.submitted_at DESC, attempts.attempt_number DESC) AS recent_rank,
      COUNT(*) OVER (PARTITION BY subjects.slug) AS attempt_count
    FROM subject_assessment_attempts attempts
    INNER JOIN subject_assessments assessments ON assessments.id = attempts.assessment_id
    INNER JOIN subjects ON subjects.id = assessments.subject_id
    WHERE attempts.user_id = ?1 AND subjects.course_id = ?2
      AND attempts.status = 'submitted' AND attempts.submitted_at IS NOT NULL
      AND attempts.score_percent IS NOT NULL
  ) SELECT * FROM ranked WHERE recent_rank <= 2 ORDER BY subject_slug, recent_rank`).bind(userId, courseId).all<ReadinessAssessmentRow>()
  return result.results
}

export async function findRecentGeneratedPracticeEvidence(database: D1Database, userId: number, courseId: number, limit = 50): Promise<ReadinessPracticeRow[]> {
  const result = await database.prepare(`SELECT answers.is_correct, attempts.submitted_at
    FROM practice_attempts attempts
    INNER JOIN practice_sets sets ON sets.id = attempts.practice_set_id AND sets.question_source = 'generated'
    INNER JOIN lessons ON lessons.id = sets.lesson_id
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    INNER JOIN generated_question_snapshots snapshots ON snapshots.practice_attempt_id = attempts.id
    LEFT JOIN generated_practice_attempt_answers answers ON answers.attempt_id = attempts.id AND answers.snapshot_id = snapshots.id
    WHERE attempts.user_id = ?1 AND subjects.course_id = ?2
      AND attempts.status = 'submitted' AND attempts.submitted_at IS NOT NULL
    ORDER BY attempts.submitted_at DESC, attempts.attempt_number DESC, snapshots.source_position DESC
    LIMIT ?3`).bind(userId, courseId, limit).all<ReadinessPracticeRow>()
  return result.results
}

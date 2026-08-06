import type {
  EvidenceSource,
  GeneratedEvidenceRecord,
  SkillCatalogEntry,
} from '../domain/smart-recovery-weakness'

interface GeneratedEvidenceRow {
  user_id: number
  source_type: EvidenceSource
  attempt_public_id: string
  attempt_submitted_at: string
  snapshot_public_id: string
  skill_slug: string | null
  generator_slug: string
  generator_version: number
  generator_seed: string
  selected_answer: string | null
  correct_answer: string
  is_correct: 0 | 1
  selected_distractor_type: string | null
  subject_slug: string
  topic_slug: string | null
  related_lesson_slug: string | null
}

interface SkillCatalogRow {
  slug: string
  title: string
  description: string | null
  taxonomy_version: number
  subject_slug: string
  subject_title: string
  topic_slug: string | null
  topic_title: string | null
  related_lesson_slug: string | null
  related_lesson_title: string | null
}

const submittedGeneratedEvidenceSql = `
SELECT
  attempts.user_id,
  'generated_practice' AS source_type,
  attempts.public_id AS attempt_public_id,
  attempts.submitted_at AS attempt_submitted_at,
  snapshots.public_id AS snapshot_public_id,
  NULL AS skill_slug,
  snapshots.generator_slug,
  snapshots.generator_version,
  snapshots.seed AS generator_seed,
  selected.choice_text AS selected_answer,
  correct.choice_text AS correct_answer,
  COALESCE(answers.is_correct, 0) AS is_correct,
  selected.distractor_type AS selected_distractor_type,
  subjects.slug AS subject_slug,
  topics.slug AS topic_slug,
  NULL AS related_lesson_slug
FROM practice_attempts attempts
INNER JOIN practice_sets ON practice_sets.id = attempts.practice_set_id
INNER JOIN lessons ON lessons.id = practice_sets.lesson_id
INNER JOIN topics ON topics.id = lessons.topic_id
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
INNER JOIN generated_question_snapshots snapshots
  ON snapshots.practice_attempt_id = attempts.id
LEFT JOIN generated_practice_attempt_answers answers
  ON answers.attempt_id = attempts.id
  AND answers.snapshot_id = snapshots.id
LEFT JOIN generated_question_choices selected
  ON selected.id = answers.selected_choice_id
INNER JOIN generated_question_choices correct
  ON correct.snapshot_id = snapshots.id
  AND correct.is_correct = 1
WHERE attempts.user_id = ?1
  AND attempts.status = 'submitted'
  AND attempts.submitted_at IS NOT NULL
  AND datetime(attempts.submitted_at) >= datetime(?2)
  AND practice_sets.question_source = 'generated'
  AND courses.slug = 'cse-professional'

UNION ALL

SELECT
  attempts.user_id,
  'subject_assessment' AS source_type,
  attempts.public_id AS attempt_public_id,
  attempts.submitted_at AS attempt_submitted_at,
  snapshots.public_id AS snapshot_public_id,
  NULL AS skill_slug,
  snapshots.generator_slug,
  snapshots.generator_version,
  snapshots.seed AS generator_seed,
  selected.choice_text AS selected_answer,
  correct.choice_text AS correct_answer,
  COALESCE(answers.is_correct, 0) AS is_correct,
  selected.distractor_type AS selected_distractor_type,
  subjects.slug AS subject_slug,
  snapshots.topic_slug,
  NULL AS related_lesson_slug
FROM subject_assessment_attempts attempts
INNER JOIN subject_assessments assessments
  ON assessments.id = attempts.assessment_id
INNER JOIN subjects ON subjects.id = assessments.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
INNER JOIN subject_assessment_question_snapshots snapshots
  ON snapshots.attempt_id = attempts.id
LEFT JOIN subject_assessment_answers answers
  ON answers.attempt_id = attempts.id
  AND answers.snapshot_id = snapshots.id
LEFT JOIN subject_assessment_question_choices selected
  ON selected.id = answers.selected_choice_id
INNER JOIN subject_assessment_question_choices correct
  ON correct.snapshot_id = snapshots.id
  AND correct.is_correct = 1
WHERE attempts.user_id = ?1
  AND attempts.status = 'submitted'
  AND attempts.submitted_at IS NOT NULL
  AND datetime(attempts.submitted_at) >= datetime(?2)
  AND courses.slug = 'cse-professional'

UNION ALL

SELECT
  attempts.user_id,
  'mock_exam' AS source_type,
  attempts.public_id AS attempt_public_id,
  attempts.submitted_at AS attempt_submitted_at,
  snapshots.public_id AS snapshot_public_id,
  NULL AS skill_slug,
  snapshots.generator_slug,
  snapshots.generator_version,
  snapshots.seed AS generator_seed,
  selected.choice_text AS selected_answer,
  correct.choice_text AS correct_answer,
  COALESCE(answers.is_correct, 0) AS is_correct,
  selected.distractor_type AS selected_distractor_type,
  snapshots.subject_slug,
  snapshots.topic_slug,
  NULL AS related_lesson_slug
FROM mock_exam_attempts attempts
INNER JOIN mock_examinations examinations
  ON examinations.id = attempts.mock_exam_id
INNER JOIN courses ON courses.id = examinations.course_id
INNER JOIN mock_exam_question_snapshots snapshots
  ON snapshots.attempt_id = attempts.id
LEFT JOIN mock_exam_answers answers
  ON answers.attempt_id = attempts.id
  AND answers.snapshot_id = snapshots.id
LEFT JOIN mock_exam_question_choices selected
  ON selected.id = answers.selected_choice_id
INNER JOIN mock_exam_question_choices correct
  ON correct.snapshot_id = snapshots.id
  AND correct.is_correct = 1
WHERE attempts.user_id = ?1
  AND attempts.submitted_at IS NOT NULL
  AND datetime(attempts.submitted_at) >= datetime(?2)
  AND (
    attempts.status = 'submitted'
    OR attempts.status = 'expired'
  )
  AND courses.slug = 'cse-professional'

UNION ALL

SELECT
  attempts.user_id,
  'recovery' AS source_type,
  attempts.public_id AS attempt_public_id,
  attempts.submitted_at AS attempt_submitted_at,
  snapshots.public_id AS snapshot_public_id,
  snapshots.skill_slug,
  snapshots.generator_slug,
  snapshots.generator_version,
  snapshots.generator_seed,
  selected.choice_text AS selected_answer,
  correct.choice_text AS correct_answer,
  COALESCE(answers.is_correct, 0) AS is_correct,
  selected.distractor_type AS selected_distractor_type,
  snapshots.subject_slug,
  snapshots.topic_slug,
  snapshots.related_lesson_slug
FROM recovery_attempts attempts
INNER JOIN courses ON courses.id = attempts.course_id
INNER JOIN recovery_question_snapshots snapshots
  ON snapshots.attempt_id = attempts.id
LEFT JOIN recovery_answers answers
  ON answers.attempt_id = attempts.id
  AND answers.snapshot_id = snapshots.id
LEFT JOIN recovery_question_choices selected
  ON selected.id = answers.selected_choice_id
INNER JOIN recovery_question_choices correct
  ON correct.snapshot_id = snapshots.id
  AND correct.is_correct = 1
WHERE attempts.user_id = ?1
  AND attempts.status = 'submitted'
  AND attempts.submitted_at IS NOT NULL
  AND datetime(attempts.submitted_at) >= datetime(?2)
  AND snapshots.source_kind = 'generated'
  AND courses.slug = 'cse-professional'

ORDER BY attempt_submitted_at DESC, attempt_public_id, snapshot_public_id`

export async function findSubmittedGeneratedEvidence(
  database: D1Database,
  userId: number,
  submittedAtOrAfter: string,
): Promise<GeneratedEvidenceRecord[]> {
  const result = await database
    .prepare(submittedGeneratedEvidenceSql)
    .bind(userId, submittedAtOrAfter)
    .all<GeneratedEvidenceRow>()

  return result.results.map((row) => ({
    userId: row.user_id,
    sourceType: row.source_type,
    attemptPublicId: row.attempt_public_id,
    attemptSubmittedAt: row.attempt_submitted_at,
    snapshotPublicId: row.snapshot_public_id,
    skillSlug: row.skill_slug,
    generatorSlug: row.generator_slug,
    generatorVersion: row.generator_version,
    generatorSeed: row.generator_seed,
    selectedAnswer: row.selected_answer,
    correctAnswer: row.correct_answer,
    isCorrect: row.is_correct,
    selectedDistractorType: row.selected_distractor_type,
    subjectSlug: row.subject_slug,
    topicSlug: row.topic_slug,
    relatedLessonSlug: row.related_lesson_slug,
  }))
}

export async function findActiveSmartRecoverySkills(
  database: D1Database,
  taxonomyVersion: number,
): Promise<SkillCatalogEntry[]> {
  const result = await database
    .prepare(
      `SELECT
        skills.slug,
        skills.title,
        skills.description,
        skills.taxonomy_version,
        subjects.slug AS subject_slug,
        subjects.title AS subject_title,
        topics.slug AS topic_slug,
        topics.title AS topic_title,
        lessons.slug AS related_lesson_slug,
        lessons.title AS related_lesson_title
      FROM skills
      INNER JOIN subjects ON subjects.id = skills.subject_id
      INNER JOIN courses ON courses.id = subjects.course_id
      LEFT JOIN topics ON topics.id = skills.topic_id
      LEFT JOIN lessons ON lessons.id = skills.related_lesson_id
      WHERE skills.status = 'active'
        AND skills.taxonomy_version = ?1
        AND courses.slug = 'cse-professional'
      ORDER BY subjects.position, topics.position, skills.title COLLATE NOCASE, skills.slug`,
    )
    .bind(taxonomyVersion)
    .all<SkillCatalogRow>()

  return result.results.map((row) => ({
    slug: row.slug,
    title: row.title,
    description: row.description,
    taxonomyVersion: row.taxonomy_version,
    subjectSlug: row.subject_slug,
    subjectTitle: row.subject_title,
    topicSlug: row.topic_slug,
    topicTitle: row.topic_title,
    relatedLessonSlug: row.related_lesson_slug,
    relatedLessonTitle: row.related_lesson_title,
  }))
}

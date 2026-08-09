import { generatorSkillMappings } from '../domain/smart-recovery-skills'
import type {
  MistakeNotebookRow,
  MistakeNotebookSourceType,
} from '../domain/mistake-notebook'

export interface MistakeNotebookFilters {
  subject?: string
  source?: MistakeNotebookSourceType
  skill?: string
  from?: string
  to?: string
  unansweredOnly: boolean
  repeatedPatternOnly: boolean
}

interface PageRow extends MistakeNotebookRow { total_count: number }
interface SummaryTotalsRow {
  total_mistakes: number
  recent_mistakes: number
  latest_mistake_at: string | null
  reviewed_source_count: number
}
interface CombinedSummaryRow extends SummaryTotalsRow {
  subjects_json: string
  skills_json: string
  patterns_json: string
}
export interface SummaryGroupRow {
  slug: string
  title: string
  count: number
}
export interface SummaryPatternRow { pattern: string; count: number }

const directMappings = generatorSkillMappings
  .filter((mapping) => mapping.mappingKind === 'direct')
  .map((mapping) =>
    `('${mapping.generatorSlug.replaceAll("'", "''")}',${mapping.generatorVersion},'${mapping.skillSlug.replaceAll("'", "''")}')`,
  )
  .join(',')

const mistakeCte = `
WITH generator_skill_map(generator_slug, generator_version, skill_slug) AS (
  VALUES ${directMappings}
),
mistakes AS (
  SELECT
    'practice:' || attempts.public_id || ':' || snapshots.public_id AS entry_id,
    'practice' AS source_type,
    attempts.public_id AS attempt_public_id,
    snapshots.public_id AS snapshot_public_id,
    attempts.submitted_at,
    snapshots.prompt,
    selected.choice_text AS selected_answer,
    correct.choice_text AS correct_answer,
    snapshots.explanation_json,
    CASE WHEN answers.selected_choice_id IS NULL THEN 1 ELSE 0 END AS was_unanswered,
    subjects.slug AS subject_slug,
    subjects.title AS subject_title,
    topics.slug AS topic_slug,
    topics.title AS topic_title,
    skills.slug AS skill_slug,
    skills.title AS skill_title,
    skills.status AS skill_status,
    selected.distractor_type AS mistake_pattern,
    COALESCE(related_lessons.title, practice_lessons.title) AS related_lesson_title,
    '/courses/' || courses.slug || '/lessons/' || COALESCE(related_lessons.public_id, practice_lessons.public_id) AS related_lesson_route,
    '/courses/' || courses.slug || '/lessons/' || practice_lessons.public_id AS practice_route
  FROM practice_attempts attempts
  INNER JOIN practice_sets ON practice_sets.id = attempts.practice_set_id
  INNER JOIN lessons practice_lessons ON practice_lessons.id = practice_sets.lesson_id
  INNER JOIN topics ON topics.id = practice_lessons.topic_id
  INNER JOIN subjects ON subjects.id = topics.subject_id
  INNER JOIN courses ON courses.id = subjects.course_id
  INNER JOIN generated_question_snapshots snapshots
    ON snapshots.practice_attempt_id = attempts.id
  LEFT JOIN generated_practice_attempt_answers answers
    ON answers.attempt_id = attempts.id AND answers.snapshot_id = snapshots.id
  LEFT JOIN generated_question_choices selected ON selected.id = answers.selected_choice_id
  INNER JOIN generated_question_choices correct
    ON correct.snapshot_id = snapshots.id AND correct.is_correct = 1
  LEFT JOIN generator_skill_map mapping
    ON mapping.generator_slug = snapshots.generator_slug
    AND mapping.generator_version = snapshots.generator_version
  LEFT JOIN skills ON skills.slug = mapping.skill_slug
  LEFT JOIN lessons related_lessons ON related_lessons.id = skills.related_lesson_id
  WHERE attempts.user_id = ?
    AND attempts.status = 'submitted'
    AND attempts.submitted_at IS NOT NULL
    AND courses.slug = 'cse-professional'
    AND COALESCE(answers.is_correct, 0) = 0

  UNION ALL

  SELECT
    'subject_assessment:' || attempts.public_id || ':' || snapshots.public_id,
    'subject_assessment', attempts.public_id, snapshots.public_id,
    attempts.submitted_at, snapshots.prompt,
    COALESCE(answers.selected_choice_text_snapshot, selected.choice_text),
    COALESCE(answers.correct_choice_text_snapshot, correct.choice_text),
    snapshots.explanation_json,
    CASE WHEN answers.selected_choice_id IS NULL THEN 1 ELSE 0 END,
    subjects.slug, subjects.title,
    snapshots.topic_slug, snapshots.topic_title,
    skills.slug, skills.title, skills.status,
    selected.distractor_type,
    related_lessons.title,
    CASE WHEN related_lessons.public_id IS NULL THEN NULL
      ELSE '/courses/' || courses.slug || '/lessons/' || related_lessons.public_id END,
    NULL
  FROM subject_assessment_attempts attempts
  INNER JOIN subject_assessments assessments ON assessments.id = attempts.assessment_id
  INNER JOIN subjects ON subjects.id = assessments.subject_id
  INNER JOIN courses ON courses.id = subjects.course_id
  INNER JOIN subject_assessment_question_snapshots snapshots ON snapshots.attempt_id = attempts.id
  LEFT JOIN subject_assessment_answers answers
    ON answers.attempt_id = attempts.id AND answers.snapshot_id = snapshots.id
  LEFT JOIN subject_assessment_question_choices selected ON selected.id = answers.selected_choice_id
  INNER JOIN subject_assessment_question_choices correct
    ON correct.snapshot_id = snapshots.id AND correct.is_correct = 1
  LEFT JOIN generator_skill_map mapping
    ON mapping.generator_slug = snapshots.generator_slug
    AND mapping.generator_version = snapshots.generator_version
  LEFT JOIN skills ON skills.slug = mapping.skill_slug
  LEFT JOIN lessons related_lessons ON related_lessons.id = skills.related_lesson_id
  WHERE attempts.user_id = ?
    AND attempts.status = 'submitted'
    AND attempts.submitted_at IS NOT NULL
    AND courses.slug = 'cse-professional'
    AND COALESCE(answers.is_correct, 0) = 0

  UNION ALL

  SELECT
    'mock_exam:' || attempts.public_id || ':' || snapshots.public_id,
    'mock_exam', attempts.public_id, snapshots.public_id,
    attempts.submitted_at, snapshots.prompt,
    COALESCE(answers.selected_choice_text_snapshot, selected.choice_text),
    COALESCE(answers.correct_choice_text_snapshot, correct.choice_text),
    snapshots.explanation_json,
    CASE WHEN answers.selected_choice_id IS NULL THEN 1 ELSE 0 END,
    snapshots.subject_slug, snapshots.subject_title,
    snapshots.topic_slug, snapshots.topic_title,
    skills.slug, skills.title, skills.status,
    selected.distractor_type,
    related_lessons.title,
    CASE WHEN related_lessons.public_id IS NULL THEN NULL
      ELSE '/courses/' || courses.slug || '/lessons/' || related_lessons.public_id END,
    NULL
  FROM mock_exam_attempts attempts
  INNER JOIN mock_examinations exams ON exams.id = attempts.mock_exam_id
  INNER JOIN courses ON courses.id = exams.course_id
  INNER JOIN mock_exam_question_snapshots snapshots ON snapshots.attempt_id = attempts.id
  LEFT JOIN mock_exam_answers answers
    ON answers.attempt_id = attempts.id AND answers.snapshot_id = snapshots.id
  LEFT JOIN mock_exam_question_choices selected ON selected.id = answers.selected_choice_id
  INNER JOIN mock_exam_question_choices correct
    ON correct.snapshot_id = snapshots.id AND correct.is_correct = 1
  LEFT JOIN generator_skill_map mapping
    ON mapping.generator_slug = snapshots.generator_slug
    AND mapping.generator_version = snapshots.generator_version
  LEFT JOIN skills ON skills.slug = mapping.skill_slug
  LEFT JOIN lessons related_lessons ON related_lessons.id = skills.related_lesson_id
  WHERE attempts.user_id = ?
    AND attempts.status IN ('submitted', 'expired')
    AND attempts.submitted_at IS NOT NULL
    AND courses.slug = 'cse-professional'
    AND COALESCE(answers.is_correct, 0) = 0

  UNION ALL

  SELECT
    'smart_recovery:' || attempts.public_id || ':' || snapshots.public_id,
    'smart_recovery', attempts.public_id, snapshots.public_id,
    attempts.submitted_at, snapshots.prompt,
    COALESCE(answers.selected_choice_text_snapshot, selected.choice_text),
    COALESCE(answers.correct_choice_text_snapshot, correct.choice_text),
    snapshots.explanation_json,
    CASE WHEN answers.selected_choice_id IS NULL THEN 1 ELSE 0 END,
    snapshots.subject_slug, snapshots.subject_title,
    snapshots.topic_slug, snapshots.topic_title,
    snapshots.skill_slug, snapshots.skill_title, skills.status,
    selected.distractor_type,
    snapshots.related_lesson_title,
    CASE WHEN related_lessons.public_id IS NULL THEN NULL
      ELSE '/courses/' || courses.slug || '/lessons/' || related_lessons.public_id END,
    NULL
  FROM recovery_attempts attempts
  INNER JOIN courses ON courses.id = attempts.course_id
  INNER JOIN recovery_question_snapshots snapshots ON snapshots.attempt_id = attempts.id
  LEFT JOIN recovery_answers answers
    ON answers.attempt_id = attempts.id AND answers.snapshot_id = snapshots.id
  LEFT JOIN recovery_question_choices selected ON selected.id = answers.selected_choice_id
  INNER JOIN recovery_question_choices correct
    ON correct.snapshot_id = snapshots.id AND correct.is_correct = 1
  LEFT JOIN skills ON skills.id = snapshots.skill_id
  LEFT JOIN lessons related_lessons ON related_lessons.id = skills.related_lesson_id
  WHERE attempts.user_id = ?
    AND attempts.status = 'submitted'
    AND attempts.submitted_at IS NOT NULL
    AND courses.slug = 'cse-professional'
    AND COALESCE(answers.is_correct, 0) = 0
)
`

function filterSql(filters: MistakeNotebookFilters): { sql: string; values: unknown[] } {
  const clauses = ["trim(prompt) <> ''", "trim(correct_answer) <> ''"]
  const values: unknown[] = []
  if (filters.subject !== undefined) { clauses.push('subject_slug = ?'); values.push(filters.subject) }
  if (filters.source !== undefined) { clauses.push('source_type = ?'); values.push(filters.source) }
  if (filters.skill !== undefined) { clauses.push('skill_slug = ?'); values.push(filters.skill) }
  if (filters.from !== undefined) { clauses.push('datetime(submitted_at) >= datetime(?)'); values.push(filters.from) }
  if (filters.to !== undefined) { clauses.push('datetime(submitted_at) <= datetime(?)'); values.push(filters.to) }
  if (filters.unansweredOnly) clauses.push('was_unanswered = 1')
  const base = clauses.join(' AND ')
  const repeated = filters.repeatedPatternOnly
    ? ` AND mistake_pattern IS NOT NULL AND mistake_pattern IN (
        SELECT mistake_pattern FROM filtered_base
        WHERE mistake_pattern IS NOT NULL
        GROUP BY mistake_pattern HAVING COUNT(*) > 1
      )`
    : ''
  return {
    sql: `, filtered_base AS (SELECT * FROM mistakes WHERE ${base}),
      filtered AS (SELECT * FROM filtered_base WHERE 1 = 1${repeated})`,
    values,
  }
}

function userBindings(userId: number): unknown[] { return [userId, userId, userId, userId] }

export async function findMistakeNotebookPage(
  database: D1Database,
  userId: number,
  filters: MistakeNotebookFilters,
  limit: number,
  offset: number,
): Promise<{ rows: MistakeNotebookRow[]; total: number }> {
  const filter = filterSql(filters)
  const result = await database.prepare(`${mistakeCte}${filter.sql}
    SELECT filtered.*, COUNT(*) OVER() AS total_count
    FROM filtered
    ORDER BY datetime(submitted_at) DESC, attempt_public_id DESC, snapshot_public_id DESC
    LIMIT ? OFFSET ?`)
    .bind(...userBindings(userId), ...filter.values, limit, offset)
    .all<PageRow>()
  const total = result.results[0]?.total_count ?? 0
  return { rows: result.results, total }
}
export async function findMistakeNotebookEntry(
  database: D1Database,
  userId: number,
  entryId: string,
): Promise<MistakeNotebookRow | null> {
  return database.prepare(`${mistakeCte}
    SELECT * FROM mistakes WHERE entry_id = ? LIMIT 1`)
    .bind(...userBindings(userId), entryId)
    .first<MistakeNotebookRow>()
}

export async function findMistakeNotebookSummaryRows(
  database: D1Database,
  userId: number,
): Promise<{
  totals: SummaryTotalsRow
  subjects: SummaryGroupRow[]
  skills: SummaryGroupRow[]
  patterns: SummaryPatternRow[]
}> {
  const row = await database.prepare(`${mistakeCte}
    SELECT
      COUNT(*) AS total_mistakes,
      COALESCE(SUM(CASE WHEN datetime(submitted_at) >= datetime('now', '-30 days') THEN 1 ELSE 0 END), 0) AS recent_mistakes,
      MAX(submitted_at) AS latest_mistake_at,
      COUNT(DISTINCT source_type || ':' || attempt_public_id) AS reviewed_source_count,
      COALESCE((SELECT json_group_array(json_object('slug', slug, 'title', title, 'count', count))
        FROM (SELECT subject_slug AS slug, subject_title AS title, COUNT(*) AS count
          FROM mistakes WHERE subject_slug IS NOT NULL AND subject_title IS NOT NULL
          GROUP BY subject_slug, subject_title ORDER BY count DESC, title LIMIT 20)), '[]') AS subjects_json,
      COALESCE((SELECT json_group_array(json_object('slug', slug, 'title', title, 'count', count))
        FROM (SELECT skill_slug AS slug, skill_title AS title, COUNT(*) AS count
          FROM mistakes WHERE skill_slug IS NOT NULL AND skill_title IS NOT NULL
          GROUP BY skill_slug, skill_title ORDER BY count DESC, title LIMIT 5)), '[]') AS skills_json,
      COALESCE((SELECT json_group_array(json_object('pattern', pattern, 'count', count))
        FROM (SELECT mistake_pattern AS pattern, COUNT(*) AS count
          FROM mistakes WHERE mistake_pattern IS NOT NULL
          GROUP BY mistake_pattern HAVING COUNT(*) > 1
          ORDER BY count DESC, pattern LIMIT 5)), '[]') AS patterns_json
    FROM mistakes`)
    .bind(...userBindings(userId))
    .first<CombinedSummaryRow>()
  if (row === null) throw new Error('Mistake Notebook summary could not be calculated.')
  return {
    totals: row,
    subjects: JSON.parse(row.subjects_json) as SummaryGroupRow[],
    skills: JSON.parse(row.skills_json) as SummaryGroupRow[],
    patterns: JSON.parse(row.patterns_json) as SummaryPatternRow[],
  }
}
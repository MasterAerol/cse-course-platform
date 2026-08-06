import type { RecoveryGeneratedQuestion } from '../domain/smart-recovery-attempt'

export interface RecoveryAttemptRow {
  id: number
  public_id: string
  user_id: number
  course_id: number
  course_slug: string
  attempt_seed: string
  idempotency_key: string
  status: 'in_progress' | 'submitted'
  taxonomy_version: number
  weakness_formula_version: number
  question_count: number
  correct_count: number
  score_percent: number | null
  started_at: string
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface RecoveryQuestionChoiceRow {
  snapshot_id: number
  snapshot_public_id: string
  source_position: number
  skill_id: number
  skill_slug: string
  skill_title: string
  subject_slug: string
  subject_title: string
  topic_slug: string | null
  topic_title: string | null
  related_lesson_slug: string | null
  related_lesson_title: string | null
  related_lesson_public_id: string | null
  generator_slug: string
  generator_version: number
  generator_seed: string
  difficulty: 'easy' | 'medium' | 'hard'
  prompt: string
  explanation_json: string
  parameters_json: string
  metadata_json: string
  choice_id: number
  choice_public_id: string
  choice_text: string
  is_correct: 0 | 1
  choice_position: number
  distractor_type: string | null
  selected_choice_id: number | null
  selected_choice_text_snapshot: string | null
  correct_choice_text_snapshot: string | null
  answer_is_correct: 0 | 1 | null
  points_awarded: number | null
  answered_at: string | null
}

export interface RecoveryAnswerRow {
  snapshot_id: number
  selected_choice_id: number | null
  selected_choice_text_snapshot: string | null
  correct_choice_text_snapshot: string | null
  is_correct: 0 | 1 | null
  points_awarded: number
  answered_at: string | null
}

export interface RecentGeneratedIdentityRow {
  generator_slug: string
  generator_version: number
  generator_seed: string
  metadata_json: string
  prompt: string
}

const attemptSelect = `
  attempts.id,
  attempts.public_id,
  attempts.user_id,
  attempts.course_id,
  courses.slug AS course_slug,
  attempts.attempt_seed,
  attempts.idempotency_key,
  attempts.status,
  attempts.taxonomy_version,
  attempts.weakness_formula_version,
  attempts.question_count,
  attempts.correct_count,
  attempts.score_percent,
  attempts.started_at,
  attempts.submitted_at,
  attempts.created_at,
  attempts.updated_at`

export async function findRecoveryAttemptByPublicId(
  database: D1Database,
  publicId: string,
): Promise<RecoveryAttemptRow | null> {
  return database
    .prepare(
      `SELECT ${attemptSelect}
      FROM recovery_attempts attempts
      INNER JOIN courses ON courses.id = attempts.course_id
      WHERE attempts.public_id = ?1
      LIMIT 1`,
    )
    .bind(publicId)
    .first<RecoveryAttemptRow>()
}

export async function findRecoveryAttemptByIdempotencyKey(
  database: D1Database,
  userId: number,
  idempotencyKey: string,
): Promise<RecoveryAttemptRow | null> {
  return database
    .prepare(
      `SELECT ${attemptSelect}
      FROM recovery_attempts attempts
      INNER JOIN courses ON courses.id = attempts.course_id
      WHERE attempts.user_id = ?1 AND attempts.idempotency_key = ?2
      LIMIT 1`,
    )
    .bind(userId, idempotencyKey)
    .first<RecoveryAttemptRow>()
}

export async function findActiveRecoveryAttempt(
  database: D1Database,
  userId: number,
  courseId: number,
): Promise<RecoveryAttemptRow | null> {
  return database
    .prepare(
      `SELECT ${attemptSelect}
      FROM recovery_attempts attempts
      INNER JOIN courses ON courses.id = attempts.course_id
      WHERE attempts.user_id = ?1
        AND attempts.course_id = ?2
        AND attempts.status = 'in_progress'
      LIMIT 1`,
    )
    .bind(userId, courseId)
    .first<RecoveryAttemptRow>()
}

export async function findLatestSubmittedRecoveryAttempt(
  database: D1Database,
  userId: number,
  courseId: number,
): Promise<RecoveryAttemptRow | null> {
  return database
    .prepare(
      `SELECT ${attemptSelect}
      FROM recovery_attempts attempts
      INNER JOIN courses ON courses.id = attempts.course_id
      WHERE attempts.user_id = ?1
        AND attempts.course_id = ?2
        AND attempts.status = 'submitted'
      ORDER BY datetime(attempts.submitted_at) DESC, attempts.id DESC
      LIMIT 1`,
    )
    .bind(userId, courseId)
    .first<RecoveryAttemptRow>()
}

export async function findRecentGeneratedIdentities(
  database: D1Database,
  userId: number,
  limit = 500,
): Promise<RecentGeneratedIdentityRow[]> {
  const result = await database
    .prepare(
      `SELECT generator_slug, generator_version, generator_seed,
        metadata_json, prompt
      FROM (
        SELECT snapshots.generator_slug, snapshots.generator_version,
          snapshots.seed AS generator_seed, snapshots.metadata_json,
          snapshots.prompt, attempts.started_at AS seen_at
        FROM generated_question_snapshots snapshots
        INNER JOIN practice_attempts attempts
          ON attempts.id = snapshots.practice_attempt_id
        WHERE attempts.user_id = ?1
        UNION ALL
        SELECT snapshots.generator_slug, snapshots.generator_version,
          snapshots.seed, snapshots.metadata_json, snapshots.prompt,
          attempts.started_at
        FROM subject_assessment_question_snapshots snapshots
        INNER JOIN subject_assessment_attempts attempts
          ON attempts.id = snapshots.attempt_id
        WHERE attempts.user_id = ?1
        UNION ALL
        SELECT snapshots.generator_slug, snapshots.generator_version,
          snapshots.seed, snapshots.metadata_json, snapshots.prompt,
          attempts.created_at
        FROM mock_exam_question_snapshots snapshots
        INNER JOIN mock_exam_attempts attempts
          ON attempts.id = snapshots.attempt_id
        WHERE attempts.user_id = ?1
        UNION ALL
        SELECT snapshots.generator_slug, snapshots.generator_version,
          snapshots.generator_seed, snapshots.metadata_json,
          snapshots.prompt, attempts.created_at
        FROM recovery_question_snapshots snapshots
        INNER JOIN recovery_attempts attempts
          ON attempts.id = snapshots.attempt_id
        WHERE attempts.user_id = ?1 AND snapshots.source_kind = 'generated'
      ) recent
      ORDER BY datetime(seen_at) DESC
      LIMIT ?2`,
    )
    .bind(userId, limit)
    .all<RecentGeneratedIdentityRow>()
  return result.results
}

export async function createRecoveryAttemptWithSnapshots(
  database: D1Database,
  input: {
    attemptPublicId: string
    userId: number
    courseId: number
    attemptSeed: string
    idempotencyKey: string
    taxonomyVersion: number
    formulaVersion: number
    questions: readonly RecoveryGeneratedQuestion[]
  },
): Promise<RecoveryAttemptRow | null> {
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `INSERT INTO recovery_attempts (
          public_id, user_id, course_id, attempt_seed, idempotency_key,
          taxonomy_version, weakness_formula_version, question_count
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .bind(
        input.attemptPublicId,
        input.userId,
        input.courseId,
        input.attemptSeed,
        input.idempotencyKey,
        input.taxonomyVersion,
        input.formulaVersion,
        input.questions.length,
      ),
  ]

  for (const item of input.questions) {
    const snapshotPublicId = `recovery-question-${crypto.randomUUID()}`
    const metadata = {
      ...item.question.metadata,
      recovery: { statusBefore: item.skill.status },
    }
    statements.push(
      database
        .prepare(
          `INSERT INTO recovery_question_snapshots (
            public_id, attempt_id, source_position, skill_id, skill_slug,
            skill_title, subject_slug, subject_title, topic_slug, topic_title,
            related_lesson_slug, related_lesson_title, source_kind,
            generator_slug, generator_version, generator_seed, difficulty,
            prompt, explanation_json, parameters_json, metadata_json
          ) VALUES (
            ?1,
            (SELECT id FROM recovery_attempts WHERE public_id = ?2),
            ?3,
            (SELECT id FROM skills WHERE slug = ?4 AND status = 'active'
              AND taxonomy_version = ?5),
            ?4, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'generated',
            ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20
          )`,
        )
        .bind(
          snapshotPublicId,
          input.attemptPublicId,
          item.position,
          item.skill.skill.slug,
          input.taxonomyVersion,
          item.skill.skill.title,
          item.skill.skill.subjectSlug,
          item.skill.skill.subjectTitle,
          item.skill.skill.topicSlug,
          item.skill.skill.topicTitle,
          item.skill.skill.relatedLessonSlug,
          item.skill.skill.relatedLessonTitle,
          item.question.generatorSlug,
          item.question.generatorVersion,
          item.question.seed,
          item.question.difficulty,
          item.question.prompt,
          JSON.stringify(item.question.explanation),
          JSON.stringify(item.question.parameters),
          JSON.stringify(metadata),
        ),
    )

    item.question.choices.forEach((choice, index) => {
      statements.push(
        database
          .prepare(
            `INSERT INTO recovery_question_choices (
              public_id, snapshot_id, choice_text, is_correct, position,
              distractor_type
            ) VALUES (
              ?1,
              (SELECT id FROM recovery_question_snapshots WHERE public_id = ?2),
              ?3, ?4, ?5, ?6
            )`,
          )
          .bind(
            `recovery-choice-${crypto.randomUUID()}`,
            snapshotPublicId,
            choice.text,
            choice.isCorrect ? 1 : 0,
            index + 1,
            choice.distractorType,
          ),
      )
    })
  }

  await database.batch(statements)
  return findRecoveryAttemptByPublicId(database, input.attemptPublicId)
}

export async function findRecoveryQuestionsWithChoices(
  database: D1Database,
  attemptId: number,
): Promise<RecoveryQuestionChoiceRow[]> {
  const result = await database
    .prepare(
      `SELECT
        snapshots.id AS snapshot_id,
        snapshots.public_id AS snapshot_public_id,
        snapshots.source_position,
        snapshots.skill_id,
        snapshots.skill_slug,
        snapshots.skill_title,
        snapshots.subject_slug,
        snapshots.subject_title,
        snapshots.topic_slug,
        snapshots.topic_title,
        snapshots.related_lesson_slug,
        snapshots.related_lesson_title,
        lessons.public_id AS related_lesson_public_id,
        snapshots.generator_slug,
        snapshots.generator_version,
        snapshots.generator_seed,
        snapshots.difficulty,
        snapshots.prompt,
        snapshots.explanation_json,
        snapshots.parameters_json,
        snapshots.metadata_json,
        choices.id AS choice_id,
        choices.public_id AS choice_public_id,
        choices.choice_text,
        choices.is_correct,
        choices.position AS choice_position,
        choices.distractor_type,
        answers.selected_choice_id,
        answers.selected_choice_text_snapshot,
        answers.correct_choice_text_snapshot,
        answers.is_correct AS answer_is_correct,
        answers.points_awarded,
        answers.answered_at
      FROM recovery_question_snapshots snapshots
      INNER JOIN recovery_question_choices choices
        ON choices.snapshot_id = snapshots.id
      LEFT JOIN recovery_answers answers
        ON answers.attempt_id = snapshots.attempt_id
        AND answers.snapshot_id = snapshots.id
      LEFT JOIN skills ON skills.id = snapshots.skill_id
      LEFT JOIN lessons ON lessons.id = skills.related_lesson_id
      WHERE snapshots.attempt_id = ?1
      ORDER BY snapshots.source_position, choices.position`,
    )
    .bind(attemptId)
    .all<RecoveryQuestionChoiceRow>()
  return result.results
}

export async function findRecoveryAnswers(
  database: D1Database,
  attemptId: number,
): Promise<RecoveryAnswerRow[]> {
  const result = await database
    .prepare(
      `SELECT snapshot_id, selected_choice_id, selected_choice_text_snapshot,
        correct_choice_text_snapshot, is_correct, points_awarded, answered_at
      FROM recovery_answers
      WHERE attempt_id = ?1`,
    )
    .bind(attemptId)
    .all<RecoveryAnswerRow>()
  return result.results
}

export async function findRecoverySnapshotInAttempt(
  database: D1Database,
  attemptId: number,
  snapshotPublicId: string,
): Promise<{ id: number } | null> {
  return database
    .prepare(
      `SELECT id FROM recovery_question_snapshots
      WHERE attempt_id = ?1 AND public_id = ?2 LIMIT 1`,
    )
    .bind(attemptId, snapshotPublicId)
    .first<{ id: number }>()
}

export async function findRecoveryChoiceInSnapshot(
  database: D1Database,
  snapshotId: number,
  choicePublicId: string,
): Promise<{ id: number; public_id: string } | null> {
  return database
    .prepare(
      `SELECT id, public_id FROM recovery_question_choices
      WHERE snapshot_id = ?1 AND public_id = ?2 LIMIT 1`,
    )
    .bind(snapshotId, choicePublicId)
    .first<{ id: number; public_id: string }>()
}

export async function saveRecoveryAnswerRow(
  database: D1Database,
  input: { attemptId: number; snapshotId: number; choiceId: number },
): Promise<{ answeredAt: string }> {
  await database
    .prepare(
      `INSERT INTO recovery_answers (
        attempt_id, snapshot_id, selected_choice_id,
        selected_choice_text_snapshot, answered_at
      ) VALUES (
        ?1, ?2, ?3,
        (SELECT choice_text FROM recovery_question_choices WHERE id = ?3),
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(attempt_id, snapshot_id) DO UPDATE SET
        selected_choice_id = excluded.selected_choice_id,
        selected_choice_text_snapshot = excluded.selected_choice_text_snapshot,
        correct_choice_text_snapshot = NULL,
        is_correct = NULL,
        points_awarded = 0,
        answered_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(input.attemptId, input.snapshotId, input.choiceId)
    .run()
  const row = await database
    .prepare(
      `SELECT answered_at FROM recovery_answers
      WHERE attempt_id = ?1 AND snapshot_id = ?2`,
    )
    .bind(input.attemptId, input.snapshotId)
    .first<{ answered_at: string }>()
  if (row === null) throw new Error('Saved recovery answer could not be loaded.')
  return { answeredAt: row.answered_at }
}

export async function submitRecoveryAttemptRows(
  database: D1Database,
  input: {
    attemptId: number
    correctCount: number
    questionCount: number
    scorePercent: number
    scores: ReadonlyArray<{
      snapshotId: number
      selectedChoiceId: number | null
      isCorrect: boolean
    }>
  },
): Promise<void> {
  const statements = input.scores.map((score) =>
    database
      .prepare(
        `INSERT INTO recovery_answers (
          attempt_id, snapshot_id, selected_choice_id,
          selected_choice_text_snapshot, correct_choice_text_snapshot,
          is_correct, points_awarded, answered_at
        ) VALUES (
          ?1, ?2, ?3,
          (SELECT choice_text FROM recovery_question_choices WHERE id = ?3),
          (SELECT choice_text FROM recovery_question_choices
           WHERE snapshot_id = ?2 AND is_correct = 1 LIMIT 1),
          ?4, ?5, CURRENT_TIMESTAMP
        )
        ON CONFLICT(attempt_id, snapshot_id) DO UPDATE SET
          selected_choice_text_snapshot = COALESCE(
            recovery_answers.selected_choice_text_snapshot,
            excluded.selected_choice_text_snapshot
          ),
          correct_choice_text_snapshot = excluded.correct_choice_text_snapshot,
          is_correct = excluded.is_correct,
          points_awarded = excluded.points_awarded,
          answered_at = COALESCE(recovery_answers.answered_at, excluded.answered_at),
          updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        input.attemptId,
        score.snapshotId,
        score.selectedChoiceId,
        score.isCorrect ? 1 : 0,
        score.isCorrect ? 1 : 0,
      ),
  )
  statements.push(
    database
      .prepare(
        `UPDATE recovery_attempts
        SET status = 'submitted', correct_count = ?2,
          question_count = ?3, score_percent = ?4,
          submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1 AND status = 'in_progress'`,
      )
      .bind(
        input.attemptId,
        input.correctCount,
        input.questionCount,
        input.scorePercent,
      ),
  )
  await database.batch(statements)
}

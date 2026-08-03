import type {
  GeneratedSubjectAssessmentQuestion,
  SubjectAssessmentBlueprint,
} from '../domain/subject-assessment-blueprint'

export interface SubjectAssessmentRow {
  id: number
  public_id: string
  subject_id: number
  subject_title: string
  subject_slug: string
  course_id: number
  course_title: string
  course_slug: string
  title: string
  slug: string
  description: string | null
  position: number
  passing_score: number
  question_count: number
  maximum_attempts: number | null
  time_limit_minutes: number | null
  show_explanations: 0 | 1
  current_blueprint_version: number
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

export interface BlueprintTopicGeneratorRow {
  blueprint_id: number
  blueprint_version: number
  blueprint_total_questions: number
  blueprint_passing_score: number
  blueprint_topic_id: number
  topic_id: number
  topic_slug: string
  topic_title: string
  topic_status: 'draft' | 'published' | 'archived'
  topic_position: number
  question_count: number
  easy_count: number
  medium_count: number
  hard_count: number
  generator_slug: string
  generator_version: number
  rotation_position: number
  selection_weight: number
}

export interface SubjectAssessmentAttemptRow {
  id: number
  public_id: string
  assessment_id: number
  blueprint_id: number
  user_id: number
  attempt_seed: string
  attempt_number: number
  status: 'in_progress' | 'submitted' | 'abandoned'
  total_points: number
  earned_points: number
  score_percent: number | null
  passed: 0 | 1 | null
  started_at: string
  submitted_at: string | null
  assessment_title: string
  assessment_slug: string
  passing_score: number
  question_count: number
  show_explanations: 0 | 1
  blueprint_version: number
  subject_title: string
  subject_slug: string
  course_id: number
  course_slug: string
}

export interface SubjectAssessmentQuestionChoiceRow {
  snapshot_id: number
  snapshot_public_id: string
  source_position: number
  topic_slug: string
  topic_title: string
  topic_position: number
  generator_slug: string
  generator_version: number
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
}

export interface SubjectAssessmentAnswerRow {
  snapshot_id: number
  selected_choice_id: number | null
  selected_choice_text_snapshot: string | null
  correct_choice_text_snapshot: string | null
  is_correct: 0 | 1 | null
  points_awarded: number
  answered_at: string | null
}

export interface SubjectAssessmentHistoryRow {
  attempt_public_id: string
  attempt_number: number
  status: 'in_progress' | 'submitted' | 'abandoned'
  earned_points: number
  total_points: number
  score_percent: number | null
  passed: 0 | 1 | null
  started_at: string
  submitted_at: string | null
}

const assessmentSelect = `subject_assessments.id,
  subject_assessments.public_id,
  subject_assessments.subject_id,
  subjects.title AS subject_title,
  subjects.slug AS subject_slug,
  courses.id AS course_id,
  courses.title AS course_title,
  courses.slug AS course_slug,
  subject_assessments.title,
  subject_assessments.slug,
  subject_assessments.description,
  subject_assessments.position,
  subject_assessments.passing_score,
  subject_assessments.question_count,
  subject_assessments.maximum_attempts,
  subject_assessments.time_limit_minutes,
  subject_assessments.show_explanations,
  subject_assessments.current_blueprint_version,
  subject_assessments.status,
  subject_assessments.created_at,
  subject_assessments.updated_at`

export async function findSubjectAssessmentBySlug(
  database: D1Database,
  slug: string,
): Promise<SubjectAssessmentRow | null> {
  return database
    .prepare(
      `SELECT ${assessmentSelect}
      FROM subject_assessments
      INNER JOIN subjects ON subjects.id = subject_assessments.subject_id
      INNER JOIN courses ON courses.id = subjects.course_id
      WHERE subject_assessments.slug = ?1
      LIMIT 1`,
    )
    .bind(slug)
    .first<SubjectAssessmentRow>()
}

export async function findPublishedSubjectAssessmentForCourse(
  database: D1Database,
  courseId: number,
): Promise<SubjectAssessmentRow | null> {
  return database
    .prepare(
      `SELECT ${assessmentSelect}
      FROM subject_assessments
      INNER JOIN subjects
        ON subjects.id = subject_assessments.subject_id
        AND subjects.status = 'published'
      INNER JOIN courses
        ON courses.id = subjects.course_id
        AND courses.status = 'published'
      WHERE courses.id = ?1
        AND subject_assessments.status = 'published'
      ORDER BY subject_assessments.position
      LIMIT 1`,
    )
    .bind(courseId)
    .first<SubjectAssessmentRow>()
}

export async function findPublishedSubjectAssessmentsForCourse(
  database: D1Database,
  courseId: number,
): Promise<SubjectAssessmentRow[]> {
  const result = await database.prepare(
    `SELECT ${assessmentSelect}
    FROM subject_assessments
    INNER JOIN subjects ON subjects.id = subject_assessments.subject_id AND subjects.status = 'published'
    INNER JOIN courses ON courses.id = subjects.course_id AND courses.status = 'published'
    WHERE courses.id = ?1 AND subject_assessments.status = 'published'
    ORDER BY subjects.position, subject_assessments.position`,
  ).bind(courseId).all<SubjectAssessmentRow>()
  return result.results
}

export async function findSubjectForAssessmentAdmin(
  database: D1Database,
  courseSlug: string,
  subjectSlug: string,
): Promise<{
  subject_id: number
  subject_title: string
  subject_status: string
  course_id: number
  course_status: string
}> {
  const row = await database
    .prepare(
      `SELECT
        subjects.id AS subject_id,
        subjects.title AS subject_title,
        subjects.status AS subject_status,
        courses.id AS course_id,
        courses.status AS course_status
      FROM subjects
      INNER JOIN courses ON courses.id = subjects.course_id
      WHERE courses.slug = ?1
        AND subjects.slug = ?2
      LIMIT 1`,
    )
    .bind(courseSlug, subjectSlug)
    .first<{
      subject_id: number
      subject_title: string
      subject_status: string
      course_id: number
      course_status: string
    }>()

  if (row === null) {
    throw new Error('Assessment subject was not found.')
  }
  return row
}

export async function upsertSubjectAssessment(
  database: D1Database,
  input: {
    publicId: string
    subjectId: number
    title: string
    slug: string
    description: string
    position: number
    passingScore: number
    questionCount: number
    maximumAttempts: number | null
    timeLimitMinutes: number | null
    showExplanations: boolean
    blueprintVersion: number
    status: 'draft' | 'published'
  },
): Promise<SubjectAssessmentRow | null> {
  await database
    .prepare(
      `INSERT INTO subject_assessments (
        public_id, subject_id, title, slug, description, position,
        passing_score, question_count, maximum_attempts, time_limit_minutes,
        show_explanations, current_blueprint_version, status
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
      ON CONFLICT(slug) DO UPDATE SET
        subject_id = excluded.subject_id,
        title = excluded.title,
        description = excluded.description,
        position = excluded.position,
        passing_score = excluded.passing_score,
        question_count = excluded.question_count,
        maximum_attempts = excluded.maximum_attempts,
        time_limit_minutes = excluded.time_limit_minutes,
        show_explanations = excluded.show_explanations,
        current_blueprint_version = excluded.current_blueprint_version,
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      input.publicId,
      input.subjectId,
      input.title,
      input.slug,
      input.description,
      input.position,
      input.passingScore,
      input.questionCount,
      input.maximumAttempts,
      input.timeLimitMinutes,
      input.showExplanations ? 1 : 0,
      input.blueprintVersion,
      input.status,
    )
    .run()

  return findSubjectAssessmentBySlug(database, input.slug)
}

export async function replaceSubjectAssessmentBlueprint(
  database: D1Database,
  assessmentId: number,
  blueprint: SubjectAssessmentBlueprint,
  topicIds: ReadonlyMap<string, number>,
): Promise<void> {
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `INSERT INTO subject_assessment_blueprints (
          assessment_id, version, total_questions, passing_score_percent
        ) VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(assessment_id, version) DO UPDATE SET
          total_questions = excluded.total_questions,
          passing_score_percent = excluded.passing_score_percent`,
      )
      .bind(
        assessmentId,
        blueprint.version,
        blueprint.totalQuestions,
        blueprint.passingScorePercent,
      ),
    database
      .prepare(
        `DELETE FROM subject_assessment_blueprint_topics
        WHERE blueprint_id = (
          SELECT id FROM subject_assessment_blueprints
          WHERE assessment_id = ?1 AND version = ?2
        )`,
      )
      .bind(assessmentId, blueprint.version),
  ]

  for (const topic of blueprint.topics) {
    const topicId = topicIds.get(topic.topicSlug)
    if (topicId === undefined) {
      throw new Error(`Published topic ${topic.topicSlug} was not found.`)
    }
    statements.push(
      database
        .prepare(
          `INSERT INTO subject_assessment_blueprint_topics (
            blueprint_id, topic_id, topic_slug, topic_title, position,
            question_count, easy_count, medium_count, hard_count
          ) VALUES (
            (SELECT id FROM subject_assessment_blueprints
             WHERE assessment_id = ?1 AND version = ?2),
            ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10
          )`,
        )
        .bind(
          assessmentId,
          blueprint.version,
          topicId,
          topic.topicSlug,
          topic.topicTitle,
          topic.position,
          topic.count,
          topic.difficulty.easy,
          topic.difficulty.medium,
          topic.difficulty.hard,
        ),
    )

    for (const generator of topic.generators) {
      statements.push(
        database
          .prepare(
            `INSERT INTO subject_assessment_blueprint_generators (
              blueprint_topic_id, generator_slug, generator_version,
              rotation_position, selection_weight
            ) VALUES (
              (SELECT subject_assessment_blueprint_topics.id
               FROM subject_assessment_blueprint_topics
               INNER JOIN subject_assessment_blueprints
                 ON subject_assessment_blueprints.id =
                    subject_assessment_blueprint_topics.blueprint_id
               WHERE subject_assessment_blueprints.assessment_id = ?1
                 AND subject_assessment_blueprints.version = ?2
                 AND subject_assessment_blueprint_topics.topic_slug = ?3),
              ?4, ?5, ?6, ?7
            )`,
          )
          .bind(
            assessmentId,
            blueprint.version,
            topic.topicSlug,
            generator.slug,
            generator.version,
            generator.rotationPosition,
            generator.selectionWeight,
          ),
      )
    }
  }

  await database.batch(statements)
}

export async function findAssessmentBlueprintRows(
  database: D1Database,
  assessmentId: number,
  version: number,
): Promise<BlueprintTopicGeneratorRow[]> {
  const result = await database
    .prepare(
      `SELECT
        subject_assessment_blueprints.id AS blueprint_id,
        subject_assessment_blueprints.version AS blueprint_version,
        subject_assessment_blueprints.total_questions AS blueprint_total_questions,
        subject_assessment_blueprints.passing_score_percent AS blueprint_passing_score,
        subject_assessment_blueprint_topics.id AS blueprint_topic_id,
        subject_assessment_blueprint_topics.topic_id,
        subject_assessment_blueprint_topics.topic_slug,
        subject_assessment_blueprint_topics.topic_title,
        topics.status AS topic_status,
        subject_assessment_blueprint_topics.position AS topic_position,
        subject_assessment_blueprint_topics.question_count,
        subject_assessment_blueprint_topics.easy_count,
        subject_assessment_blueprint_topics.medium_count,
        subject_assessment_blueprint_topics.hard_count,
        subject_assessment_blueprint_generators.generator_slug,
        subject_assessment_blueprint_generators.generator_version,
        subject_assessment_blueprint_generators.rotation_position,
        subject_assessment_blueprint_generators.selection_weight
      FROM subject_assessment_blueprints
      INNER JOIN subject_assessment_blueprint_topics
        ON subject_assessment_blueprint_topics.blueprint_id =
           subject_assessment_blueprints.id
      INNER JOIN topics
        ON topics.id = subject_assessment_blueprint_topics.topic_id
      INNER JOIN subject_assessment_blueprint_generators
        ON subject_assessment_blueprint_generators.blueprint_topic_id =
           subject_assessment_blueprint_topics.id
      WHERE subject_assessment_blueprints.assessment_id = ?1
        AND subject_assessment_blueprints.version = ?2
      ORDER BY subject_assessment_blueprint_topics.position,
        subject_assessment_blueprint_generators.rotation_position`,
    )
    .bind(assessmentId, version)
    .all<BlueprintTopicGeneratorRow>()

  return result.results
}

export async function findPublishedTopicsForSubject(
  database: D1Database,
  subjectId: number,
): Promise<Array<{ id: number; slug: string; title: string; status: string }>> {
  const result = await database
    .prepare(
      `SELECT id, slug, title, status
      FROM topics
      WHERE subject_id = ?1
      ORDER BY position`,
    )
    .bind(subjectId)
    .all<{ id: number; slug: string; title: string; status: string }>()
  return result.results
}

export async function findMaxSubjectAssessmentAttemptNumber(
  database: D1Database,
  assessmentId: number,
  userId: number,
): Promise<number> {
  const row = await database
    .prepare(
      `SELECT COALESCE(MAX(attempt_number), 0) AS max_attempt_number
      FROM subject_assessment_attempts
      WHERE assessment_id = ?1 AND user_id = ?2`,
    )
    .bind(assessmentId, userId)
    .first<{ max_attempt_number: number }>()
  return row?.max_attempt_number ?? 0
}

const attemptSelect = `subject_assessment_attempts.id,
  subject_assessment_attempts.public_id,
  subject_assessment_attempts.assessment_id,
  subject_assessment_attempts.blueprint_id,
  subject_assessment_attempts.user_id,
  subject_assessment_attempts.attempt_seed,
  subject_assessment_attempts.attempt_number,
  subject_assessment_attempts.status,
  subject_assessment_attempts.total_points,
  subject_assessment_attempts.earned_points,
  subject_assessment_attempts.score_percent,
  subject_assessment_attempts.passed,
  subject_assessment_attempts.started_at,
  subject_assessment_attempts.submitted_at,
  subject_assessments.title AS assessment_title,
  subject_assessments.slug AS assessment_slug,
  subject_assessments.passing_score,
  subject_assessments.question_count,
  subject_assessments.show_explanations,
  subject_assessment_blueprints.version AS blueprint_version,
  subjects.title AS subject_title,
  subjects.slug AS subject_slug,
  courses.id AS course_id,
  courses.slug AS course_slug`

export async function findSubjectAssessmentAttemptByPublicId(
  database: D1Database,
  publicId: string,
): Promise<SubjectAssessmentAttemptRow | null> {
  return database
    .prepare(
      `SELECT ${attemptSelect}
      FROM subject_assessment_attempts
      INNER JOIN subject_assessments
        ON subject_assessments.id = subject_assessment_attempts.assessment_id
      INNER JOIN subject_assessment_blueprints
        ON subject_assessment_blueprints.id = subject_assessment_attempts.blueprint_id
      INNER JOIN subjects ON subjects.id = subject_assessments.subject_id
      INNER JOIN courses ON courses.id = subjects.course_id
      WHERE subject_assessment_attempts.public_id = ?1
      LIMIT 1`,
    )
    .bind(publicId)
    .first<SubjectAssessmentAttemptRow>()
}

export async function findActiveSubjectAssessmentAttempt(
  database: D1Database,
  assessmentId: number,
  userId: number,
): Promise<SubjectAssessmentAttemptRow | null> {
  return database
    .prepare(
      `SELECT ${attemptSelect}
      FROM subject_assessment_attempts
      INNER JOIN subject_assessments
        ON subject_assessments.id = subject_assessment_attempts.assessment_id
      INNER JOIN subject_assessment_blueprints
        ON subject_assessment_blueprints.id = subject_assessment_attempts.blueprint_id
      INNER JOIN subjects ON subjects.id = subject_assessments.subject_id
      INNER JOIN courses ON courses.id = subjects.course_id
      WHERE subject_assessment_attempts.assessment_id = ?1
        AND subject_assessment_attempts.user_id = ?2
        AND subject_assessment_attempts.status = 'in_progress'
      LIMIT 1`,
    )
    .bind(assessmentId, userId)
    .first<SubjectAssessmentAttemptRow>()
}

export async function createSubjectAssessmentAttemptWithSnapshots(
  database: D1Database,
  input: {
    attemptPublicId: string
    assessmentId: number
    blueprintId: number
    userId: number
    attemptSeed: string
    attemptNumber: number
    questions: GeneratedSubjectAssessmentQuestion[]
  },
): Promise<SubjectAssessmentAttemptRow | null> {
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `INSERT INTO subject_assessment_attempts (
          public_id, assessment_id, blueprint_id, user_id, attempt_seed,
          attempt_number, total_points
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      )
      .bind(
        input.attemptPublicId,
        input.assessmentId,
        input.blueprintId,
        input.userId,
        input.attemptSeed,
        input.attemptNumber,
        input.questions.length,
      ),
  ]

  for (const item of input.questions) {
    const snapshotPublicId = `subject-question-${crypto.randomUUID()}`
    statements.push(
      database
        .prepare(
          `INSERT INTO subject_assessment_question_snapshots (
            public_id, attempt_id, source_position, topic_slug, topic_title,
            topic_position, generator_slug, generator_version, seed,
            difficulty, prompt, explanation_json, parameters_json, metadata_json
          ) VALUES (
            ?1,
            (SELECT id FROM subject_assessment_attempts WHERE public_id = ?2),
            ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14
          )`,
        )
        .bind(
          snapshotPublicId,
          input.attemptPublicId,
          item.position,
          item.topicSlug,
          item.topicTitle,
          item.topicPosition,
          item.question.generatorSlug,
          item.question.generatorVersion,
          item.question.seed,
          item.question.difficulty,
          item.question.prompt,
          JSON.stringify(item.question.explanation),
          JSON.stringify(item.question.parameters),
          JSON.stringify(item.question.metadata),
        ),
    )

    item.question.choices.forEach((choice, index) => {
      statements.push(
        database
          .prepare(
            `INSERT INTO subject_assessment_question_choices (
              public_id, snapshot_id, choice_text, is_correct, position,
              distractor_type
            ) VALUES (
              ?1,
              (SELECT id FROM subject_assessment_question_snapshots
               WHERE public_id = ?2),
              ?3, ?4, ?5, ?6
            )`,
          )
          .bind(
            `subject-choice-${crypto.randomUUID()}`,
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
  return findSubjectAssessmentAttemptByPublicId(database, input.attemptPublicId)
}

export async function findSubjectAssessmentQuestionsWithChoices(
  database: D1Database,
  attemptId: number,
): Promise<SubjectAssessmentQuestionChoiceRow[]> {
  const result = await database
    .prepare(
      `SELECT
        snapshots.id AS snapshot_id,
        snapshots.public_id AS snapshot_public_id,
        snapshots.source_position,
        snapshots.topic_slug,
        snapshots.topic_title,
        snapshots.topic_position,
        snapshots.generator_slug,
        snapshots.generator_version,
        snapshots.difficulty,
        snapshots.prompt,
        snapshots.explanation_json,
        snapshots.parameters_json,
        snapshots.metadata_json,
        choices.id AS choice_id,
        choices.public_id AS choice_public_id,
        choices.choice_text,
        choices.is_correct,
        choices.position AS choice_position
      FROM subject_assessment_question_snapshots snapshots
      INNER JOIN subject_assessment_question_choices choices
        ON choices.snapshot_id = snapshots.id
      WHERE snapshots.attempt_id = ?1
      ORDER BY snapshots.source_position, choices.position`,
    )
    .bind(attemptId)
    .all<SubjectAssessmentQuestionChoiceRow>()
  return result.results
}

export async function findSubjectAssessmentAnswers(
  database: D1Database,
  attemptId: number,
): Promise<SubjectAssessmentAnswerRow[]> {
  const result = await database
    .prepare(
      `SELECT snapshot_id, selected_choice_id, selected_choice_text_snapshot,
        correct_choice_text_snapshot, is_correct, points_awarded, answered_at
      FROM subject_assessment_answers
      WHERE attempt_id = ?1`,
    )
    .bind(attemptId)
    .all<SubjectAssessmentAnswerRow>()
  return result.results
}

export async function findSnapshotInAttempt(
  database: D1Database,
  attemptId: number,
  snapshotPublicId: string,
): Promise<{ id: number } | null> {
  return database
    .prepare(
      `SELECT id FROM subject_assessment_question_snapshots
      WHERE attempt_id = ?1 AND public_id = ?2 LIMIT 1`,
    )
    .bind(attemptId, snapshotPublicId)
    .first<{ id: number }>()
}

export async function findChoiceInAssessmentSnapshot(
  database: D1Database,
  snapshotId: number,
  choicePublicId: string,
): Promise<{ id: number } | null> {
  return database
    .prepare(
      `SELECT id FROM subject_assessment_question_choices
      WHERE snapshot_id = ?1 AND public_id = ?2 LIMIT 1`,
    )
    .bind(snapshotId, choicePublicId)
    .first<{ id: number }>()
}

export async function saveSubjectAssessmentAnswerRow(
  database: D1Database,
  input: { attemptId: number; snapshotId: number; choiceId: number },
): Promise<void> {
  await database
    .prepare(
      `INSERT INTO subject_assessment_answers (
        attempt_id, snapshot_id, selected_choice_id,
        selected_choice_text_snapshot, answered_at
      ) VALUES (
        ?1, ?2, ?3,
        (SELECT choice_text FROM subject_assessment_question_choices
         WHERE id = ?3),
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(attempt_id, snapshot_id) DO UPDATE SET
        selected_choice_id = excluded.selected_choice_id,
        selected_choice_text_snapshot = excluded.selected_choice_text_snapshot,
        correct_choice_text_snapshot = NULL,
        is_correct = NULL,
        points_awarded = 0,
        answered_at = CURRENT_TIMESTAMP`,
    )
    .bind(input.attemptId, input.snapshotId, input.choiceId)
    .run()
}

export async function submitSubjectAssessmentRows(
  database: D1Database,
  input: {
    attemptId: number
    earnedPoints: number
    totalPoints: number
    scorePercent: number
    passed: boolean
    scores: Array<{
      snapshotId: number
      selectedChoiceId: number | null
      isCorrect: boolean
    }>
  },
): Promise<void> {
  const statements = input.scores.map((score) =>
    database
      .prepare(
        `INSERT INTO subject_assessment_answers (
          attempt_id, snapshot_id, selected_choice_id,
          selected_choice_text_snapshot, correct_choice_text_snapshot,
          is_correct, points_awarded, answered_at
        ) VALUES (
          ?1, ?2, ?3,
          (SELECT choice_text FROM subject_assessment_question_choices
           WHERE id = ?3),
          (SELECT choice_text FROM subject_assessment_question_choices
           WHERE snapshot_id = ?2 AND is_correct = 1 LIMIT 1),
          ?4, ?5, CURRENT_TIMESTAMP
        )
        ON CONFLICT(attempt_id, snapshot_id) DO UPDATE SET
          selected_choice_text_snapshot = COALESCE(
            subject_assessment_answers.selected_choice_text_snapshot,
            excluded.selected_choice_text_snapshot
          ),
          correct_choice_text_snapshot = excluded.correct_choice_text_snapshot,
          is_correct = excluded.is_correct,
          points_awarded = excluded.points_awarded,
          answered_at = COALESCE(
            subject_assessment_answers.answered_at,
            excluded.answered_at
          )`,
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
        `UPDATE subject_assessment_attempts
        SET status = 'submitted', earned_points = ?2, total_points = ?3,
          score_percent = ?4, passed = ?5,
          submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP)
        WHERE id = ?1 AND status = 'in_progress'`,
      )
      .bind(
        input.attemptId,
        input.earnedPoints,
        input.totalPoints,
        input.scorePercent,
        input.passed ? 1 : 0,
      ),
  )
  await database.batch(statements)
}

export async function findSubjectAssessmentHistory(
  database: D1Database,
  assessmentId: number,
  userId: number,
): Promise<SubjectAssessmentHistoryRow[]> {
  const result = await database
    .prepare(
      `SELECT public_id AS attempt_public_id, attempt_number, status,
        earned_points, total_points, score_percent, passed, started_at,
        submitted_at
      FROM subject_assessment_attempts
      WHERE assessment_id = ?1 AND user_id = ?2
      ORDER BY attempt_number DESC`,
    )
    .bind(assessmentId, userId)
    .all<SubjectAssessmentHistoryRow>()
  return result.results
}

export async function countSubjectAssessmentAttempts(
  database: D1Database,
  assessmentId: number,
): Promise<number> {
  const row = await database
    .prepare(
      `SELECT COUNT(*) AS count FROM subject_assessment_attempts
      WHERE assessment_id = ?1`,
    )
    .bind(assessmentId)
    .first<{ count: number }>()
  return row?.count ?? 0
}

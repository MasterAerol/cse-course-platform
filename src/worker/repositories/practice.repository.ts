export type PracticeAttemptStatus =
  | 'in_progress'
  | 'submitted'
  | 'abandoned'

export interface PracticeAccessRow {
  practice_set_id: number
  practice_title: string
  instructions: string | null
  passing_score: number
  question_count: number
  maximum_attempts: number | null
  show_explanations: 0 | 1
  practice_status: 'draft' | 'published'
  lesson_id: number
  lesson_public_id: string
  lesson_title: string
  lesson_slug: string
  lesson_type: string
  course_id: number
  course_slug: string
  topic_slug: string
}

export interface PracticeQuestionChoiceRow {
  question_id: number
  question_prompt: string
  explanation: string | null
  points: number
  question_position: number
  choice_id: number
  choice_text: string
  is_correct: 0 | 1
  choice_position: number
}

export interface PracticeAttemptRow {
  attempt_id: number
  attempt_public_id: string
  practice_set_id: number
  user_id: number
  attempt_number: number
  status: PracticeAttemptStatus
  total_points: number
  earned_points: number
  score_percent: number | null
  passed: 0 | 1 | null
  started_at: string
  submitted_at: string | null
  practice_title: string
  instructions: string | null
  passing_score: number
  maximum_attempts: number | null
  show_explanations: 0 | 1
  lesson_id: number
  lesson_public_id: string
  lesson_title: string
  lesson_slug: string
  lesson_type: string
  course_id: number
  course_slug: string
  topic_slug: string
}

export interface PracticeAttemptAnswerRow {
  question_id: number
  selected_choice_id: number | null
  is_correct: 0 | 1 | null
  points_awarded: number
  answered_at: string | null
}

export interface PracticeAttemptHistoryRow {
  attempt_public_id: string
  attempt_number: number
  status: PracticeAttemptStatus
  earned_points: number
  total_points: number
  score_percent: number | null
  passed: 0 | 1 | null
  started_at: string
  submitted_at: string | null
}

const practiceAccessSelect = `practice_sets.id AS practice_set_id,
  practice_sets.title AS practice_title,
  practice_sets.instructions,
  practice_sets.passing_score,
  practice_sets.question_count,
  practice_sets.maximum_attempts,
  practice_sets.show_explanations,
  practice_sets.status AS practice_status,
  lessons.id AS lesson_id,
  lessons.public_id AS lesson_public_id,
  lessons.title AS lesson_title,
  lessons.slug AS lesson_slug,
  lessons.lesson_type,
  courses.id AS course_id,
  courses.slug AS course_slug,
  topics.slug AS topic_slug`

const practiceAccessJoins = `FROM practice_sets
  INNER JOIN lessons
    ON lessons.id = practice_sets.lesson_id
  INNER JOIN topics
    ON topics.id = lessons.topic_id
    AND topics.status = 'published'
  INNER JOIN subjects
    ON subjects.id = topics.subject_id
    AND subjects.status = 'published'
  INNER JOIN courses
    ON courses.id = subjects.course_id
    AND courses.status = 'published'
  WHERE lessons.status = 'published'`

export async function findPracticeSetById(
  database: D1Database,
  practiceSetId: number,
): Promise<PracticeAccessRow | null> {
  return database
    .prepare(
      `SELECT ${practiceAccessSelect}
      ${practiceAccessJoins}
        AND practice_sets.id = ?1
      LIMIT 1`,
    )
    .bind(practiceSetId)
    .first<PracticeAccessRow>()
}

export async function findPublishedPracticeSetByLessonPublicId(
  database: D1Database,
  lessonPublicId: string,
): Promise<PracticeAccessRow | null> {
  return database
    .prepare(
      `SELECT ${practiceAccessSelect}
      ${practiceAccessJoins}
        AND lessons.public_id = ?1
        AND practice_sets.status = 'published'
      LIMIT 1`,
    )
    .bind(lessonPublicId)
    .first<PracticeAccessRow>()
}

export async function findPracticeQuestionsWithChoices(
  database: D1Database,
  practiceSetId: number,
): Promise<PracticeQuestionChoiceRow[]> {
  const result = await database
    .prepare(
      `SELECT
        practice_questions.id AS question_id,
        practice_questions.prompt AS question_prompt,
        practice_questions.explanation,
        practice_questions.points,
        practice_questions.position AS question_position,
        practice_question_choices.id AS choice_id,
        practice_question_choices.choice_text,
        practice_question_choices.is_correct,
        practice_question_choices.position AS choice_position
      FROM practice_questions
      INNER JOIN practice_question_choices
        ON practice_question_choices.question_id = practice_questions.id
      WHERE practice_questions.practice_set_id = ?1
        AND practice_questions.status = 'active'
      ORDER BY practice_questions.position, practice_question_choices.position`,
    )
    .bind(practiceSetId)
    .all<PracticeQuestionChoiceRow>()

  return result.results
}

export async function countPracticeQuestions(
  database: D1Database,
  practiceSetId: number,
): Promise<number> {
  const row = await database
    .prepare(
      `SELECT COUNT(*) AS question_count
      FROM practice_questions
      WHERE practice_set_id = ?1
        AND status = 'active'`,
    )
    .bind(practiceSetId)
    .first<{ question_count: number }>()

  return row?.question_count ?? 0
}

export async function findPracticeAttemptHistory(
  database: D1Database,
  practiceSetId: number,
  userId: number,
): Promise<PracticeAttemptHistoryRow[]> {
  const result = await database
    .prepare(
      `SELECT
        public_id AS attempt_public_id,
        attempt_number,
        status,
        earned_points,
        total_points,
        score_percent,
        passed,
        started_at,
        submitted_at
      FROM practice_attempts
      WHERE practice_set_id = ?1
        AND user_id = ?2
      ORDER BY attempt_number DESC`,
    )
    .bind(practiceSetId, userId)
    .all<PracticeAttemptHistoryRow>()

  return result.results
}

export async function findMaxPracticeAttemptNumber(
  database: D1Database,
  practiceSetId: number,
  userId: number,
): Promise<number> {
  const row = await database
    .prepare(
      `SELECT COALESCE(MAX(attempt_number), 0) AS max_attempt_number
      FROM practice_attempts
      WHERE practice_set_id = ?1
        AND user_id = ?2`,
    )
    .bind(practiceSetId, userId)
    .first<{ max_attempt_number: number }>()

  return row?.max_attempt_number ?? 0
}

export async function createPracticeAttempt(
  database: D1Database,
  input: {
    publicId: string
    practiceSetId: number
    userId: number
    attemptNumber: number
    totalPoints: number
  },
): Promise<PracticeAttemptRow | null> {
  await database
    .prepare(
      `INSERT INTO practice_attempts (
        public_id,
        practice_set_id,
        user_id,
        attempt_number,
        total_points
      ) VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(
      input.publicId,
      input.practiceSetId,
      input.userId,
      input.attemptNumber,
      input.totalPoints,
    )
    .run()

  return findPracticeAttemptByPublicId(database, input.publicId)
}

export async function findPracticeAttemptByPublicId(
  database: D1Database,
  attemptPublicId: string,
): Promise<PracticeAttemptRow | null> {
  return database
    .prepare(
      `SELECT
        practice_attempts.id AS attempt_id,
        practice_attempts.public_id AS attempt_public_id,
        practice_attempts.practice_set_id,
        practice_attempts.user_id,
        practice_attempts.attempt_number,
        practice_attempts.status,
        practice_attempts.total_points,
        practice_attempts.earned_points,
        practice_attempts.score_percent,
        practice_attempts.passed,
        practice_attempts.started_at,
        practice_attempts.submitted_at,
        practice_sets.title AS practice_title,
        practice_sets.instructions,
        practice_sets.passing_score,
        practice_sets.maximum_attempts,
        practice_sets.show_explanations,
        lessons.id AS lesson_id,
        lessons.public_id AS lesson_public_id,
        lessons.title AS lesson_title,
        lessons.slug AS lesson_slug,
        lessons.lesson_type,
        courses.id AS course_id,
        courses.slug AS course_slug,
        topics.slug AS topic_slug
      FROM practice_attempts
      INNER JOIN practice_sets
        ON practice_sets.id = practice_attempts.practice_set_id
      INNER JOIN lessons
        ON lessons.id = practice_sets.lesson_id
      INNER JOIN topics
        ON topics.id = lessons.topic_id
      INNER JOIN subjects
        ON subjects.id = topics.subject_id
      INNER JOIN courses
        ON courses.id = subjects.course_id
      WHERE practice_attempts.public_id = ?1
      LIMIT 1`,
    )
    .bind(attemptPublicId)
    .first<PracticeAttemptRow>()
}

export async function findPracticeAttemptAnswers(
  database: D1Database,
  attemptId: number,
): Promise<PracticeAttemptAnswerRow[]> {
  const result = await database
    .prepare(
      `SELECT
        question_id,
        selected_choice_id,
        is_correct,
        points_awarded,
        answered_at
      FROM practice_attempt_answers
      WHERE attempt_id = ?1`,
    )
    .bind(attemptId)
    .all<PracticeAttemptAnswerRow>()

  return result.results
}

export async function findPracticeQuestionInSet(
  database: D1Database,
  practiceSetId: number,
  questionId: number,
): Promise<{ id: number } | null> {
  return database
    .prepare(
      `SELECT id
      FROM practice_questions
      WHERE id = ?1
        AND practice_set_id = ?2
        AND status = 'active'
      LIMIT 1`,
    )
    .bind(questionId, practiceSetId)
    .first<{ id: number }>()
}

export async function findPracticeChoiceInQuestion(
  database: D1Database,
  questionId: number,
  choiceId: number,
): Promise<{ id: number } | null> {
  return database
    .prepare(
      `SELECT id
      FROM practice_question_choices
      WHERE id = ?1
        AND question_id = ?2
      LIMIT 1`,
    )
    .bind(choiceId, questionId)
    .first<{ id: number }>()
}

export async function savePracticeAttemptAnswer(
  database: D1Database,
  input: {
    attemptId: number
    questionId: number
    selectedChoiceId: number
  },
): Promise<void> {
  await database
    .prepare(
      `INSERT INTO practice_attempt_answers (
        attempt_id,
        question_id,
        selected_choice_id,
        is_correct,
        points_awarded,
        answered_at
      ) VALUES (?1, ?2, ?3, NULL, 0, CURRENT_TIMESTAMP)
      ON CONFLICT(attempt_id, question_id) DO UPDATE SET
        selected_choice_id = excluded.selected_choice_id,
        is_correct = NULL,
        points_awarded = 0,
        answered_at = CURRENT_TIMESTAMP`,
    )
    .bind(input.attemptId, input.questionId, input.selectedChoiceId)
    .run()
}

export async function updatePracticeAttemptAnswerScores(
  database: D1Database,
  attemptId: number,
  scores: Array<{
    questionId: number
    selectedChoiceId: number | null
    isCorrect: boolean
    pointsAwarded: number
  }>,
): Promise<void> {
  if (scores.length === 0) {
    return
  }

  await database.batch(
    scores.map((score) =>
      database
        .prepare(
          `INSERT INTO practice_attempt_answers (
            attempt_id,
            question_id,
            selected_choice_id,
            is_correct,
            points_awarded,
            answered_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)
          ON CONFLICT(attempt_id, question_id) DO UPDATE SET
            selected_choice_id = excluded.selected_choice_id,
            is_correct = excluded.is_correct,
            points_awarded = excluded.points_awarded,
            answered_at = COALESCE(
              practice_attempt_answers.answered_at,
              excluded.answered_at
            )`,
        )
        .bind(
          attemptId,
          score.questionId,
          score.selectedChoiceId,
          score.isCorrect ? 1 : 0,
          score.pointsAwarded,
        ),
    ),
  )
}

export async function submitPracticeAttempt(
  database: D1Database,
  input: {
    attemptId: number
    earnedPoints: number
    totalPoints: number
    scorePercent: number
    passed: boolean
  },
): Promise<void> {
  await database
    .prepare(
      `UPDATE practice_attempts
      SET
        status = 'submitted',
        earned_points = ?2,
        total_points = ?3,
        score_percent = ?4,
        passed = ?5,
        submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP)
      WHERE id = ?1
        AND status = 'in_progress'`,
    )
    .bind(
      input.attemptId,
      input.earnedPoints,
      input.totalPoints,
      input.scorePercent,
      input.passed ? 1 : 0,
    )
    .run()
}

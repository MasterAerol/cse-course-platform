export type QuizAttemptStatus =
  | 'in_progress'
  | 'submitted'
  | 'expired'
  | 'abandoned'

export interface QuizAccessRow {
  quiz_id: number
  quiz_title: string
  quiz_description: string | null
  quiz_type: string
  passing_score: number
  time_limit_minutes: number | null
  maximum_attempts: number | null
  show_explanations: 0 | 1
  quiz_status: 'draft' | 'published'
  lesson_id: number
  lesson_public_id: string
  lesson_title: string
  lesson_slug: string
  lesson_type: string
  course_id: number
  course_title: string
  course_slug: string
  topic_id: number
  topic_title: string
  topic_slug: string
}

export interface QuizQuestionChoiceRow {
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

export interface QuizAttemptRow {
  attempt_id: number
  attempt_public_id: string
  quiz_id: number
  user_id: number
  attempt_number: number
  status: QuizAttemptStatus
  total_points: number
  earned_points: number
  score_percent: number | null
  passed: 0 | 1 | null
  started_at: string
  submitted_at: string | null
  expires_at: string | null
  quiz_title: string
  passing_score: number
  time_limit_minutes: number | null
  maximum_attempts: number | null
  show_explanations: 0 | 1
  lesson_id: number
  lesson_public_id: string
  lesson_title: string
  lesson_slug: string
  course_id: number
  course_title: string
  course_slug: string
  topic_id: number
  topic_slug: string
}

export interface AttemptAnswerRow {
  question_id: number
  selected_choice_id: number | null
  is_correct: 0 | 1 | null
  points_awarded: number
  answered_at: string | null
}

export interface AttemptHistoryRow {
  attempt_public_id: string
  attempt_number: number
  status: QuizAttemptStatus
  earned_points: number
  total_points: number
  score_percent: number | null
  passed: 0 | 1 | null
  started_at: string
  submitted_at: string | null
  expires_at: string | null
}

export async function findQuizById(
  database: D1Database,
  quizId: number,
): Promise<QuizAccessRow | null> {
  return database
    .prepare(
      `SELECT
        quizzes.id AS quiz_id,
        quizzes.title AS quiz_title,
        quizzes.description AS quiz_description,
        quizzes.quiz_type,
        quizzes.passing_score,
        quizzes.time_limit_minutes,
        quizzes.maximum_attempts,
        quizzes.show_explanations,
        quizzes.status AS quiz_status,
        lessons.id AS lesson_id,
        lessons.public_id AS lesson_public_id,
        lessons.title AS lesson_title,
        lessons.slug AS lesson_slug,
        lessons.lesson_type,
        courses.id AS course_id,
        courses.title AS course_title,
        courses.slug AS course_slug,
        topics.id AS topic_id,
        topics.title AS topic_title,
        topics.slug AS topic_slug
      FROM quizzes
      INNER JOIN lessons
        ON lessons.id = quizzes.lesson_id
        AND lessons.status = 'published'
      INNER JOIN topics
        ON topics.id = lessons.topic_id
        AND topics.status = 'published'
      INNER JOIN subjects
        ON subjects.id = topics.subject_id
        AND subjects.status = 'published'
      INNER JOIN courses
        ON courses.id = subjects.course_id
        AND courses.status = 'published'
      WHERE quizzes.id = ?1
      LIMIT 1`,
    )
    .bind(quizId)
    .first<QuizAccessRow>()
}

export async function findPublishedQuizByLessonPublicId(
  database: D1Database,
  lessonPublicId: string,
): Promise<QuizAccessRow | null> {
  return database
    .prepare(
      `SELECT
        quizzes.id AS quiz_id,
        quizzes.title AS quiz_title,
        quizzes.description AS quiz_description,
        quizzes.quiz_type,
        quizzes.passing_score,
        quizzes.time_limit_minutes,
        quizzes.maximum_attempts,
        quizzes.show_explanations,
        quizzes.status AS quiz_status,
        lessons.id AS lesson_id,
        lessons.public_id AS lesson_public_id,
        lessons.title AS lesson_title,
        lessons.slug AS lesson_slug,
        lessons.lesson_type,
        courses.id AS course_id,
        courses.title AS course_title,
        courses.slug AS course_slug,
        topics.id AS topic_id,
        topics.title AS topic_title,
        topics.slug AS topic_slug
      FROM quizzes
      INNER JOIN lessons
        ON lessons.id = quizzes.lesson_id
        AND lessons.status = 'published'
      INNER JOIN topics
        ON topics.id = lessons.topic_id
        AND topics.status = 'published'
      INNER JOIN subjects
        ON subjects.id = topics.subject_id
        AND subjects.status = 'published'
      INNER JOIN courses
        ON courses.id = subjects.course_id
        AND courses.status = 'published'
      WHERE lessons.public_id = ?1
        AND quizzes.status = 'published'
      ORDER BY quizzes.id
      LIMIT 1`,
    )
    .bind(lessonPublicId)
    .first<QuizAccessRow>()
}

export async function findQuizQuestionsWithChoices(
  database: D1Database,
  quizId: number,
): Promise<QuizQuestionChoiceRow[]> {
  const result = await database
    .prepare(
      `SELECT
        questions.id AS question_id,
        questions.prompt AS question_prompt,
        questions.explanation,
        questions.points,
        questions.position AS question_position,
        question_choices.id AS choice_id,
        question_choices.choice_text,
        question_choices.is_correct,
        question_choices.position AS choice_position
      FROM questions
      INNER JOIN question_choices
        ON question_choices.question_id = questions.id
      WHERE questions.quiz_id = ?1
        AND questions.status = 'active'
      ORDER BY questions.position, question_choices.position`,
    )
    .bind(quizId)
    .all<QuizQuestionChoiceRow>()

  return result.results
}

export async function countQuizQuestions(
  database: D1Database,
  quizId: number,
): Promise<number> {
  const row = await database
    .prepare(
      `SELECT COUNT(*) AS count
      FROM questions
      WHERE quiz_id = ?1
        AND status = 'active'`,
    )
    .bind(quizId)
    .first<{ count: number }>()

  return row?.count ?? 0
}

export async function findAttemptHistory(
  database: D1Database,
  quizId: number,
  userId: number,
): Promise<AttemptHistoryRow[]> {
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
        submitted_at,
        expires_at
      FROM quiz_attempts
      WHERE quiz_id = ?1
        AND user_id = ?2
      ORDER BY attempt_number DESC`,
    )
    .bind(quizId, userId)
    .all<AttemptHistoryRow>()

  return result.results
}

export async function findMaxAttemptNumber(
  database: D1Database,
  quizId: number,
  userId: number,
): Promise<number> {
  const row = await database
    .prepare(
      `SELECT COALESCE(MAX(attempt_number), 0) AS max_attempt_number
      FROM quiz_attempts
      WHERE quiz_id = ?1
        AND user_id = ?2`,
    )
    .bind(quizId, userId)
    .first<{ max_attempt_number: number }>()

  return row?.max_attempt_number ?? 0
}

export async function createQuizAttempt(
  database: D1Database,
  input: {
    publicId: string
    quizId: number
    userId: number
    attemptNumber: number
    totalPoints: number
    expiresAt: string | null
  },
): Promise<QuizAttemptRow | null> {
  await database
    .prepare(
      `INSERT INTO quiz_attempts (
        public_id,
        quiz_id,
        user_id,
        attempt_number,
        status,
        total_points,
        expires_at
      ) VALUES (?1, ?2, ?3, ?4, 'in_progress', ?5, ?6)`,
    )
    .bind(
      input.publicId,
      input.quizId,
      input.userId,
      input.attemptNumber,
      input.totalPoints,
      input.expiresAt,
    )
    .run()

  return findAttemptByPublicId(database, input.publicId)
}

export async function findAttemptByPublicId(
  database: D1Database,
  attemptPublicId: string,
): Promise<QuizAttemptRow | null> {
  return database
    .prepare(
      `SELECT
        quiz_attempts.id AS attempt_id,
        quiz_attempts.public_id AS attempt_public_id,
        quiz_attempts.quiz_id,
        quiz_attempts.user_id,
        quiz_attempts.attempt_number,
        quiz_attempts.status,
        quiz_attempts.total_points,
        quiz_attempts.earned_points,
        quiz_attempts.score_percent,
        quiz_attempts.passed,
        quiz_attempts.started_at,
        quiz_attempts.submitted_at,
        quiz_attempts.expires_at,
        quizzes.title AS quiz_title,
        quizzes.passing_score,
        quizzes.time_limit_minutes,
        quizzes.maximum_attempts,
        quizzes.show_explanations,
        lessons.id AS lesson_id,
        lessons.public_id AS lesson_public_id,
        lessons.title AS lesson_title,
        lessons.slug AS lesson_slug,
        courses.id AS course_id,
        courses.title AS course_title,
        courses.slug AS course_slug,
        topics.id AS topic_id,
        topics.slug AS topic_slug
      FROM quiz_attempts
      INNER JOIN quizzes ON quizzes.id = quiz_attempts.quiz_id
      INNER JOIN lessons ON lessons.id = quizzes.lesson_id
      INNER JOIN topics ON topics.id = lessons.topic_id
      INNER JOIN subjects ON subjects.id = topics.subject_id
      INNER JOIN courses ON courses.id = subjects.course_id
      WHERE quiz_attempts.public_id = ?1
      LIMIT 1`,
    )
    .bind(attemptPublicId)
    .first<QuizAttemptRow>()
}

export async function findAttemptAnswers(
  database: D1Database,
  attemptId: number,
): Promise<AttemptAnswerRow[]> {
  const result = await database
    .prepare(
      `SELECT
        question_id,
        selected_choice_id,
        is_correct,
        points_awarded,
        answered_at
      FROM quiz_attempt_answers
      WHERE attempt_id = ?1`,
    )
    .bind(attemptId)
    .all<AttemptAnswerRow>()

  return result.results
}

export async function findQuestionInQuiz(
  database: D1Database,
  quizId: number,
  questionId: number,
): Promise<{ id: number } | null> {
  return database
    .prepare(
      `SELECT id
      FROM questions
      WHERE id = ?1
        AND quiz_id = ?2
        AND status = 'active'
      LIMIT 1`,
    )
    .bind(questionId, quizId)
    .first<{ id: number }>()
}

export async function findChoiceInQuestion(
  database: D1Database,
  questionId: number,
  choiceId: number,
): Promise<{ id: number } | null> {
  return database
    .prepare(
      `SELECT id
      FROM question_choices
      WHERE id = ?1
        AND question_id = ?2
      LIMIT 1`,
    )
    .bind(choiceId, questionId)
    .first<{ id: number }>()
}

export async function saveAttemptAnswer(
  database: D1Database,
  input: {
    attemptId: number
    questionId: number
    selectedChoiceId: number
  },
): Promise<void> {
  await database
    .prepare(
      `INSERT INTO quiz_attempt_answers (
        attempt_id,
        question_id,
        selected_choice_id,
        answered_at
      ) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)
      ON CONFLICT(attempt_id, question_id) DO UPDATE SET
        selected_choice_id = excluded.selected_choice_id,
        is_correct = NULL,
        points_awarded = 0,
        answered_at = CURRENT_TIMESTAMP`,
    )
    .bind(input.attemptId, input.questionId, input.selectedChoiceId)
    .run()
}

export async function updateAttemptAnswerScores(
  database: D1Database,
  attemptId: number,
  scores: Array<{
    questionId: number
    selectedChoiceId: number | null
    isCorrect: boolean
    pointsAwarded: number
  }>,
): Promise<void> {
  const statements = scores.map((score) =>
    database
      .prepare(
        `INSERT INTO quiz_attempt_answers (
          attempt_id,
          question_id,
          selected_choice_id,
          is_correct,
          points_awarded,
          answered_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)
        ON CONFLICT(attempt_id, question_id) DO UPDATE SET
          is_correct = excluded.is_correct,
          points_awarded = excluded.points_awarded,
          answered_at = COALESCE(quiz_attempt_answers.answered_at, excluded.answered_at)`,
      )
      .bind(
        attemptId,
        score.questionId,
        score.selectedChoiceId,
        score.isCorrect ? 1 : 0,
        score.pointsAwarded,
      ),
  )

  if (statements.length > 0) {
    await database.batch(statements)
  }
}

export async function submitAttempt(
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
      `UPDATE quiz_attempts
      SET
        status = 'submitted',
        earned_points = ?2,
        total_points = ?3,
        score_percent = ?4,
        passed = ?5,
        submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP)
      WHERE id = ?1`,
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

export async function markAttemptExpired(
  database: D1Database,
  attemptId: number,
): Promise<void> {
  await database
    .prepare(
      `UPDATE quiz_attempts
      SET status = 'expired'
      WHERE id = ?1
        AND status = 'in_progress'`,
    )
    .bind(attemptId)
    .run()
}

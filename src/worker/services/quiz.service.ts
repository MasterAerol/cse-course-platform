import {
  calculateTopicProgress,
} from '../domain/progress-calculation'
import {
  groupQuestions,
  scoreQuiz,
  type QuizQuestion,
  type QuizScore,
} from '../domain/quiz-scoring'
import {
  countQuizQuestions,
  createQuizAttempt,
  findAttemptAnswers,
  findAttemptByPublicId,
  findAttemptHistory,
  findChoiceInQuestion,
  findMaxAttemptNumber,
  findPublishedQuizByLessonPublicId,
  findQuestionInQuiz,
  findQuizById,
  findQuizQuestionsWithChoices,
  markAttemptExpired,
  saveAttemptAnswer,
  submitAttempt,
  updateAttemptAnswerScores,
  type AttemptAnswerRow,
  type AttemptHistoryRow,
  type QuizAccessRow,
  type QuizAttemptRow,
} from '../repositories/quiz.repository'
import { findRequiredLessonProgressRows } from '../repositories/course.repository'
import { AppError } from '../utils/app-error'
import type {
  CourseProgressState,
  LessonNavigationItem,
  TopicProgress,
} from './course.types'
import { getAccessibleLessonContext } from './lesson-access.service'
import {
  completeActivityLesson,
  getStudentCourseProgress,
  startActivityLesson,
} from './progress.service'

export interface SafeQuizChoice {
  id: number
  text: string
  position: number
}

export interface SafeQuizQuestion {
  id: number
  prompt: string
  points: number
  position: number
  selectedChoiceId: number | null
  choices: SafeQuizChoice[]
}

export interface QuizAttemptHistoryItem {
  attemptPublicId: string
  attemptNumber: number
  status: string
  earnedPoints: number
  totalPoints: number
  scorePercent: number | null
  passed: boolean | null
  startedAt: string
  submittedAt: string | null
  expiresAt: string | null
}

export interface LessonQuizSummary {
  quiz: {
    id: number
    title: string
    description: string | null
    passingScore: number
    questionCount: number
    timeLimitMinutes: number | null
    maximumAttempts: number | null
    attemptsRemaining: number | null
  }
  inProgressAttempt: QuizAttemptHistoryItem | null
  attempts: QuizAttemptHistoryItem[]
}

export interface QuizAttemptPayload {
  attempt: {
    publicId: string
    status: string
    attemptNumber: number
    startedAt: string
    expiresAt: string | null
  }
  quiz: {
    id: number
    title: string
    passingScore: number
    questionCount: number
    timeLimitMinutes: number | null
  }
  questions: SafeQuizQuestion[]
}

export interface SaveAnswerResult {
  saved: true
  answeredCount: number
  totalCount: number
}

export interface QuizAttemptResult {
  quiz: {
    id: number
    title: string
    passingScore: number
  }
  attempt: {
    publicId: string
    attemptNumber: number
    status: string
    startedAt: string
    submittedAt: string
  }
  totalPoints: number
  earnedPoints: number
  scorePercent: number
  passed: boolean
  questions: Array<{
    id: number
    prompt: string
    points: number
    position: number
    selectedChoice: SafeQuizChoice | null
    correctChoice: SafeQuizChoice
    isCorrect: boolean
    pointsAwarded: number
    explanation: string | null
    choices: SafeQuizChoice[]
  }>
  newlyUnlockedNextLesson: LessonNavigationItem | null
  topicProgress: TopicProgress
  courseProgress: CourseProgressState
}

interface QuizCompletionContext {
  newlyUnlockedNextLesson: LessonNavigationItem | null
  topicProgress: TopicProgress
  courseProgress: CourseProgressState
}

async function getAccessibleQuiz(
  database: D1Database,
  userId: number,
  quizId: number,
): Promise<{
  quiz: QuizAccessRow
  lessonContext: Awaited<ReturnType<typeof getAccessibleLessonContext>>
}> {
  const quiz = await findQuizById(database, quizId)

  if (quiz === null) {
    throw new AppError(
      404,
      'QUIZ_NOT_FOUND',
      'The requested quiz was not found.',
    )
  }

  if (quiz.quiz_status !== 'published') {
    throw new AppError(
      404,
      'QUIZ_NOT_PUBLISHED',
      'The requested quiz is not available.',
    )
  }

  const lessonContext = await getAccessibleLessonContext(
    database,
    userId,
    quiz.lesson_public_id,
  )

  return { quiz, lessonContext }
}

function mapAttemptHistory(
  row: AttemptHistoryRow,
): QuizAttemptHistoryItem {
  return {
    attemptPublicId: row.attempt_public_id,
    attemptNumber: row.attempt_number,
    status: row.status,
    earnedPoints: row.earned_points,
    totalPoints: row.total_points,
    scorePercent: row.score_percent,
    passed: row.passed === null ? null : row.passed === 1,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    expiresAt: row.expires_at,
  }
}

function getAttemptsRemaining(
  maximumAttempts: number | null,
  attemptCount: number,
): number | null {
  if (maximumAttempts === null) {
    return null
  }

  return Math.max(0, maximumAttempts - attemptCount)
}

function mapSafeQuestions(
  questions: QuizQuestion[],
  answers: AttemptAnswerRow[],
): SafeQuizQuestion[] {
  const answerByQuestionId = new Map(
    answers.map((answer) => [answer.question_id, answer]),
  )

  return questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    points: question.points,
    position: question.position,
    selectedChoiceId:
      answerByQuestionId.get(question.id)?.selected_choice_id ?? null,
    choices: question.choices
      .map((choice) => ({
        id: choice.id,
        text: choice.text,
        position: choice.position,
      }))
      .sort((left, right) => left.position - right.position),
  }))
}

function isAttemptExpired(attempt: QuizAttemptRow): boolean {
  if (attempt.status !== 'in_progress' || attempt.expires_at === null) {
    return false
  }

  return Date.parse(attempt.expires_at) <= Date.now()
}

async function assertAttemptNotExpired(
  database: D1Database,
  attempt: QuizAttemptRow,
): Promise<void> {
  if (!isAttemptExpired(attempt)) {
    return
  }

  await markAttemptExpired(database, attempt.attempt_id)
  throw new AppError(
    409,
    'ATTEMPT_EXPIRED',
    'This quiz attempt has expired.',
  )
}

function assertAttemptOwner(
  attempt: QuizAttemptRow,
  userId: number,
): void {
  if (attempt.user_id === userId) {
    return
  }

  throw new AppError(
    403,
    'ATTEMPT_FORBIDDEN',
    'This quiz attempt belongs to another user.',
  )
}

async function getOwnedAttempt(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
): Promise<QuizAttemptRow> {
  const attempt = await findAttemptByPublicId(database, attemptPublicId)

  if (attempt === null) {
    throw new AppError(
      404,
      'ATTEMPT_NOT_FOUND',
      'The requested quiz attempt was not found.',
    )
  }

  assertAttemptOwner(attempt, userId)

  return attempt
}

async function getQuestionsAndAnswers(
  database: D1Database,
  attempt: QuizAttemptRow,
): Promise<{
  questions: QuizQuestion[]
  answers: AttemptAnswerRow[]
}> {
  const [questionRows, answers] = await Promise.all([
    findQuizQuestionsWithChoices(database, attempt.quiz_id),
    findAttemptAnswers(database, attempt.attempt_id),
  ])

  return {
    questions: groupQuestions(questionRows),
    answers,
  }
}

function calculateExpiresAt(timeLimitMinutes: number | null): string | null {
  if (timeLimitMinutes === null) {
    return null
  }

  return new Date(Date.now() + timeLimitMinutes * 60_000).toISOString()
}

async function getCompletionContextForFailedAttempt(
  database: D1Database,
  userId: number,
  attempt: QuizAttemptRow,
): Promise<QuizCompletionContext> {
  const [progressRows, courseProgress] = await Promise.all([
    findRequiredLessonProgressRows(database, userId, attempt.course_id),
    getStudentCourseProgress(database, userId, attempt.course_slug),
  ])

  return {
    newlyUnlockedNextLesson: null,
    topicProgress: calculateTopicProgress(progressRows, attempt.topic_slug),
    courseProgress,
  }
}

async function getResultCompletionContext(
  database: D1Database,
  userId: number,
  attempt: QuizAttemptRow,
): Promise<QuizCompletionContext> {
  if (attempt.passed === 1) {
    const lessonContext = await getAccessibleLessonContext(
      database,
      userId,
      attempt.lesson_public_id,
    )
    const completion = await completeActivityLesson(
      database,
      userId,
      lessonContext,
    )

    return {
      newlyUnlockedNextLesson: completion.newlyUnlockedNextLesson,
      topicProgress: completion.topicProgress,
      courseProgress: completion.courseProgress,
    }
  }

  return getCompletionContextForFailedAttempt(database, userId, attempt)
}

function findChoice(
  question: QuizQuestion,
  choiceId: number | null,
  textSnapshot: string | null = null,
): SafeQuizChoice | null {
  if (choiceId === null) {
    return null
  }

  const choice = question.choices.find((candidate) => candidate.id === choiceId)

  if (choice === undefined) {
    return null
  }

  return {
    id: choice.id,
    text: textSnapshot ?? choice.text,
    position: choice.position,
  }
}

function buildResultPayload(
  attempt: QuizAttemptRow,
  questions: QuizQuestion[],
  answers: AttemptAnswerRow[],
  completion: QuizCompletionContext,
): QuizAttemptResult {
  if (
    attempt.submitted_at === null ||
    attempt.score_percent === null ||
    attempt.passed === null
  ) {
    throw new AppError(
      409,
      'QUIZ_NOT_SUBMITTED',
      'Quiz results are available after submission.',
    )
  }

  const answerByQuestionId = new Map(
    answers.map((answer) => [answer.question_id, answer]),
  )

  return {
    quiz: {
      id: attempt.quiz_id,
      title: attempt.quiz_title,
      passingScore: attempt.passing_score,
    },
    attempt: {
      publicId: attempt.attempt_public_id,
      attemptNumber: attempt.attempt_number,
      status: attempt.status,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
    },
    totalPoints: attempt.total_points,
    earnedPoints: attempt.earned_points,
    scorePercent: attempt.score_percent,
    passed: attempt.passed === 1,
    questions: questions.map((question) => {
      const answer = answerByQuestionId.get(question.id)
      const correctChoice = question.choices.find((choice) => choice.isCorrect)

      if (correctChoice === undefined) {
        throw new Error(`Question ${question.id} has no correct choice.`)
      }

      return {
        id: question.id,
        prompt: question.prompt,
        points: question.points,
        position: question.position,
        selectedChoice: findChoice(
          question,
          answer?.selected_choice_id ?? null,
          answer?.selected_choice_text_snapshot ?? null,
        ),
        correctChoice: {
          id: correctChoice.id,
          text:
            answer?.correct_choice_text_snapshot ??
            correctChoice.text,
          position: correctChoice.position,
        },
        isCorrect: answer?.is_correct === 1,
        pointsAwarded: answer?.points_awarded ?? 0,
        explanation:
          attempt.show_explanations === 1 ? question.explanation : null,
        choices: question.choices.map((choice) => ({
          id: choice.id,
          text: choice.text,
          position: choice.position,
        })),
      }
    }),
    ...completion,
  }
}

async function buildSubmittedResult(
  database: D1Database,
  userId: number,
  attempt: QuizAttemptRow,
): Promise<QuizAttemptResult> {
  const { questions, answers } = await getQuestionsAndAnswers(
    database,
    attempt,
  )
  const completion = await getResultCompletionContext(
    database,
    userId,
    attempt,
  )

  return buildResultPayload(attempt, questions, answers, completion)
}

export async function getLessonQuizSummary(
  database: D1Database,
  userId: number,
  lessonPublicId: string,
): Promise<LessonQuizSummary> {
  const quiz = await findPublishedQuizByLessonPublicId(
    database,
    lessonPublicId,
  )

  if (quiz === null) {
    throw new AppError(
      404,
      'QUIZ_NOT_FOUND',
      'The requested quiz was not found.',
    )
  }

  await getAccessibleLessonContext(database, userId, quiz.lesson_public_id)

  const [questionCount, attempts] = await Promise.all([
    countQuizQuestions(database, quiz.quiz_id),
    findAttemptHistory(database, quiz.quiz_id, userId),
  ])
  const mappedAttempts = attempts.map(mapAttemptHistory)
  const inProgressAttempt =
    mappedAttempts.find((attempt) => attempt.status === 'in_progress') ?? null

  return {
    quiz: {
      id: quiz.quiz_id,
      title: quiz.quiz_title,
      description: quiz.quiz_description,
      passingScore: quiz.passing_score,
      questionCount,
      timeLimitMinutes: quiz.time_limit_minutes,
      maximumAttempts: quiz.maximum_attempts,
      attemptsRemaining: getAttemptsRemaining(
        quiz.maximum_attempts,
        attempts.length,
      ),
    },
    inProgressAttempt,
    attempts: mappedAttempts,
  }
}

export async function startQuizAttempt(
  database: D1Database,
  userId: number,
  quizId: number,
): Promise<QuizAttemptPayload> {
  const { quiz, lessonContext } = await getAccessibleQuiz(
    database,
    userId,
    quizId,
  )
  const [questionRows, attempts, maxAttemptNumber] = await Promise.all([
    findQuizQuestionsWithChoices(database, quiz.quiz_id),
    findAttemptHistory(database, quiz.quiz_id, userId),
    findMaxAttemptNumber(database, quiz.quiz_id, userId),
  ])

  if (
    quiz.maximum_attempts !== null &&
    attempts.length >= quiz.maximum_attempts
  ) {
    throw new AppError(
      409,
      'MAXIMUM_ATTEMPTS_REACHED',
      'The maximum number of attempts has been reached.',
    )
  }

  const questions = groupQuestions(questionRows)
  const totalPoints = questions.reduce(
    (sum, question) => sum + question.points,
    0,
  )
  const attempt = await createQuizAttempt(database, {
    publicId: `quiz-attempt-${crypto.randomUUID()}`,
    quizId: quiz.quiz_id,
    userId,
    attemptNumber: maxAttemptNumber + 1,
    totalPoints,
    expiresAt: calculateExpiresAt(quiz.time_limit_minutes),
  })

  if (attempt === null) {
    throw new Error('The quiz attempt could not be loaded.')
  }

  await startActivityLesson(database, userId, lessonContext)

  return {
    attempt: {
      publicId: attempt.attempt_public_id,
      status: attempt.status,
      attemptNumber: attempt.attempt_number,
      startedAt: attempt.started_at,
      expiresAt: attempt.expires_at,
    },
    quiz: {
      id: quiz.quiz_id,
      title: quiz.quiz_title,
      passingScore: quiz.passing_score,
      questionCount: questions.length,
      timeLimitMinutes: quiz.time_limit_minutes,
    },
    questions: mapSafeQuestions(questions, []),
  }
}

export async function getQuizAttempt(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
): Promise<QuizAttemptPayload | { attempt: QuizAttemptPayload['attempt']; resultAvailable: true }> {
  const attempt = await getOwnedAttempt(database, userId, attemptPublicId)

  if (attempt.status === 'submitted') {
    return {
      attempt: {
        publicId: attempt.attempt_public_id,
        status: attempt.status,
        attemptNumber: attempt.attempt_number,
        startedAt: attempt.started_at,
        expiresAt: attempt.expires_at,
      },
      resultAvailable: true,
    }
  }

  if (attempt.status !== 'in_progress') {
    throw new AppError(
      409,
      'ATTEMPT_EXPIRED',
      'This quiz attempt is no longer in progress.',
    )
  }

  await assertAttemptNotExpired(database, attempt)

  const { questions, answers } = await getQuestionsAndAnswers(
    database,
    attempt,
  )

  return {
    attempt: {
      publicId: attempt.attempt_public_id,
      status: attempt.status,
      attemptNumber: attempt.attempt_number,
      startedAt: attempt.started_at,
      expiresAt: attempt.expires_at,
    },
    quiz: {
      id: attempt.quiz_id,
      title: attempt.quiz_title,
      passingScore: attempt.passing_score,
      questionCount: questions.length,
      timeLimitMinutes: attempt.time_limit_minutes,
    },
    questions: mapSafeQuestions(questions, answers),
  }
}

export async function saveQuizAnswer(
  database: D1Database,
  userId: number,
  input: {
    attemptPublicId: string
    questionId: number
    selectedChoiceId: number
  },
): Promise<SaveAnswerResult> {
  const attempt = await getOwnedAttempt(database, userId, input.attemptPublicId)

  if (attempt.status === 'submitted') {
    throw new AppError(
      409,
      'ATTEMPT_ALREADY_SUBMITTED',
      'Submitted quiz attempts cannot be edited.',
    )
  }

  if (attempt.status !== 'in_progress') {
    throw new AppError(
      409,
      'ATTEMPT_EXPIRED',
      'This quiz attempt is no longer in progress.',
    )
  }

  await assertAttemptNotExpired(database, attempt)

  const question = await findQuestionInQuiz(
    database,
    attempt.quiz_id,
    input.questionId,
  )

  if (question === null) {
    throw new AppError(
      400,
      'QUESTION_NOT_IN_QUIZ',
      'The question does not belong to this quiz.',
    )
  }

  const choice = await findChoiceInQuestion(
    database,
    input.questionId,
    input.selectedChoiceId,
  )

  if (choice === null) {
    throw new AppError(
      400,
      'CHOICE_NOT_IN_QUESTION',
      'The selected choice does not belong to this question.',
    )
  }

  await saveAttemptAnswer(database, {
    attemptId: attempt.attempt_id,
    questionId: input.questionId,
    selectedChoiceId: input.selectedChoiceId,
  })

  const [answers, totalCount] = await Promise.all([
    findAttemptAnswers(database, attempt.attempt_id),
    countQuizQuestions(database, attempt.quiz_id),
  ])

  return {
    saved: true,
    answeredCount: answers.filter(
      (answer) => answer.selected_choice_id !== null,
    ).length,
    totalCount,
  }
}

async function persistScore(
  database: D1Database,
  attempt: QuizAttemptRow,
  score: QuizScore,
): Promise<QuizAttemptRow> {
  await updateAttemptAnswerScores(
    database,
    attempt.attempt_id,
    score.questions.map((question) => ({
      questionId: question.questionId,
      selectedChoiceId: question.selectedChoiceId,
      isCorrect: question.isCorrect,
      pointsAwarded: question.pointsAwarded,
    })),
  )
  await submitAttempt(database, {
    attemptId: attempt.attempt_id,
    earnedPoints: score.earnedPoints,
    totalPoints: score.totalPoints,
    scorePercent: score.scorePercent,
    passed: score.passed,
  })

  const submittedAttempt = await findAttemptByPublicId(
    database,
    attempt.attempt_public_id,
  )

  if (submittedAttempt === null) {
    throw new Error('Submitted quiz attempt could not be loaded.')
  }

  return submittedAttempt
}

export async function submitQuizAttempt(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
): Promise<QuizAttemptResult> {
  const attempt = await getOwnedAttempt(database, userId, attemptPublicId)

  if (attempt.status === 'submitted') {
    return buildSubmittedResult(database, userId, attempt)
  }

  if (attempt.status !== 'in_progress') {
    throw new AppError(
      409,
      'ATTEMPT_EXPIRED',
      'This quiz attempt is no longer in progress.',
    )
  }

  await assertAttemptNotExpired(database, attempt)

  const { questions, answers } = await getQuestionsAndAnswers(
    database,
    attempt,
  )
  const score = scoreQuiz(questions, answers, attempt.passing_score)
  const submittedAttempt = await persistScore(database, attempt, score)
  const completion =
    score.passed
      ? await getResultCompletionContext(database, userId, submittedAttempt)
      : await getCompletionContextForFailedAttempt(
          database,
          userId,
          submittedAttempt,
        )
  const scoredAnswers = await findAttemptAnswers(
    database,
    attempt.attempt_id,
  )

  return buildResultPayload(
    submittedAttempt,
    questions,
    scoredAnswers,
    completion,
  )
}

export async function getQuizAttemptResult(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
): Promise<QuizAttemptResult> {
  const attempt = await getOwnedAttempt(database, userId, attemptPublicId)

  if (attempt.status !== 'submitted') {
    throw new AppError(
      409,
      'QUIZ_NOT_SUBMITTED',
      'Quiz results are available after submission.',
    )
  }

  return buildSubmittedResult(database, userId, attempt)
}

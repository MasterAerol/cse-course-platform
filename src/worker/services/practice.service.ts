import {
  scoreAssessment,
  type AssessmentScore,
} from '../domain/assessment-scoring'
import {
  calculateTopicProgress,
} from '../domain/progress-calculation'
import {
  findRequiredLessonProgressRows,
} from '../repositories/course.repository'
import {
  countPracticeQuestions,
  createPracticeAttempt,
  createGeneratedQuestionChoices,
  createGeneratedQuestionSnapshots,
  findGeneratedChoiceInSnapshot,
  findGeneratedPracticeAttemptAnswers,
  findGeneratedQuestionsWithChoices,
  findGeneratedSnapshotIdsByPublicIds,
  findGeneratedSnapshotInAttempt,
  findMaxPracticeAttemptNumber,
  findPracticeAttemptAnswers,
  findPracticeAttemptByPublicId,
  findPracticeAttemptHistory,
  findPracticeChoiceInQuestion,
  findPracticeQuestionInSet,
  findPracticeQuestionsWithChoices,
  findPracticeSetGeneratorConfig,
  findPracticeSetById,
  findPublishedPracticeSetByLessonPublicId,
  saveGeneratedPracticeAttemptAnswer,
  savePracticeAttemptAnswer,
  submitPracticeAttempt,
  updateGeneratedPracticeAttemptAnswerScores,
  updatePracticeAttemptAnswerScores,
  type GeneratedPracticeAttemptAnswerRow,
  type GeneratedQuestionChoiceRow,
  type PracticeAccessRow,
  type PracticeAttemptAnswerRow,
  type PracticeAttemptHistoryRow,
  type PracticeAttemptRow,
  type PracticeQuestionChoiceRow,
  type PracticeSetGeneratorConfigRow,
} from '../repositories/practice.repository'
import {
  generateValidatedQuestion,
} from '../generators/generator.registry'
import { createAttemptSeed } from '../generators/generator-random'
import type {
  GeneratedExplanation,
  GeneratedQuestion,
  GeneratorDifficulty,
} from '../generators/generator.types'
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

export interface SafePracticeChoice {
  id: number
  text: string
  position: number
}

export interface PracticeQuestion {
  id: number
  prompt: string
  explanation: string | null
  points: number
  position: number
  generator: {
    slug: string
    version: number
    difficulty: GeneratorDifficulty
  } | null
  choices: Array<SafePracticeChoice & { isCorrect: boolean }>
}

export interface SafePracticeQuestion {
  id: number
  prompt: string
  points: number
  position: number
  selectedChoiceId: number | null
  choices: SafePracticeChoice[]
}

export interface PracticeAttemptHistoryItem {
  attemptPublicId: string
  attemptNumber: number
  status: string
  earnedPoints: number
  totalPoints: number
  scorePercent: number | null
  passed: boolean | null
  startedAt: string
  submittedAt: string | null
}

export interface LessonPracticeSummary {
  practice: {
    id: number
    title: string
    instructions: string | null
    passingScore: number
    questionCount: number
    maximumAttempts: number | null
    attemptsRemaining: number | null
  }
  lessonCompleted: boolean
  inProgressAttempt: PracticeAttemptHistoryItem | null
  attempts: PracticeAttemptHistoryItem[]
}

export interface PracticeAttemptPayload {
  attempt: {
    publicId: string
    status: string
    attemptNumber: number
    startedAt: string
  }
  practice: {
    id: number
    title: string
    passingScore: number
    questionCount: number
  }
  questions: SafePracticeQuestion[]
  answeredCount: number
  totalCount: number
}

export interface SavePracticeAnswerResult {
  saved: true
  answeredCount: number
  totalCount: number
}

export interface PracticeAttemptResult {
  practice: {
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
    selectedChoice: SafePracticeChoice | null
    correctChoice: SafePracticeChoice
    isCorrect: boolean
    pointsAwarded: number
    explanation: string | null
    generator: {
      slug: string
      version: number
      difficulty: GeneratorDifficulty
    } | null
    choices: SafePracticeChoice[]
  }>
  newlyUnlockedNextLesson: LessonNavigationItem | null
  topicProgress: TopicProgress
  courseProgress: CourseProgressState
}

interface PracticeCompletionContext {
  newlyUnlockedNextLesson: LessonNavigationItem | null
  topicProgress: TopicProgress
  courseProgress: CourseProgressState
}

function assertPracticeLesson(practice: Pick<PracticeAccessRow, 'lesson_type'>) {
  if (practice.lesson_type === 'practice') {
    return
  }

  throw new AppError(
    404,
    'PRACTICE_NOT_FOUND',
    'The requested practice activity was not found.',
  )
}

async function getAccessiblePractice(
  database: D1Database,
  userId: number,
  practiceSetId: number,
): Promise<{
  practice: PracticeAccessRow
  lessonContext: Awaited<ReturnType<typeof getAccessibleLessonContext>>
}> {
  const practice = await findPracticeSetById(database, practiceSetId)

  if (practice === null) {
    throw new AppError(
      404,
      'PRACTICE_NOT_FOUND',
      'The requested practice activity was not found.',
    )
  }

  assertPracticeLesson(practice)

  if (practice.practice_status !== 'published') {
    throw new AppError(
      404,
      'PRACTICE_NOT_PUBLISHED',
      'The requested practice activity is not available.',
    )
  }

  const lessonContext = await getAccessibleLessonContext(
    database,
    userId,
    practice.lesson_public_id,
  )

  return { practice, lessonContext }
}

function groupPracticeQuestions(
  rows: PracticeQuestionChoiceRow[],
): PracticeQuestion[] {
  const questions = new Map<number, PracticeQuestion>()

  for (const row of rows) {
    const existing = questions.get(row.question_id)
    const question =
      existing ??
      {
        id: row.question_id,
        prompt: row.question_prompt,
        explanation: row.explanation,
        points: row.points,
        position: row.question_position,
        generator: null,
        choices: [],
      }

    question.choices.push({
      id: row.choice_id,
      text: row.choice_text,
      position: row.choice_position,
      isCorrect: row.is_correct === 1,
    })

    if (existing === undefined) {
      questions.set(row.question_id, question)
    }
  }

  return Array.from(questions.values()).sort(
    (left, right) => left.position - right.position,
  )
}

function mapGeneratedAnswers(
  answers: GeneratedPracticeAttemptAnswerRow[],
): PracticeAttemptAnswerRow[] {
  return answers.map((answer) => ({
    question_id: answer.snapshot_id,
    selected_choice_id: answer.selected_choice_id,
    is_correct: answer.is_correct,
    points_awarded: answer.points_awarded,
    answered_at: answer.answered_at,
  }))
}

function parseGeneratedExplanation(explanationJson: string): string {
  const parsed = JSON.parse(explanationJson) as GeneratedExplanation
  const steps = parsed.steps.join(' ')

  return `${parsed.title}: ${steps} Final answer: ${parsed.finalAnswer}`
}

function groupGeneratedQuestions(
  rows: GeneratedQuestionChoiceRow[],
): PracticeQuestion[] {
  const questions = new Map<number, PracticeQuestion>()

  for (const row of rows) {
    const existing = questions.get(row.snapshot_id)
    const question =
      existing ??
      {
        id: row.snapshot_id,
        prompt: row.prompt,
        explanation: parseGeneratedExplanation(row.explanation_json),
        points: 1,
        position: row.source_position,
        generator: {
          slug: row.generator_slug,
          version: row.generator_version,
          difficulty: row.difficulty,
        },
        choices: [],
      }

    question.choices.push({
      id: row.choice_id,
      text: row.choice_text,
      position: row.choice_position,
      isCorrect: row.is_correct === 1,
    })

    if (existing === undefined) {
      questions.set(row.snapshot_id, question)
    }
  }

  return Array.from(questions.values()).sort(
    (left, right) => left.position - right.position,
  )
}

function buildDifficultyPlan(
  config: PracticeSetGeneratorConfigRow,
): GeneratorDifficulty[] {
  return [
    ...Array<GeneratorDifficulty>(config.easy_count).fill('easy'),
    ...Array<GeneratorDifficulty>(config.medium_count).fill('medium'),
    ...Array<GeneratorDifficulty>(config.hard_count).fill('hard'),
  ]
}

function createGeneratedQuestionsForAttempt(
  config: PracticeSetGeneratorConfigRow,
): Array<{ publicId: string; question: GeneratedQuestion; position: number }> {
  const attemptSeed = createAttemptSeed()
  const signatures = new Set<string>()

  return buildDifficultyPlan(config).map((difficulty, index) => {
    const question = generateValidatedQuestion({
      attemptSeed,
      generatorSlug: config.generator_slug,
      generatorVersion: config.generator_version,
      difficulty,
      position: index + 1,
      existingSignatures: signatures,
    })

    signatures.add(question.metadata.canonicalSignature)

    return {
      publicId: `generated-question-${crypto.randomUUID()}`,
      question,
      position: index + 1,
    }
  })
}

async function persistGeneratedQuestions(
  database: D1Database,
  input: {
    ownerUserId: number
    attemptId: number
    generatedQuestions: Array<{
      publicId: string
      question: GeneratedQuestion
      position: number
    }>
  },
): Promise<void> {
  await createGeneratedQuestionSnapshots(database, {
    ownerUserId: input.ownerUserId,
    practiceAttemptId: input.attemptId,
    snapshots: input.generatedQuestions.map((generatedQuestion) => ({
      publicId: generatedQuestion.publicId,
      sourcePosition: generatedQuestion.position,
      generatorSlug: generatedQuestion.question.generatorSlug,
      generatorVersion: generatedQuestion.question.generatorVersion,
      seed: generatedQuestion.question.seed,
      difficulty: generatedQuestion.question.difficulty,
      prompt: generatedQuestion.question.prompt,
      explanationJson: JSON.stringify(generatedQuestion.question.explanation),
      parametersJson: JSON.stringify(generatedQuestion.question.parameters),
      metadataJson: JSON.stringify(generatedQuestion.question.metadata),
    })),
  })

  const snapshotIds = await findGeneratedSnapshotIdsByPublicIds(
    database,
    input.attemptId,
    input.generatedQuestions.map((question) => question.publicId),
  )
  const snapshotIdByPublicId = new Map(
    snapshotIds.map((snapshot) => [snapshot.public_id, snapshot.id]),
  )
  const choices = input.generatedQuestions.flatMap((generatedQuestion) => {
    const snapshotId = snapshotIdByPublicId.get(generatedQuestion.publicId)

    if (snapshotId === undefined) {
      throw new Error('Generated snapshot could not be loaded after insert.')
    }

    return generatedQuestion.question.choices.map((choice, index) => ({
      snapshotId,
      publicId: `generated-choice-${crypto.randomUUID()}`,
      choiceText: choice.text,
      isCorrect: choice.isCorrect,
      position: index + 1,
      distractorType: choice.distractorType,
    }))
  })

  await createGeneratedQuestionChoices(database, choices)
}

function mapPracticeHistory(
  row: PracticeAttemptHistoryRow,
): PracticeAttemptHistoryItem {
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

function countAnswered(answers: PracticeAttemptAnswerRow[]): number {
  return answers.filter((answer) => answer.selected_choice_id !== null).length
}

function mapSafeQuestions(
  questions: PracticeQuestion[],
  answers: PracticeAttemptAnswerRow[],
): SafePracticeQuestion[] {
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

function assertPracticeAttemptOwner(
  attempt: PracticeAttemptRow,
  userId: number,
): void {
  if (attempt.user_id === userId) {
    return
  }

  throw new AppError(
    403,
    'ATTEMPT_FORBIDDEN',
    'This practice attempt belongs to another user.',
  )
}

async function getOwnedPracticeAttempt(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
): Promise<PracticeAttemptRow> {
  const attempt = await findPracticeAttemptByPublicId(
    database,
    attemptPublicId,
  )

  if (attempt === null) {
    throw new AppError(
      404,
      'ATTEMPT_NOT_FOUND',
      'The requested practice attempt was not found.',
    )
  }

  assertPracticeAttemptOwner(attempt, userId)

  return attempt
}

async function getQuestionsAndAnswers(
  database: D1Database,
  attempt: PracticeAttemptRow,
): Promise<{
  questions: PracticeQuestion[]
  answers: PracticeAttemptAnswerRow[]
}> {
  if (attempt.question_source === 'generated') {
    const [questionRows, answers] = await Promise.all([
      findGeneratedQuestionsWithChoices(database, attempt.attempt_id),
      findGeneratedPracticeAttemptAnswers(database, attempt.attempt_id),
    ])

    return {
      questions: groupGeneratedQuestions(questionRows),
      answers: mapGeneratedAnswers(answers),
    }
  }

  const [questionRows, answers] = await Promise.all([
    findPracticeQuestionsWithChoices(database, attempt.practice_set_id),
    findPracticeAttemptAnswers(database, attempt.attempt_id),
  ])

  return {
    questions: groupPracticeQuestions(questionRows),
    answers,
  }
}

async function getCompletionContextForFailedAttempt(
  database: D1Database,
  userId: number,
  attempt: PracticeAttemptRow,
): Promise<PracticeCompletionContext> {
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
  attempt: PracticeAttemptRow,
): Promise<PracticeCompletionContext> {
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
  question: PracticeQuestion,
  choiceId: number | null,
): SafePracticeChoice | null {
  if (choiceId === null) {
    return null
  }

  const choice = question.choices.find((candidate) => candidate.id === choiceId)

  if (choice === undefined) {
    return null
  }

  return {
    id: choice.id,
    text: choice.text,
    position: choice.position,
  }
}

function buildPracticeResultPayload(
  attempt: PracticeAttemptRow,
  questions: PracticeQuestion[],
  answers: PracticeAttemptAnswerRow[],
  completion: PracticeCompletionContext,
): PracticeAttemptResult {
  if (
    attempt.submitted_at === null ||
    attempt.score_percent === null ||
    attempt.passed === null
  ) {
    throw new AppError(
      409,
      'PRACTICE_NOT_SUBMITTED',
      'Practice results are available after submission.',
    )
  }

  const answerByQuestionId = new Map(
    answers.map((answer) => [answer.question_id, answer]),
  )

  return {
    practice: {
      id: attempt.practice_set_id,
      title: attempt.practice_title,
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
        ),
        correctChoice: {
          id: correctChoice.id,
          text: correctChoice.text,
          position: correctChoice.position,
        },
        isCorrect: answer?.is_correct === 1,
        pointsAwarded: answer?.points_awarded ?? 0,
        explanation:
          attempt.show_explanations === 1 ? question.explanation : null,
        generator: question.generator,
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

async function buildSubmittedPracticeResult(
  database: D1Database,
  userId: number,
  attempt: PracticeAttemptRow,
): Promise<PracticeAttemptResult> {
  const { questions, answers } = await getQuestionsAndAnswers(
    database,
    attempt,
  )
  const completion = await getResultCompletionContext(
    database,
    userId,
    attempt,
  )

  return buildPracticeResultPayload(attempt, questions, answers, completion)
}

export async function getLessonPracticeSummary(
  database: D1Database,
  userId: number,
  lessonPublicId: string,
): Promise<LessonPracticeSummary> {
  const practice = await findPublishedPracticeSetByLessonPublicId(
    database,
    lessonPublicId,
  )

  if (practice === null) {
    throw new AppError(
      404,
      'PRACTICE_NOT_FOUND',
      'The requested practice activity was not found.',
    )
  }

  assertPracticeLesson(practice)

  const lessonContext = await getAccessibleLessonContext(
    database,
    userId,
    practice.lesson_public_id,
  )
  const [questionCount, attempts] = await Promise.all([
    practice.question_source === 'generated'
      ? Promise.resolve(practice.question_count)
      : countPracticeQuestions(database, practice.practice_set_id),
    findPracticeAttemptHistory(database, practice.practice_set_id, userId),
  ])
  const mappedAttempts = attempts.map(mapPracticeHistory)
  const inProgressAttempt =
    mappedAttempts.find((attempt) => attempt.status === 'in_progress') ?? null

  return {
    practice: {
      id: practice.practice_set_id,
      title: practice.practice_title,
      instructions: practice.instructions,
      passingScore: practice.passing_score,
      questionCount,
      maximumAttempts: practice.maximum_attempts,
      attemptsRemaining: getAttemptsRemaining(
        practice.maximum_attempts,
        attempts.length,
      ),
    },
    lessonCompleted: lessonContext.currentLesson.progress_status === 'completed',
    inProgressAttempt,
    attempts: mappedAttempts,
  }
}

export async function startPracticeAttempt(
  database: D1Database,
  userId: number,
  practiceSetId: number,
): Promise<PracticeAttemptPayload> {
  const { practice, lessonContext } = await getAccessiblePractice(
    database,
    userId,
    practiceSetId,
  )
  const [attempts, maxAttemptNumber] = await Promise.all([
    findPracticeAttemptHistory(database, practice.practice_set_id, userId),
    findMaxPracticeAttemptNumber(database, practice.practice_set_id, userId),
  ])

  if (
    practice.maximum_attempts !== null &&
    attempts.length >= practice.maximum_attempts
  ) {
    throw new AppError(
      409,
      'MAXIMUM_ATTEMPTS_REACHED',
      'The maximum number of attempts has been reached.',
    )
  }

  if (practice.question_source === 'generated') {
    const config = await findPracticeSetGeneratorConfig(
      database,
      practice.practice_set_id,
    )

    if (config === null) {
      throw new Error('Generated practice set is missing generator config.')
    }

    const generatedQuestions = createGeneratedQuestionsForAttempt(config)
    const attempt = await createPracticeAttempt(database, {
      publicId: `practice-attempt-${crypto.randomUUID()}`,
      practiceSetId: practice.practice_set_id,
      userId,
      attemptNumber: maxAttemptNumber + 1,
      totalPoints: generatedQuestions.length,
    })

    if (attempt === null) {
      throw new Error('The practice attempt could not be loaded.')
    }

    await persistGeneratedQuestions(database, {
      ownerUserId: userId,
      attemptId: attempt.attempt_id,
      generatedQuestions,
    })
    await startActivityLesson(database, userId, lessonContext)

    const questionRows = await findGeneratedQuestionsWithChoices(
      database,
      attempt.attempt_id,
    )
    const questions = groupGeneratedQuestions(questionRows)

    return {
      attempt: {
        publicId: attempt.attempt_public_id,
        status: attempt.status,
        attemptNumber: attempt.attempt_number,
        startedAt: attempt.started_at,
      },
      practice: {
        id: practice.practice_set_id,
        title: practice.practice_title,
        passingScore: practice.passing_score,
        questionCount: questions.length,
      },
      questions: mapSafeQuestions(questions, []),
      answeredCount: 0,
      totalCount: questions.length,
    }
  }

  const questionRows = await findPracticeQuestionsWithChoices(
    database,
    practice.practice_set_id,
  )
  const questions = groupPracticeQuestions(questionRows)
  const totalPoints = questions.reduce(
    (sum, question) => sum + question.points,
    0,
  )
  const attempt = await createPracticeAttempt(database, {
    publicId: `practice-attempt-${crypto.randomUUID()}`,
    practiceSetId: practice.practice_set_id,
    userId,
    attemptNumber: maxAttemptNumber + 1,
    totalPoints,
  })

  if (attempt === null) {
    throw new Error('The practice attempt could not be loaded.')
  }

  await startActivityLesson(database, userId, lessonContext)

  return {
    attempt: {
      publicId: attempt.attempt_public_id,
      status: attempt.status,
      attemptNumber: attempt.attempt_number,
      startedAt: attempt.started_at,
    },
    practice: {
      id: practice.practice_set_id,
      title: practice.practice_title,
      passingScore: practice.passing_score,
      questionCount: questions.length,
    },
    questions: mapSafeQuestions(questions, []),
    answeredCount: 0,
    totalCount: questions.length,
  }
}

export async function getPracticeAttempt(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
): Promise<
  | PracticeAttemptPayload
  | { attempt: PracticeAttemptPayload['attempt']; resultAvailable: true }
> {
  const attempt = await getOwnedPracticeAttempt(database, userId, attemptPublicId)

  if (attempt.status === 'submitted') {
    return {
      attempt: {
        publicId: attempt.attempt_public_id,
        status: attempt.status,
        attemptNumber: attempt.attempt_number,
        startedAt: attempt.started_at,
      },
      resultAvailable: true,
    }
  }

  if (attempt.status !== 'in_progress') {
    throw new AppError(
      409,
      'ATTEMPT_ALREADY_SUBMITTED',
      'This practice attempt is no longer in progress.',
    )
  }

  const { questions, answers } = await getQuestionsAndAnswers(database, attempt)

  return {
    attempt: {
      publicId: attempt.attempt_public_id,
      status: attempt.status,
      attemptNumber: attempt.attempt_number,
      startedAt: attempt.started_at,
    },
    practice: {
      id: attempt.practice_set_id,
      title: attempt.practice_title,
      passingScore: attempt.passing_score,
      questionCount: questions.length,
    },
    questions: mapSafeQuestions(questions, answers),
    answeredCount: countAnswered(answers),
    totalCount: questions.length,
  }
}

export async function savePracticeAnswer(
  database: D1Database,
  userId: number,
  input: {
    attemptPublicId: string
    questionId: number
    selectedChoiceId: number
  },
): Promise<SavePracticeAnswerResult> {
  const attempt = await getOwnedPracticeAttempt(
    database,
    userId,
    input.attemptPublicId,
  )

  if (attempt.status === 'submitted') {
    throw new AppError(
      409,
      'ATTEMPT_ALREADY_SUBMITTED',
      'Submitted practice attempts cannot be edited.',
    )
  }

  if (attempt.status !== 'in_progress') {
    throw new AppError(
      409,
      'ATTEMPT_ALREADY_SUBMITTED',
      'This practice attempt is no longer in progress.',
    )
  }

  if (attempt.question_source === 'generated') {
    const snapshot = await findGeneratedSnapshotInAttempt(
      database,
      attempt.attempt_id,
      input.questionId,
    )

    if (snapshot === null) {
      throw new AppError(
        400,
        'QUESTION_NOT_IN_PRACTICE',
        'The question does not belong to this practice activity.',
      )
    }

    const choice = await findGeneratedChoiceInSnapshot(
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

    await saveGeneratedPracticeAttemptAnswer(database, {
      attemptId: attempt.attempt_id,
      snapshotId: input.questionId,
      selectedChoiceId: input.selectedChoiceId,
    })

    const answers = mapGeneratedAnswers(
      await findGeneratedPracticeAttemptAnswers(database, attempt.attempt_id),
    )

    return {
      saved: true,
      answeredCount: countAnswered(answers),
      totalCount: attempt.total_points,
    }
  }

  const question = await findPracticeQuestionInSet(
    database,
    attempt.practice_set_id,
    input.questionId,
  )

  if (question === null) {
    throw new AppError(
      400,
      'QUESTION_NOT_IN_PRACTICE',
      'The question does not belong to this practice activity.',
    )
  }

  const choice = await findPracticeChoiceInQuestion(
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

  await savePracticeAttemptAnswer(database, {
    attemptId: attempt.attempt_id,
    questionId: input.questionId,
    selectedChoiceId: input.selectedChoiceId,
  })

  const [answers, totalCount] = await Promise.all([
    findPracticeAttemptAnswers(database, attempt.attempt_id),
    countPracticeQuestions(database, attempt.practice_set_id),
  ])

  return {
    saved: true,
    answeredCount: countAnswered(answers),
    totalCount,
  }
}

async function persistScore(
  database: D1Database,
  attempt: PracticeAttemptRow,
  score: AssessmentScore,
): Promise<PracticeAttemptRow> {
  if (attempt.question_source === 'generated') {
    await updateGeneratedPracticeAttemptAnswerScores(
      database,
      attempt.attempt_id,
      score.questions.map((question) => ({
        snapshotId: question.questionId,
        selectedChoiceId: question.selectedChoiceId,
        isCorrect: question.isCorrect,
        pointsAwarded: question.pointsAwarded,
      })),
    )
  } else {
    await updatePracticeAttemptAnswerScores(
      database,
      attempt.attempt_id,
      score.questions.map((question) => ({
        questionId: question.questionId,
        selectedChoiceId: question.selectedChoiceId,
        isCorrect: question.isCorrect,
        pointsAwarded: question.pointsAwarded,
      })),
    )
  }

  await submitPracticeAttempt(database, {
    attemptId: attempt.attempt_id,
    earnedPoints: score.earnedPoints,
    totalPoints: score.totalPoints,
    scorePercent: score.scorePercent,
    passed: score.passed,
  })

  const submittedAttempt = await findPracticeAttemptByPublicId(
    database,
    attempt.attempt_public_id,
  )

  if (submittedAttempt === null) {
    throw new Error('Submitted practice attempt could not be loaded.')
  }

  return submittedAttempt
}

export async function submitPracticeAttemptByPublicId(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
): Promise<PracticeAttemptResult> {
  const attempt = await getOwnedPracticeAttempt(database, userId, attemptPublicId)

  if (attempt.status === 'submitted') {
    return buildSubmittedPracticeResult(database, userId, attempt)
  }

  if (attempt.status !== 'in_progress') {
    throw new AppError(
      409,
      'ATTEMPT_ALREADY_SUBMITTED',
      'This practice attempt is no longer in progress.',
    )
  }

  const { questions, answers } = await getQuestionsAndAnswers(database, attempt)
  const score = scoreAssessment(questions, answers, attempt.passing_score)
  const submittedAttempt = await persistScore(database, attempt, score)
  const completion =
    score.passed
      ? await getResultCompletionContext(database, userId, submittedAttempt)
      : await getCompletionContextForFailedAttempt(
          database,
          userId,
          submittedAttempt,
        )
  const { answers: scoredAnswers } = await getQuestionsAndAnswers(
    database,
    submittedAttempt,
  )

  return buildPracticeResultPayload(
    submittedAttempt,
    questions,
    scoredAnswers,
    completion,
  )
}

export async function getPracticeAttemptResult(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
): Promise<PracticeAttemptResult> {
  const attempt = await getOwnedPracticeAttempt(database, userId, attemptPublicId)

  if (attempt.status !== 'submitted') {
    throw new AppError(
      409,
      'PRACTICE_NOT_SUBMITTED',
      'Practice results are available after submission.',
    )
  }

  return buildSubmittedPracticeResult(database, userId, attempt)
}

import {
  calculateSubjectAssessmentBreakdown,
  feedbackLabel,
  type SubjectAssessmentBreakdown,
} from '../domain/subject-assessment-results'
import {
  generateSubjectAssessmentQuestions,
  numericalAbilityAssessmentSlug,
  analyticalAbilityAssessmentSlug,
  verbalAbilityAssessmentSlug,
  type SubjectAssessmentTopicSlug,
  type SubjectAssessmentBlueprint,
  validateSubjectAssessmentBlueprint,
} from '../domain/subject-assessment-blueprint'
import { scoreAssessment } from '../domain/assessment-scoring'
import type { SubjectAssessmentResult } from '../../shared/subject-assessment-result.schema'
import { getRegisteredGenerators } from '../generators/generator.registry'
import { createAttemptSeed } from '../generators/generator-random'
import type {
  GeneratedExplanation,
  GeneratorDifficulty,
} from '../generators/generator.types'
import {
  countSubjectAssessmentAttempts,
  createSubjectAssessmentAttemptWithSnapshots,
  findActiveSubjectAssessmentAttempt,
  findAssessmentBlueprintRows,
  findChoiceInAssessmentSnapshot,
  findMaxSubjectAssessmentAttemptNumber,
  findPublishedSubjectAssessmentForCourse,
  findPublishedSubjectAssessmentsForCourse,
  findPublishedTopicsForSubject,
  findSnapshotInAttempt,
  findSubjectAssessmentAnswers,
  findSubjectAssessmentAttemptByPublicId,
  findSubjectAssessmentBySlug,
  findSubjectAssessmentHistory,
  findSubjectAssessmentQuestionsWithChoices,
  findSubjectForAssessmentAdmin,
  replaceSubjectAssessmentBlueprint,
  saveSubjectAssessmentAnswerRow,
  submitSubjectAssessmentRows,
  upsertSubjectAssessment,
  type BlueprintTopicGeneratorRow,
  type SubjectAssessmentAnswerRow,
  type SubjectAssessmentAttemptRow,
  type SubjectAssessmentHistoryRow,
  type SubjectAssessmentQuestionChoiceRow,
  type SubjectAssessmentRow,
} from '../repositories/subject-assessment.repository'
import { findCourseEnrollmentById } from '../repositories/course.repository'
import type {
  AdminSubjectAssessmentInput,
  SubjectAssessmentBlueprintInput,
} from '../schemas/subject-assessment.schemas'
import type { AuthenticatedPrincipal } from '../types/auth'
import { AppError } from '../utils/app-error'
import { recordAdminAuditLog } from './admin/audit-log.service'

interface InternalChoice {
  id: number
  publicId: string
  text: string
  position: number
  isCorrect: boolean
}

interface InternalQuestion {
  id: number
  publicId: string
  position: number
  topicSlug: SubjectAssessmentTopicSlug
  topicTitle: string
  topicPosition: number
  generatorSlug: string
  generatorVersion: number
  difficulty: GeneratorDifficulty
  prompt: string
  explanation: GeneratedExplanation
  choices: InternalChoice[]
}

export interface SafeSubjectAssessmentQuestion {
  publicId: string
  position: number
  prompt: string
  selectedChoicePublicId: string | null
  choices: Array<{
    publicId: string
    text: string
    position: number
  }>
}

export interface SubjectAssessmentHistoryItem {
  attemptPublicId: string
  attemptNumber: number
  status: string
  startedAt: string
  submittedAt: string | null
  earnedPoints: number
  totalPoints: number
  scorePercent: number | null
  passed: boolean | null
  strongestTopic: string | null
  weakestTopic: string | null
}

export interface SubjectAssessmentSummary {
  assessment: {
    publicId: string
    title: string
    slug: string
    description: string | null
    subjectTitle: string
    subjectSlug: string
    questionCount: number
    passingScore: number
    maximumAttempts: number | null
    timeLimitMinutes: number | null
    blueprintVersion: number
    status: 'published'
  }
  availability: {
    available: boolean
    reason: string | null
  }
  state: 'not_started' | 'in_progress' | 'passed' | 'needs_improvement'
  inProgressAttemptPublicId: string | null
  latestScore: number | null
  bestScore: number | null
  attemptCount: number
  passed: boolean
  history: SubjectAssessmentHistoryItem[]
}

export interface SubjectAssessmentAttemptPayload {
  attempt: {
    publicId: string
    attemptNumber: number
    status: string
    startedAt: string
  }
  assessment: {
    title: string
    slug: string
    questionCount: number
    passingScore: number
  }
  questions: SafeSubjectAssessmentQuestion[]
  answeredCount: number
  totalCount: number
}

export type SubjectAssessmentResultPayload = SubjectAssessmentResult

export interface SubjectAssessmentReviewPayload
  extends SubjectAssessmentResultPayload {
  questions: Array<{
    publicId: string
    position: number
    topic: { slug: SubjectAssessmentTopicSlug; title: string }
    prompt: string
    difficulty: GeneratorDifficulty
    selectedChoice: { publicId: string; text: string; position: number } | null
    correctChoice: { publicId: string; text: string; position: number }
    isCorrect: boolean
    unanswered: boolean
    explanation: string | null
    choices: Array<{ publicId: string; text: string; position: number }>
  }>
}

function toDomainBlueprint(
  input: SubjectAssessmentBlueprintInput,
): SubjectAssessmentBlueprint {
  return {
    subjectSlug: input.subjectSlug,
    version: input.version,
    totalQuestions: input.totalQuestions,
    passingScorePercent: input.passingScorePercent,
    topics: input.topics.map((topic) => ({
      ...topic,
      generators: topic.generators.map((config) => {
        const generator = getGeneratorByInput(config.slug, config.version)
        return {
          slug: generator.slug,
          version: generator.version,
          rotationPosition: config.rotationPosition,
          selectionWeight: config.selectionWeight,
        }
      }),
    })),
  }
}

function getGeneratorByInput(slug: string, version: number) {
  const generator = getGeneratorFromRegistered(slug, version)
  if (generator === null) {
    throw new AppError(
      400,
      'ASSESSMENT_BLUEPRINT_INVALID',
      `Generator ${slug} v${version} is not registered.`,
    )
  }
  return generator
}

function getGeneratorFromRegistered(slug: string, version: number) {
  return getRegisteredGenerators().find((generator) => generator.slug === slug && generator.version === version) ?? null
}

function blueprintFromRows(
  rows: BlueprintTopicGeneratorRow[],
  subjectSlug: SubjectAssessmentBlueprint['subjectSlug'],
): SubjectAssessmentBlueprint {
  const grouped = new Map<number, SubjectAssessmentBlueprint['topics'][number]>()

  for (const row of rows) {
    const existing = grouped.get(row.blueprint_topic_id)
    const topic = existing ?? {
      topicSlug: row.topic_slug,
      topicTitle: row.topic_title,
      position: row.topic_position,
      count: row.question_count,
      difficulty: {
        easy: row.easy_count,
        medium: row.medium_count,
        hard: row.hard_count,
      },
      generators: [],
    }
    const generator = getGeneratorByInput(
      row.generator_slug,
      row.generator_version,
    )
    topic.generators.push({
      slug: generator.slug,
      version: generator.version,
      rotationPosition: row.rotation_position,
      selectionWeight: row.selection_weight,
    })
    if (existing === undefined) grouped.set(row.blueprint_topic_id, topic)
  }

  const first = rows[0]
  if (first === undefined) {
    throw new AppError(
      409,
      'ASSESSMENT_CONFIGURATION_INVALID',
      'The assessment blueprint is missing.',
    )
  }

  return {
    subjectSlug,
    version: first.blueprint_version,
    totalQuestions: first.blueprint_total_questions,
    passingScorePercent: first.blueprint_passing_score,
    topics: Array.from(grouped.values()).sort(
      (left, right) => left.position - right.position,
    ),
  }
}

function groupQuestions(
  rows: SubjectAssessmentQuestionChoiceRow[],
): InternalQuestion[] {
  const questions = new Map<number, InternalQuestion>()
  for (const row of rows) {
    const existing = questions.get(row.snapshot_id)
    const question = existing ?? {
      id: row.snapshot_id,
      publicId: row.snapshot_public_id,
      position: row.source_position,
      topicSlug: row.topic_slug,
      topicTitle: row.topic_title,
      topicPosition: row.topic_position,
      generatorSlug: row.generator_slug,
      generatorVersion: row.generator_version,
      difficulty: row.difficulty,
      prompt: row.prompt,
      explanation: JSON.parse(row.explanation_json) as GeneratedExplanation,
      choices: [],
    }
    question.choices.push({
      id: row.choice_id,
      publicId: row.choice_public_id,
      text: row.choice_text,
      position: row.choice_position,
      isCorrect: row.is_correct === 1,
    })
    if (existing === undefined) questions.set(row.snapshot_id, question)
  }
  return Array.from(questions.values()).sort(
    (left, right) => left.position - right.position,
  )
}

function assertOwner(
  attempt: SubjectAssessmentAttemptRow,
  userId: number,
): void {
  if (attempt.user_id !== userId) {
    throw new AppError(
      403,
      'ASSESSMENT_ATTEMPT_FORBIDDEN',
      'This assessment attempt belongs to another learner.',
    )
  }
}

async function getOwnedAttempt(
  database: D1Database,
  userId: number,
  publicId: string,
): Promise<SubjectAssessmentAttemptRow> {
  const attempt = await findSubjectAssessmentAttemptByPublicId(
    database,
    publicId,
  )
  if (attempt === null) {
    throw new AppError(
      404,
      'ASSESSMENT_ATTEMPT_NOT_FOUND',
      'The assessment attempt was not found.',
    )
  }
  assertOwner(attempt, userId)
  return attempt
}

function safeQuestions(
  questions: InternalQuestion[],
  answers: SubjectAssessmentAnswerRow[],
): SafeSubjectAssessmentQuestion[] {
  const answerMap = new Map(
    answers.map((answer) => [answer.snapshot_id, answer]),
  )
  return questions.map((question) => {
    const selectedId = answerMap.get(question.id)?.selected_choice_id ?? null
    return {
      publicId: question.publicId,
      position: question.position,
      prompt: question.prompt,
      selectedChoicePublicId:
        question.choices.find((choice) => choice.id === selectedId)?.publicId ??
        null,
      choices: question.choices.map((choice) => ({
        publicId: choice.publicId,
        text: choice.text,
        position: choice.position,
      })),
    }
  })
}

function attemptPayload(
  attempt: SubjectAssessmentAttemptRow,
  questions: InternalQuestion[],
  answers: SubjectAssessmentAnswerRow[],
): SubjectAssessmentAttemptPayload {
  return {
    attempt: {
      publicId: attempt.public_id,
      attemptNumber: attempt.attempt_number,
      status: attempt.status,
      startedAt: attempt.started_at,
    },
    assessment: {
      title: attempt.assessment_title,
      slug: attempt.assessment_slug,
      questionCount: questions.length,
      passingScore: attempt.passing_score,
    },
    questions: safeQuestions(questions, answers),
    answeredCount: answers.filter(
      (answer) => answer.selected_choice_id !== null,
    ).length,
    totalCount: questions.length,
  }
}

async function assertActiveCourseEnrollment(
  database: D1Database,
  userId: number,
  courseId: number,
): Promise<void> {
  const enrollment = await findCourseEnrollmentById(database, userId, courseId)
  if (enrollment === null || enrollment.has_active_access !== 1) {
    throw new AppError(
      403,
      'COURSE_ACCESS_REQUIRED',
      'An active CSE Professional enrollment is required.',
    )
  }
}

async function loadValidatedBlueprint(
  database: D1Database,
  assessment: SubjectAssessmentRow,
): Promise<{
  blueprint: SubjectAssessmentBlueprint
  blueprintId: number
  unavailableReason: string | null
}> {
  const rows = await findAssessmentBlueprintRows(
    database,
    assessment.id,
    assessment.current_blueprint_version,
  )
  const blueprint = blueprintFromRows(
    rows,
    assessment.subject_slug as SubjectAssessmentBlueprint['subjectSlug'],
  )
  const validation = validateSubjectAssessmentBlueprint(blueprint)
  const unpublished = rows
    .filter((row) => row.topic_status !== 'published')
    .map((row) => row.topic_title)

  return {
    blueprint,
    blueprintId: rows[0]?.blueprint_id ?? 0,
    unavailableReason:
      !validation.valid
        ? 'The assessment configuration is incomplete.'
        : unpublished.length > 0
          ? `All ${blueprint.topics.length} ${assessment.subject_title} topics must be published.`
          : null,
  }
}

async function breakdownForAttempt(
  database: D1Database,
  attempt: SubjectAssessmentAttemptRow,
): Promise<SubjectAssessmentBreakdown> {
  const [questions, answers] = await Promise.all([
    findSubjectAssessmentQuestionsWithChoices(database, attempt.id).then(
      groupQuestions,
    ),
    findSubjectAssessmentAnswers(database, attempt.id),
  ])
  const answerMap = new Map(answers.map((answer) => [answer.snapshot_id, answer]))
  return calculateSubjectAssessmentBreakdown(
    questions.map((question) => ({
      topicSlug: question.topicSlug,
      topicTitle: question.topicTitle,
      topicPosition: question.topicPosition,
      selectedChoiceId:
        answerMap.get(question.id)?.selected_choice_id ?? null,
      isCorrect: answerMap.get(question.id)?.is_correct === 1,
    })),
  )
}

async function mapHistory(
  database: D1Database,
  rows: SubjectAssessmentHistoryRow[],
): Promise<SubjectAssessmentHistoryItem[]> {
  return Promise.all(
    rows.map(async (row) => {
      const attempt = await findSubjectAssessmentAttemptByPublicId(
        database,
        row.attempt_public_id,
      )
      const breakdown =
        row.status === 'submitted' && attempt !== null
          ? await breakdownForAttempt(database, attempt)
          : null
      return {
        attemptPublicId: row.attempt_public_id,
        attemptNumber: row.attempt_number,
        status: row.status,
        startedAt: row.started_at,
        submittedAt: row.submitted_at,
        earnedPoints: row.earned_points,
        totalPoints: row.total_points,
        scorePercent: row.score_percent,
        passed: row.passed === null ? null : row.passed === 1,
        strongestTopic: breakdown?.strongestTopic.topicTitle ?? null,
        weakestTopic: breakdown?.weakestTopic.topicTitle ?? null,
      }
    }),
  )
}

export async function getSubjectAssessmentSummary(
  database: D1Database,
  userId: number,
  assessmentSlug = numericalAbilityAssessmentSlug,
): Promise<SubjectAssessmentSummary> {
  const assessment = await findSubjectAssessmentBySlug(database, assessmentSlug)
  if (assessment === null || assessment.status !== 'published') {
    throw new AppError(
      404,
      'SUBJECT_ASSESSMENT_NOT_FOUND',
      'The requested subject assessment is not available.',
    )
  }
  await assertActiveCourseEnrollment(database, userId, assessment.course_id)
  const { unavailableReason } = await loadValidatedBlueprint(database, assessment)
  const history = await mapHistory(
    database,
    await findSubjectAssessmentHistory(database, assessment.id, userId),
  )
  const inProgress = history.find((attempt) => attempt.status === 'in_progress')
  const submitted = history.filter((attempt) => attempt.status === 'submitted')
  const latest = submitted[0]
  const bestScore = submitted.reduce<number | null>(
    (best, attempt) =>
      attempt.scorePercent === null
        ? best
        : best === null
          ? attempt.scorePercent
          : Math.max(best, attempt.scorePercent),
    null,
  )
  const passed = submitted.some((attempt) => attempt.passed === true)

  return {
    assessment: {
      publicId: assessment.public_id,
      title: assessment.title,
      slug: assessment.slug,
      description: assessment.description,
      subjectTitle: assessment.subject_title,
      subjectSlug: assessment.subject_slug,
      questionCount: assessment.question_count,
      passingScore: assessment.passing_score,
      maximumAttempts: assessment.maximum_attempts,
      timeLimitMinutes: assessment.time_limit_minutes,
      blueprintVersion: assessment.current_blueprint_version,
      status: 'published',
    },
    availability: {
      available: unavailableReason === null,
      reason: unavailableReason,
    },
    state:
      inProgress !== undefined
        ? 'in_progress'
        : passed
          ? 'passed'
          : submitted.length > 0
            ? 'needs_improvement'
            : 'not_started',
    inProgressAttemptPublicId: inProgress?.attemptPublicId ?? null,
    latestScore: latest?.scorePercent ?? null,
    bestScore,
    attemptCount: history.length,
    passed,
    history,
  }
}

function lockedSubjectAssessmentSummary(
  assessment: SubjectAssessmentRow,
  reason: string,
): SubjectAssessmentSummary {
  return {
    assessment: {
      publicId: assessment.public_id,
      title: assessment.title,
      slug: assessment.slug,
      description: assessment.description,
      subjectTitle: assessment.subject_title,
      subjectSlug: assessment.subject_slug,
      questionCount: assessment.question_count,
      passingScore: assessment.passing_score,
      maximumAttempts: assessment.maximum_attempts,
      timeLimitMinutes: assessment.time_limit_minutes,
      blueprintVersion: assessment.current_blueprint_version,
      status: 'published',
    },
    availability: { available: false, reason },
    state: 'not_started',
    inProgressAttemptPublicId: null,
    latestScore: null,
    bestScore: null,
    attemptCount: 0,
    passed: false,
    history: [],
  }
}

export async function getCourseDetailSubjectAssessment(
  database: D1Database,
  userId: number | null,
  courseId: number,
): Promise<SubjectAssessmentSummary | null> {
  const assessment = await findPublishedSubjectAssessmentForCourse(database, courseId)
  if (assessment === null) return null

  if (userId === null) {
    return lockedSubjectAssessmentSummary(
      assessment,
      'Sign in with an active enrollment to start this assessment.',
    )
  }

  const enrollment = await findCourseEnrollmentById(database, userId, courseId)
  if (enrollment === null || enrollment.has_active_access !== 1) {
    return lockedSubjectAssessmentSummary(
      assessment,
      'An active course enrollment is required.',
    )
  }

  return getSubjectAssessmentSummary(database, userId, assessment.slug)
}

export async function getDashboardSubjectAssessment(
  database: D1Database,
  userId: number,
  courseId: number,
): Promise<SubjectAssessmentSummary | null> {
  const assessment = await findPublishedSubjectAssessmentForCourse(
    database,
    courseId,
  )
  if (assessment === null) return null
  return getSubjectAssessmentSummary(database, userId, assessment.slug)
}

async function summariesForCourse(database: D1Database, userId: number | null, courseId: number): Promise<SubjectAssessmentSummary[]> {
  const assessments = await findPublishedSubjectAssessmentsForCourse(database, courseId)
  const summaries: SubjectAssessmentSummary[] = []
  for (const assessment of assessments) {
    if (userId === null) summaries.push(lockedSubjectAssessmentSummary(assessment, 'Sign in with an active enrollment to start this assessment.'))
    else {
      const enrollment = await findCourseEnrollmentById(database, userId, courseId)
      summaries.push(enrollment === null || enrollment.has_active_access !== 1 ? lockedSubjectAssessmentSummary(assessment, 'An active course enrollment is required.') : await getSubjectAssessmentSummary(database, userId, assessment.slug))
    }
  }
  return summaries
}

export const getCourseDetailSubjectAssessments = summariesForCourse
export async function getDashboardSubjectAssessments(database: D1Database, userId: number, courseId: number): Promise<SubjectAssessmentSummary[]> { return summariesForCourse(database, userId, courseId) }

export async function startSubjectAssessmentAttempt(
  database: D1Database,
  userId: number,
  assessmentSlug: string,
): Promise<SubjectAssessmentAttemptPayload> {
  const assessment = await findSubjectAssessmentBySlug(database, assessmentSlug)
  if (assessment === null || assessment.status !== 'published') {
    throw new AppError(404, 'SUBJECT_ASSESSMENT_NOT_FOUND', 'The assessment is not available.')
  }
  await assertActiveCourseEnrollment(database, userId, assessment.course_id)
  const { blueprint, blueprintId, unavailableReason } =
    await loadValidatedBlueprint(database, assessment)
  if (unavailableReason !== null) {
    throw new AppError(409, 'ASSESSMENT_PREREQUISITES_MISSING', unavailableReason)
  }

  const active = await findActiveSubjectAssessmentAttempt(
    database,
    assessment.id,
    userId,
  )
  if (active !== null) {
    const [questions, answers] = await Promise.all([
      findSubjectAssessmentQuestionsWithChoices(database, active.id).then(
        groupQuestions,
      ),
      findSubjectAssessmentAnswers(database, active.id),
    ])
    return attemptPayload(active, questions, answers)
  }

  const attemptSeed = createAttemptSeed()
  let generated
  try {
    generated = generateSubjectAssessmentQuestions(blueprint, attemptSeed)
  } catch (error) {
    console.error(JSON.stringify({
      message: 'Subject assessment generation failed',
      assessmentId: assessment.id,
      userId,
      error: error instanceof Error ? error.message : String(error),
    }))
    throw new AppError(
      503,
      'ASSESSMENT_GENERATION_FAILED',
      'The assessment could not be prepared. Please try again.',
    )
  }

  const attempt = await createSubjectAssessmentAttemptWithSnapshots(database, {
    attemptPublicId: `subject-attempt-${crypto.randomUUID()}`,
    assessmentId: assessment.id,
    blueprintId,
    userId,
    attemptSeed,
    attemptNumber:
      (await findMaxSubjectAssessmentAttemptNumber(
        database,
        assessment.id,
        userId,
      )) + 1,
    questions: generated,
  })
  if (attempt === null) throw new Error('Subject assessment attempt could not be loaded.')
  const questions = groupQuestions(
    await findSubjectAssessmentQuestionsWithChoices(database, attempt.id),
  )
  return attemptPayload(attempt, questions, [])
}

export async function getSubjectAssessmentAttempt(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
): Promise<
  SubjectAssessmentAttemptPayload |
  { attempt: SubjectAssessmentAttemptPayload['attempt']; resultAvailable: true }
> {
  const attempt = await getOwnedAttempt(database, userId, attemptPublicId)
  if (attempt.status === 'submitted') {
    return {
      attempt: {
        publicId: attempt.public_id,
        attemptNumber: attempt.attempt_number,
        status: attempt.status,
        startedAt: attempt.started_at,
      },
      resultAvailable: true,
    }
  }
  if (attempt.status !== 'in_progress') {
    throw new AppError(409, 'ASSESSMENT_ATTEMPT_CLOSED', 'This assessment attempt is closed.')
  }
  const [questions, answers] = await Promise.all([
    findSubjectAssessmentQuestionsWithChoices(database, attempt.id).then(
      groupQuestions,
    ),
    findSubjectAssessmentAnswers(database, attempt.id),
  ])
  return attemptPayload(attempt, questions, answers)
}

export async function saveSubjectAssessmentAnswer(
  database: D1Database,
  userId: number,
  input: {
    attemptPublicId: string
    snapshotPublicId: string
    selectedChoicePublicId: string
  },
): Promise<{ saved: true; answeredCount: number; totalCount: number }> {
  const attempt = await getOwnedAttempt(database, userId, input.attemptPublicId)
  if (attempt.status !== 'in_progress') {
    throw new AppError(
      409,
      'ASSESSMENT_ATTEMPT_SUBMITTED',
      'Submitted assessment answers cannot be changed.',
    )
  }
  const snapshot = await findSnapshotInAttempt(
    database,
    attempt.id,
    input.snapshotPublicId,
  )
  if (snapshot === null) {
    throw new AppError(400, 'QUESTION_NOT_IN_ASSESSMENT', 'The question does not belong to this attempt.')
  }
  const choice = await findChoiceInAssessmentSnapshot(
    database,
    snapshot.id,
    input.selectedChoicePublicId,
  )
  if (choice === null) {
    throw new AppError(400, 'CHOICE_NOT_IN_QUESTION', 'The choice does not belong to this question.')
  }
  await saveSubjectAssessmentAnswerRow(database, {
    attemptId: attempt.id,
    snapshotId: snapshot.id,
    choiceId: choice.id,
  })
  const answers = await findSubjectAssessmentAnswers(database, attempt.id)
  return {
    saved: true,
    answeredCount: answers.filter((answer) => answer.selected_choice_id !== null).length,
    totalCount: attempt.total_points,
  }
}

async function buildResult(
  database: D1Database,
  attempt: SubjectAssessmentAttemptRow,
): Promise<SubjectAssessmentResultPayload> {
  if (
    attempt.status !== 'submitted' ||
    attempt.submitted_at === null ||
    attempt.score_percent === null ||
    attempt.passed === null
  ) {
    throw new AppError(409, 'ASSESSMENT_NOT_SUBMITTED', 'Submit the assessment before viewing results.')
  }
  const breakdown = await breakdownForAttempt(database, attempt)
  return {
    assessment: {
      title: attempt.assessment_title,
      slug: attempt.assessment_slug,
      passingScore: attempt.passing_score,
      passingTarget: Math.ceil(
        attempt.total_points * (attempt.passing_score / 100),
      ),
    },
    attempt: {
      publicId: attempt.public_id,
      attemptNumber: attempt.attempt_number,
      status: attempt.status,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
    },
    totalPoints: attempt.total_points,
    earnedPoints: attempt.earned_points,
    scorePercent: attempt.score_percent,
    passed: attempt.passed === 1,
    feedback: feedbackLabel(attempt.score_percent),
    breakdown,
    resultUrl: `/assessment-attempts/${attempt.public_id}/results`,
  }
}

export async function submitSubjectAssessmentAttempt(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
): Promise<SubjectAssessmentResultPayload> {
  let attempt = await getOwnedAttempt(database, userId, attemptPublicId)
  if (attempt.status === 'submitted') return buildResult(database, attempt)
  if (attempt.status !== 'in_progress') {
    throw new AppError(409, 'ASSESSMENT_ATTEMPT_CLOSED', 'This assessment attempt is closed.')
  }
  const [questions, answers] = await Promise.all([
    findSubjectAssessmentQuestionsWithChoices(database, attempt.id).then(
      groupQuestions,
    ),
    findSubjectAssessmentAnswers(database, attempt.id),
  ])
  if (
    attempt.question_count !== attempt.blueprint_total_questions ||
    questions.length !== attempt.question_count
  ) {
    throw new AppError(409, 'ASSESSMENT_SNAPSHOT_INVALID', 'This assessment attempt is incomplete.')
  }
  const questionById = new Map(
    questions.map((question) => [question.id, question]),
  )
  const hasMalformedAnswer = answers.some((answer) => {
    const question = questionById.get(answer.snapshot_id)
    return (
      question === undefined ||
      (
        answer.selected_choice_id !== null &&
        !question.choices.some(
          (choice) => choice.id === answer.selected_choice_id,
        )
      )
    )
  })
  if (hasMalformedAnswer) {
    throw new AppError(409, 'ASSESSMENT_ANSWER_INVALID', 'A saved assessment answer is invalid.')
  }
  const score = scoreAssessment(
    questions.map((question) => ({
      id: question.id,
      points: 1,
      choices: question.choices.map((choice) => ({
        id: choice.id,
        isCorrect: choice.isCorrect,
      })),
    })),
    answers.map((answer) => ({
      question_id: answer.snapshot_id,
      selected_choice_id: answer.selected_choice_id,
    })),
    attempt.passing_score,
  )
  await submitSubjectAssessmentRows(database, {
    attemptId: attempt.id,
    earnedPoints: score.earnedPoints,
    totalPoints: score.totalPoints,
    scorePercent: score.scorePercent,
    passed: score.passed,
    scores: score.questions.map((question) => ({
      snapshotId: question.questionId,
      selectedChoiceId: question.selectedChoiceId,
      isCorrect: question.isCorrect,
    })),
  })
  const submitted = await findSubjectAssessmentAttemptByPublicId(
    database,
    attemptPublicId,
  )
  if (submitted === null) throw new Error('Submitted assessment could not be loaded.')
  attempt = submitted
  return buildResult(database, attempt)
}

export async function getSubjectAssessmentResult(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
): Promise<SubjectAssessmentResultPayload> {
  return buildResult(
    database,
    await getOwnedAttempt(database, userId, attemptPublicId),
  )
}

function explanationText(explanation: GeneratedExplanation): string {
  return `${explanation.title}: ${explanation.steps.join(' ')} Final answer: ${explanation.finalAnswer}`
}

export async function getSubjectAssessmentReview(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
): Promise<SubjectAssessmentReviewPayload> {
  const attempt = await getOwnedAttempt(database, userId, attemptPublicId)
  const result = await buildResult(database, attempt)
  const [questions, answers] = await Promise.all([
    findSubjectAssessmentQuestionsWithChoices(database, attempt.id).then(
      groupQuestions,
    ),
    findSubjectAssessmentAnswers(database, attempt.id),
  ])
  const answerMap = new Map(answers.map((answer) => [answer.snapshot_id, answer]))
  return {
    ...result,
    questions: questions.map((question) => {
      const answer = answerMap.get(question.id)
      const selected = question.choices.find(
        (choice) => choice.id === answer?.selected_choice_id,
      )
      const correct = question.choices.find((choice) => choice.isCorrect)
      if (correct === undefined) throw new Error('Snapshot has no correct choice.')
      return {
        publicId: question.publicId,
        position: question.position,
        topic: { slug: question.topicSlug, title: question.topicTitle },
        prompt: question.prompt,
        difficulty: question.difficulty,
        selectedChoice:
          selected === undefined
            ? null
            : {
                publicId: selected.publicId,
                text: answer?.selected_choice_text_snapshot ?? selected.text,
                position: selected.position,
              },
        correctChoice: {
          publicId: correct.publicId,
          text: answer?.correct_choice_text_snapshot ?? correct.text,
          position: correct.position,
        },
        isCorrect: answer?.is_correct === 1,
        unanswered: answer?.selected_choice_id == null,
        explanation:
          attempt.show_explanations === 1
            ? explanationText(question.explanation)
            : null,
        choices: question.choices.map((choice) => ({
          publicId: choice.publicId,
          text: choice.text,
          position: choice.position,
        })),
      }
    }),
  }
}

export async function getAdminSubjectAssessment(
  database: D1Database,
  assessmentSlug = numericalAbilityAssessmentSlug,
) {
  const assessment = await findSubjectAssessmentBySlug(database, assessmentSlug)
  if (assessment === null) return { assessment: null }
  const rows = await findAssessmentBlueprintRows(
    database,
    assessment.id,
    assessment.current_blueprint_version,
  )
  const blueprint = blueprintFromRows(
    rows,
    assessment.subject_slug as SubjectAssessmentBlueprint['subjectSlug'],
  )
  return {
    assessment: {
      id: assessment.id,
      publicId: assessment.public_id,
      title: assessment.title,
      slug: assessment.slug,
      description: assessment.description,
      subject: { id: assessment.subject_id, title: assessment.subject_title, slug: assessment.subject_slug },
      status: assessment.status,
      position: assessment.position,
      passingScore: assessment.passing_score,
      questionCount: assessment.question_count,
      maximumAttempts: assessment.maximum_attempts,
      timeLimitMinutes: assessment.time_limit_minutes,
      showExplanations: assessment.show_explanations === 1,
      blueprint,
      attemptCount: await countSubjectAssessmentAttempts(database, assessment.id),
      createdAt: assessment.created_at,
      updatedAt: assessment.updated_at,
    },
  }
}

async function validateAdminAssessment(
  database: D1Database,
  assessment: SubjectAssessmentRow,
): Promise<void> {
  const expected = assessment.subject_slug === 'numerical-ability'
    ? { slug: numericalAbilityAssessmentSlug, questions: 50, topics: 10 }
    : assessment.subject_slug === 'analytical-ability'
      ? { slug: analyticalAbilityAssessmentSlug, questions: 45, topics: 9 }
      : assessment.subject_slug === 'verbal-ability'
        ? { slug: verbalAbilityAssessmentSlug, questions: 50, topics: 10 }
        : null
  if (
    expected === null ||
    assessment.slug !== expected.slug ||
    assessment.question_count !== expected.questions ||
    assessment.passing_score !== 70 ||
    assessment.maximum_attempts !== null ||
    assessment.time_limit_minutes !== null ||
    assessment.show_explanations !== 1
  ) {
    throw new AppError(400, 'ASSESSMENT_CONFIGURATION_INVALID', 'Assessment configuration does not match version 1 requirements.')
  }
  const { blueprint, unavailableReason } = await loadValidatedBlueprint(
    database,
    assessment,
  )
  const validation = validateSubjectAssessmentBlueprint(blueprint)
  if (!validation.valid || unavailableReason !== null) {
    throw new AppError(
      400,
      'ASSESSMENT_CONFIGURATION_INVALID',
      unavailableReason ?? validation.errors.join(' '),
    )
  }
}

export async function saveAdminSubjectAssessment(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  input: AdminSubjectAssessmentInput,
) {
  const existing = await findSubjectAssessmentBySlug(database, input.slug)
  if (
    existing !== null &&
    input.updatedAt !== undefined &&
    input.updatedAt !== existing.updated_at
  ) {
    throw new AppError(409, 'CONTENT_MODIFIED', 'This assessment was modified. Refresh before saving.')
  }
  const subject = await findSubjectForAssessmentAdmin(
    database,
    'cse-professional',
    input.blueprint.subjectSlug,
  )
  const blueprint = toDomainBlueprint(input.blueprint)
  const validation = validateSubjectAssessmentBlueprint(blueprint)
  if (!validation.valid) {
    throw new AppError(400, 'ASSESSMENT_BLUEPRINT_INVALID', validation.errors.join(' '))
  }
  const topics = await findPublishedTopicsForSubject(database, subject.subject_id)
  const topicIds = new Map(topics.map((topic) => [topic.slug, topic.id]))
  let assessment = await upsertSubjectAssessment(database, {
    publicId: existing?.public_id ?? `subject-assessment-${crypto.randomUUID()}`,
    subjectId: subject.subject_id,
    title: input.title,
    slug: input.slug,
    description: input.description,
    position: input.position,
    passingScore: input.passingScore,
    questionCount: input.questionCount,
    maximumAttempts: input.maximumAttempts,
    timeLimitMinutes: input.timeLimitMinutes,
    showExplanations: input.showExplanations,
    blueprintVersion: blueprint.version,
    status: 'draft',
  })
  if (assessment === null) throw new Error('Assessment could not be loaded.')
  await replaceSubjectAssessmentBlueprint(database, assessment.id, blueprint, topicIds)
  await validateAdminAssessment(database, assessment)
  if (input.status === 'published') {
    assessment = await upsertSubjectAssessment(database, {
      publicId: assessment.public_id,
      subjectId: subject.subject_id,
      title: input.title,
      slug: input.slug,
      description: input.description,
      position: input.position,
      passingScore: input.passingScore,
      questionCount: input.questionCount,
      maximumAttempts: input.maximumAttempts,
      timeLimitMinutes: input.timeLimitMinutes,
      showExplanations: input.showExplanations,
      blueprintVersion: blueprint.version,
      status: 'published',
    })
    if (assessment === null) throw new Error('Assessment could not be published.')
  }
  await recordAdminAuditLog(database, actor, {
    action:
      existing === null
        ? 'create'
        : existing.status !== assessment.status
          ? assessment.status === 'published'
            ? 'publish'
            : 'unpublish'
          : 'update',
    entityType: 'subject_assessment',
    entityId: assessment.id,
    metadata: {
      subjectId: subject.subject_id,
      blueprintVersion: blueprint.version,
      questionCount: blueprint.totalQuestions,
    },
  })
  return getAdminSubjectAssessment(database, assessment.slug)
}

export async function validateAdminSubjectAssessment(
  database: D1Database,
  assessmentSlug: string,
): Promise<{ valid: true; questionCount: number; topicCount: number }> {
  const assessment = await findSubjectAssessmentBySlug(database, assessmentSlug)
  if (assessment === null) {
    throw new AppError(404, 'SUBJECT_ASSESSMENT_NOT_FOUND', 'The assessment was not found.')
  }
  await validateAdminAssessment(database, assessment)
  const rows = await findAssessmentBlueprintRows(database, assessment.id, assessment.current_blueprint_version)
  return { valid: true, questionCount: assessment.question_count, topicCount: new Set(rows.map((row) => row.topic_slug)).size }
}

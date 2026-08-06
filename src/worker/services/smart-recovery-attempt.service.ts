import {
  allocateRecoveryQuestions,
  filterGeneratableWeaknesses,
  generateRecoveryQuestions,
  type RecentRecoveryIdentity,
} from '../domain/smart-recovery-attempt'
import { scoreAssessment } from '../domain/assessment-scoring'
import { buildRecoveryAttemptProgress } from '../domain/smart-recovery-history'
import {
  SMART_RECOVERY_EVIDENCE_WINDOW,
  SMART_RECOVERY_FORMULA_VERSION,
  calculateSkillWeakness,
  type SkillWeaknessSummary,
  type SkillCatalogEntry,
} from '../domain/smart-recovery-weakness'
import { SMART_RECOVERY_TAXONOMY_VERSION } from '../domain/smart-recovery-skills'
import type {
  GeneratedExplanation,
  GeneratorDifficulty,
} from '../generators/generator.types'
import { createAttemptSeed } from '../generators/generator-random'
import { findPublishedCourseEnrollment } from '../repositories/course.repository'
import {
  createRecoveryAttemptWithSnapshots,
  findActiveRecoveryAttempt,
  findLatestSubmittedRecoveryAttempt,
  findRecentGeneratedIdentities,
  findRecoveryAnswers,
  findRecoveryAttemptByIdempotencyKey,
  findRecoveryAttemptByPublicId,
  findRecoveryChoiceInSnapshot,
  findRecoveryQuestionsWithChoices,
  findRecoverySnapshotInAttempt,
  saveRecoveryAnswerRow,
  submitRecoveryAttemptRows,
  type RecoveryAnswerRow,
  type RecoveryAttemptRow,
  type RecoveryQuestionChoiceRow,
} from '../repositories/smart-recovery-attempt.repository'
import { AppError } from '../utils/app-error'
import { orderAttemptChoices } from '../utils/attempt-choice-order'
import {
  loadSmartRecoveryEvidenceContext,
} from './smart-recovery.service'

const CSE_PROFESSIONAL_SLUG = 'cse-professional'

interface InternalRecoveryChoice {
  id: number
  publicId: string
  text: string
  position: number
  isCorrect: boolean
  distractorType: string | null
}

interface InternalRecoveryQuestion {
  id: number
  publicId: string
  position: number
  skillId: number
  skillSlug: string
  skillTitle: string
  subjectSlug: string
  subjectTitle: string
  topicSlug: string | null
  topicTitle: string | null
  relatedLessonSlug: string | null
  relatedLessonTitle: string | null
  relatedLessonPublicId: string | null
  difficulty: GeneratorDifficulty
  prompt: string
  explanation: GeneratedExplanation
  metadata: Record<string, unknown>
  choices: InternalRecoveryChoice[]
}

export interface RecoveryAttemptPayload {
  attempt: {
    publicId: string
    status: 'in_progress'
    questionCount: number
    answeredCount: number
    startedAt: string
  }
  questions: Array<{
    publicId: string
    position: number
    prompt: string
    difficulty: GeneratorDifficulty
    selectedChoicePublicId: string | null
    skill: { slug: string; title: string }
    subject: { slug: string; title: string }
    topic: { slug: string; title: string } | null
    choices: Array<{ publicId: string; text: string; position: number }>
  }>
  answeredCount: number
  totalCount: number
}

export interface RecoveryResultPayload {
  formulaVersion: number
  attempt: {
    publicId: string
    status: 'submitted'
    formulaVersion: number
    startedAt: string
    submittedAt: string
  }
  interpretation: {
    code:
      | 'improved'
      | 'strong_recovery_result'
      | 'still_needs_practice'
      | 'more_evidence_needed'
    title: string
    message: string
  }
  scorePercent: number
  correctCount: number
  questionCount: number
  skillsTrained: number
  strongestRecoverySkill: string | null
  stillNeedsPractice: string[]
  skillBreakdown: Array<{
    skill: { slug: string; title: string }
    questions: number
    correct: number
    accuracyPercent: number
    statusBefore: 'not_enough_data' | 'needs_more_practice' | 'improving' | 'strong'
    weightedAccuracyBefore: number | null
    evidenceCountBefore: number
    statusAfter: 'not_enough_data' | 'needs_more_practice' | 'improving' | 'strong'
    weightedAccuracyAfter: number | null
    evidenceCountAfter: number
    percentagePointChange: number | null
    trend: 'improved' | 'stable' | 'declined' | 'insufficient_data'
    currentStatus: 'not_enough_data' | 'needs_more_practice' | 'improving' | 'strong'
    relatedLesson: {
      publicId: string
      slug: string
      title: string
      courseSlug: string
    } | null
  }>
  questions: Array<{
    publicId: string
    position: number
    prompt: string
    skillTitle: string
    selectedChoice: { publicId: string; text: string } | null
    correctChoice: { publicId: string; text: string }
    isCorrect: boolean
    explanation: string
    mistakePattern: string | null
    choices: Array<{ publicId: string; text: string; position: number }>
  }>
}

function groupQuestions(
  rows: readonly RecoveryQuestionChoiceRow[],
): InternalRecoveryQuestion[] {
  const questions = new Map<number, InternalRecoveryQuestion>()
  for (const row of rows) {
    const existing = questions.get(row.snapshot_id)
    const question =
      existing ??
      {
        id: row.snapshot_id,
        publicId: row.snapshot_public_id,
        position: row.source_position,
        skillId: row.skill_id,
        skillSlug: row.skill_slug,
        skillTitle: row.skill_title,
        subjectSlug: row.subject_slug,
        subjectTitle: row.subject_title,
        topicSlug: row.topic_slug,
        topicTitle: row.topic_title,
        relatedLessonSlug: row.related_lesson_slug,
        relatedLessonTitle: row.related_lesson_title,
        relatedLessonPublicId: row.related_lesson_public_id,
        difficulty: row.difficulty,
        prompt: row.prompt,
        explanation: JSON.parse(row.explanation_json) as GeneratedExplanation,
        metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
        choices: [],
      }
    question.choices.push({
      id: row.choice_id,
      publicId: row.choice_public_id,
      text: row.choice_text,
      position: row.choice_position,
      isCorrect: row.is_correct === 1,
      distractorType: row.distractor_type,
    })
    if (existing === undefined) questions.set(row.snapshot_id, question)
  }
  return [...questions.values()].sort(
    (left, right) => left.position - right.position,
  )
}

function assertOwner(attempt: RecoveryAttemptRow, userId: number): void {
  if (attempt.user_id !== userId) {
    throw new AppError(
      403,
      'RECOVERY_ATTEMPT_FORBIDDEN',
      'This recovery attempt belongs to another learner.',
    )
  }
}

async function assertActiveEnrollment(
  database: D1Database,
  userId: number,
  expectedCourseId?: number,
) {
  const enrollment = await findPublishedCourseEnrollment(
    database,
    userId,
    CSE_PROFESSIONAL_SLUG,
  )
  if (
    enrollment === null ||
    enrollment.has_active_access !== 1 ||
    (expectedCourseId !== undefined &&
      enrollment.course_id !== expectedCourseId)
  ) {
    throw new AppError(
      403,
      'SMART_RECOVERY_ENROLLMENT_REQUIRED',
      'An active CSE Professional enrollment is required.',
    )
  }
  return enrollment
}

async function getOwnedAttempt(
  database: D1Database,
  userId: number,
  publicId: string,
): Promise<RecoveryAttemptRow> {
  const attempt = await findRecoveryAttemptByPublicId(database, publicId)
  if (attempt === null) {
    throw new AppError(
      404,
      'RECOVERY_ATTEMPT_NOT_FOUND',
      'The recovery attempt was not found.',
    )
  }
  assertOwner(attempt, userId)
  await assertActiveEnrollment(database, userId, attempt.course_id)
  return attempt
}

function mapAttemptPayload(
  attempt: RecoveryAttemptRow,
  questions: readonly InternalRecoveryQuestion[],
  answers: readonly RecoveryAnswerRow[],
): RecoveryAttemptPayload {
  if (attempt.status !== 'in_progress') {
    throw new Error('Only an in-progress recovery attempt can be mapped.')
  }
  const answerBySnapshot = new Map(
    answers.map((answer) => [answer.snapshot_id, answer]),
  )
  return {
    attempt: {
      publicId: attempt.public_id,
      status: attempt.status,
      questionCount: attempt.question_count,
      answeredCount: answers.filter(
        (answer) => answer.selected_choice_id !== null,
      ).length,
      startedAt: attempt.started_at,
    },
    questions: questions.map((question) => {
      const selectedChoiceId =
        answerBySnapshot.get(question.id)?.selected_choice_id ?? null
      const choices = orderAttemptChoices(
        question.choices,
        attempt.public_id,
        question.id,
      )
      return {
        publicId: question.publicId,
        position: question.position,
        prompt: question.prompt,
        difficulty: question.difficulty,
        selectedChoicePublicId:
          choices.find((choice) => choice.id === selectedChoiceId)?.publicId ??
          null,
        skill: { slug: question.skillSlug, title: question.skillTitle },
        subject: {
          slug: question.subjectSlug,
          title: question.subjectTitle,
        },
        topic:
          question.topicSlug === null || question.topicTitle === null
            ? null
            : { slug: question.topicSlug, title: question.topicTitle },
        choices: choices.map(({ publicId, text, position }) => ({
          publicId,
          text,
          position,
        })),
      }
    }),
    answeredCount: answers.filter(
      (answer) => answer.selected_choice_id !== null,
    ).length,
    totalCount: questions.length,
  }
}

function recentIdentities(
  rows: Awaited<ReturnType<typeof findRecentGeneratedIdentities>>,
): RecentRecoveryIdentity[] {
  return rows.map((row) => {
    let canonicalSignature: string | null
    try {
      const metadata = JSON.parse(row.metadata_json) as {
        canonicalSignature?: unknown
      }
      canonicalSignature =
        typeof metadata.canonicalSignature === 'string'
          ? metadata.canonicalSignature
          : null
    } catch {
      canonicalSignature = null
    }
    return {
      generatorSlug: row.generator_slug,
      generatorVersion: row.generator_version,
      generatorSeed: row.generator_seed,
      canonicalSignature,
      normalizedPrompt: row.prompt.trim().toLowerCase(),
    }
  })
}

async function planningSummaries(
  database: D1Database,
  userId: number,
  now: Date,
): Promise<SkillWeaknessSummary[]> {
  const context = await loadSmartRecoveryEvidenceContext(database, userId, now)
  return context.skills
    .map((skill) => calculateSkillWeakness(skill, context.evidence, now))
    .filter((summary) => summary.status === 'needs_more_practice')
}

async function loadAttemptPayload(
  database: D1Database,
  attempt: RecoveryAttemptRow,
): Promise<RecoveryAttemptPayload> {
  const [questions, answers] = await Promise.all([
    findRecoveryQuestionsWithChoices(database, attempt.id).then(groupQuestions),
    findRecoveryAnswers(database, attempt.id),
  ])
  if (questions.length !== attempt.question_count) {
    throw new AppError(
      409,
      'RECOVERY_SNAPSHOT_INVALID',
      'This recovery attempt is incomplete.',
    )
  }
  return mapAttemptPayload(attempt, questions, answers)
}

export async function createRecoveryAttempt(
  database: D1Database,
  userId: number,
  idempotencyKey: string,
  now = new Date(),
): Promise<
  | RecoveryAttemptPayload
  | { attempt: { publicId: string; status: 'submitted' }; resultAvailable: true }
> {
  const enrollment = await assertActiveEnrollment(database, userId)
  const keyed = await findRecoveryAttemptByIdempotencyKey(
    database,
    userId,
    idempotencyKey,
  )
  if (keyed !== null) {
    return keyed.status === 'submitted'
      ? {
          attempt: { publicId: keyed.public_id, status: keyed.status },
          resultAvailable: true,
        }
      : loadAttemptPayload(database, keyed)
  }
  const active = await findActiveRecoveryAttempt(
    database,
    userId,
    enrollment.course_id,
  )
  if (active !== null) return loadAttemptPayload(database, active)

  const eligible = filterGeneratableWeaknesses(
    await planningSummaries(database, userId, now),
  )
  const allocations = allocateRecoveryQuestions(eligible)
  if (allocations.length === 0) {
    throw new AppError(
      409,
      eligible.length === 0
        ? 'RECOVERY_NOT_AVAILABLE'
        : 'RECOVERY_CONFIGURATION_UNAVAILABLE',
      'A recovery set is not available from your current skill evidence.',
    )
  }

  const attemptSeed = createAttemptSeed()
  let questions
  try {
    questions = generateRecoveryQuestions({
      attemptSeed,
      allocations,
      recentIdentities: recentIdentities(
        await findRecentGeneratedIdentities(database, userId),
      ),
    })
  } catch (error) {
    console.error(
      JSON.stringify({
        message: 'Recovery question generation failed',
        errorName: error instanceof Error ? error.name : 'UnknownError',
      }),
    )
    throw new AppError(
      503,
      'RECOVERY_GENERATION_FAILED',
      'The recovery set could not be prepared. Please try again.',
    )
  }

  const attemptPublicId = `recovery-attempt-${crypto.randomUUID()}`
  try {
    const created = await createRecoveryAttemptWithSnapshots(database, {
      attemptPublicId,
      userId,
      courseId: enrollment.course_id,
      attemptSeed,
      idempotencyKey,
      taxonomyVersion: SMART_RECOVERY_TAXONOMY_VERSION,
      formulaVersion: SMART_RECOVERY_FORMULA_VERSION,
      questions,
    })
    if (created === null) {
      throw new Error('Recovery attempt could not be loaded after creation.')
    }
    return loadAttemptPayload(database, created)
  } catch (error) {
    const collision = await findActiveRecoveryAttempt(
      database,
      userId,
      enrollment.course_id,
    )
    if (collision !== null) return loadAttemptPayload(database, collision)
    throw error
  }
}

export async function getRecoveryAttempt(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
): Promise<
  | RecoveryAttemptPayload
  | { attempt: { publicId: string; status: 'submitted' }; resultAvailable: true }
> {
  const attempt = await getOwnedAttempt(database, userId, attemptPublicId)
  return attempt.status === 'submitted'
    ? {
        attempt: { publicId: attempt.public_id, status: attempt.status },
        resultAvailable: true,
      }
    : loadAttemptPayload(database, attempt)
}

export async function saveRecoveryAnswer(
  database: D1Database,
  userId: number,
  input: {
    attemptPublicId: string
    snapshotPublicId: string
    selectedChoicePublicId: string
  },
): Promise<{
  saved: true
  selectedChoicePublicId: string
  answeredCount: number
  totalCount: number
  savedAt: string
}> {
  const attempt = await getOwnedAttempt(
    database,
    userId,
    input.attemptPublicId,
  )
  if (attempt.status !== 'in_progress') {
    throw new AppError(
      409,
      'RECOVERY_ATTEMPT_SUBMITTED',
      'Submitted recovery answers cannot be changed.',
    )
  }
  const snapshot = await findRecoverySnapshotInAttempt(
    database,
    attempt.id,
    input.snapshotPublicId,
  )
  if (snapshot === null) {
    throw new AppError(
      400,
      'QUESTION_NOT_IN_RECOVERY',
      'The question does not belong to this recovery attempt.',
    )
  }
  const choice = await findRecoveryChoiceInSnapshot(
    database,
    snapshot.id,
    input.selectedChoicePublicId,
  )
  if (choice === null) {
    throw new AppError(
      400,
      'CHOICE_NOT_IN_QUESTION',
      'The choice does not belong to this question.',
    )
  }
  const saved = await saveRecoveryAnswerRow(database, {
    attemptId: attempt.id,
    snapshotId: snapshot.id,
    choiceId: choice.id,
  })
  const answers = await findRecoveryAnswers(database, attempt.id)
  return {
    saved: true,
    selectedChoicePublicId: choice.public_id,
    answeredCount: answers.filter((answer) => answer.selected_choice_id !== null)
      .length,
    totalCount: attempt.question_count,
    savedAt: saved.answeredAt,
  }
}

function explanationText(explanation: GeneratedExplanation): string {
  return `${explanation.title}: ${explanation.steps.join(' ')} Final answer: ${explanation.finalAnswer}`
}


async function buildRecoveryResult(
  database: D1Database,
  userId: number,
  attempt: RecoveryAttemptRow,
  now = new Date(),
): Promise<RecoveryResultPayload> {
  if (
    attempt.status !== 'submitted' ||
    attempt.submitted_at === null ||
    attempt.score_percent === null
  ) {
    throw new AppError(
      409,
      'RECOVERY_NOT_SUBMITTED',
      'Submit the recovery set before viewing results.',
    )
  }
  const [questions, answers, evidenceContext] = await Promise.all([
    findRecoveryQuestionsWithChoices(database, attempt.id).then(groupQuestions),
    findRecoveryAnswers(database, attempt.id),
    loadSmartRecoveryEvidenceContext(
      database,
      userId,
      now,
      new Date(
        Date.parse(attempt.submitted_at) -
          SMART_RECOVERY_EVIDENCE_WINDOW.lookbackDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
    ),
  ])
  const answerBySnapshot = new Map(
    answers.map((answer) => [answer.snapshot_id, answer]),
  )
  const currentBySkill = new Map(
    evidenceContext.skills.map((skill) => [
      skill.slug,
      calculateSkillWeakness(skill, evidenceContext.evidence, now).status,
    ]),
  )
  const grouped = new Map<
    string,
    {
      question: InternalRecoveryQuestion
      questions: number
      correct: number
    }
  >()
  for (const question of questions) {
    const item = grouped.get(question.skillSlug) ?? {
      question,
      questions: 0,
      correct: 0,
    }
    item.questions += 1
    if (answerBySnapshot.get(question.id)?.is_correct === 1) item.correct += 1
    grouped.set(question.skillSlug, item)
  }
  const progressSummary = buildRecoveryAttemptProgress(
    {
      attemptPublicId: attempt.public_id,
      attemptFormulaVersion: attempt.weakness_formula_version,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
      scorePercent: attempt.score_percent,
      correctCount: attempt.correct_count,
      questionCount: attempt.question_count,
      skills: [...grouped.values()].map((item) => {
        const skill: SkillCatalogEntry = {
          slug: item.question.skillSlug,
          title: item.question.skillTitle,
          description: null,
          taxonomyVersion: attempt.taxonomy_version,
          subjectSlug: item.question.subjectSlug,
          subjectTitle: item.question.subjectTitle,
          topicSlug: item.question.topicSlug,
          topicTitle: item.question.topicTitle,
          relatedLessonSlug: item.question.relatedLessonSlug,
          relatedLessonTitle: item.question.relatedLessonTitle,
        }
        return {
          skill,
          questions: item.questions,
          correct: item.correct,
        }
      }),
    },
    evidenceContext.evidence,
  )
  const progressBySkill = new Map(
    progressSummary.skillProgress.map((item) => [item.skill.slug, item.progress]),
  )
  const skillBreakdown = [...grouped.values()].map((item) => {
    const progress = progressBySkill.get(item.question.skillSlug)
    if (progress === undefined) {
      throw new Error('Recovery skill progress could not be calculated.')
    }
    return {
      skill: {
        slug: item.question.skillSlug,
        title: item.question.skillTitle,
      },
      questions: item.questions,
      correct: item.correct,
      accuracyPercent: Math.round((item.correct / item.questions) * 1000) / 10,
      ...progress,
      currentStatus:
        currentBySkill.get(item.question.skillSlug) ?? 'not_enough_data',
      relatedLesson:
        item.question.relatedLessonPublicId === null ||
        item.question.relatedLessonSlug === null ||
        item.question.relatedLessonTitle === null
          ? null
          : {
              publicId: item.question.relatedLessonPublicId,
              slug: item.question.relatedLessonSlug,
              title: item.question.relatedLessonTitle,
              courseSlug: CSE_PROFESSIONAL_SLUG,
            },
    }
  })
  const strongest = [...skillBreakdown].sort(
    (left, right) =>
      right.accuracyPercent - left.accuracyPercent ||
      left.skill.slug.localeCompare(right.skill.slug),
  )[0]

  return {
    formulaVersion: attempt.weakness_formula_version,
    attempt: {
      publicId: attempt.public_id,
      status: attempt.status,
      formulaVersion: attempt.weakness_formula_version,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
    },
    interpretation: progressSummary.interpretation,
    scorePercent: attempt.score_percent,
    correctCount: attempt.correct_count,
    questionCount: attempt.question_count,
    skillsTrained: skillBreakdown.length,
    strongestRecoverySkill: strongest?.skill.title ?? null,
    stillNeedsPractice: skillBreakdown
      .filter((item) => item.statusAfter === 'needs_more_practice')
      .map((item) => item.skill.title),
    skillBreakdown,
    questions: questions.map((question) => {
      const answer = answerBySnapshot.get(question.id)
      const selected = question.choices.find(
        (choice) => choice.id === answer?.selected_choice_id,
      )
      const correct = question.choices.find((choice) => choice.isCorrect)
      if (correct === undefined) {
        throw new Error('Recovery snapshot has no correct choice.')
      }
      const ordered = orderAttemptChoices(
        question.choices,
        attempt.public_id,
        question.id,
      )
      return {
        publicId: question.publicId,
        position: question.position,
        prompt: question.prompt,
        skillTitle: question.skillTitle,
        selectedChoice:
          selected === undefined
            ? null
            : {
                publicId: selected.publicId,
                text: answer?.selected_choice_text_snapshot ?? selected.text,
              },
        correctChoice: {
          publicId: correct.publicId,
          text: answer?.correct_choice_text_snapshot ?? correct.text,
        },
        isCorrect: answer?.is_correct === 1,
        explanation: explanationText(question.explanation),
        mistakePattern:
          answer?.is_correct === 0 ? selected?.distractorType ?? null : null,
        choices: ordered.map(({ publicId, text, position }) => ({
          publicId,
          text,
          position,
        })),
      }
    }),
  }
}

export async function submitRecoveryAttempt(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
  now = new Date(),
): Promise<RecoveryResultPayload> {
  let attempt = await getOwnedAttempt(database, userId, attemptPublicId)
  if (attempt.status === 'submitted') {
    return buildRecoveryResult(database, userId, attempt, now)
  }
  const [questions, answers] = await Promise.all([
    findRecoveryQuestionsWithChoices(database, attempt.id).then(groupQuestions),
    findRecoveryAnswers(database, attempt.id),
  ])
  if (questions.length !== attempt.question_count) {
    throw new AppError(
      409,
      'RECOVERY_SNAPSHOT_INVALID',
      'This recovery attempt is incomplete.',
    )
  }
  const answerBySnapshot = new Map(
    answers.map((answer) => [answer.snapshot_id, answer]),
  )
  const malformed = questions.some(
    (question) =>
      question.choices.filter((choice) => choice.isCorrect).length !== 1 ||
      (answerBySnapshot.get(question.id)?.selected_choice_id !== null &&
        answerBySnapshot.get(question.id)?.selected_choice_id !== undefined &&
        !question.choices.some(
          (choice) =>
            choice.id === answerBySnapshot.get(question.id)?.selected_choice_id,
        )),
  )
  if (malformed) {
    throw new AppError(
      409,
      'RECOVERY_SNAPSHOT_INVALID',
      'This recovery attempt contains invalid snapshot data.',
    )
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
    0,
  )
  await submitRecoveryAttemptRows(database, {
    attemptId: attempt.id,
    correctCount: score.earnedPoints,
    questionCount: score.totalPoints,
    scorePercent: score.scorePercent,
    submittedAt: now.toISOString(),
    scores: score.questions.map((question) => ({
      snapshotId: question.questionId,
      selectedChoiceId: question.selectedChoiceId,
      isCorrect: question.isCorrect,
    })),
  })
  const submitted = await findRecoveryAttemptByPublicId(
    database,
    attemptPublicId,
  )
  if (submitted === null) {
    throw new Error('Submitted recovery attempt could not be loaded.')
  }
  attempt = submitted
  return buildRecoveryResult(database, userId, attempt, now)
}

export async function getRecoveryAttemptResult(
  database: D1Database,
  userId: number,
  attemptPublicId: string,
  now = new Date(),
): Promise<RecoveryResultPayload> {
  return buildRecoveryResult(
    database,
    userId,
    await getOwnedAttempt(database, userId, attemptPublicId),
    now,
  )
}

export async function getRecoveryHistorySummary(
  database: D1Database,
  userId: number,
  courseId: number,
) {
  const [active, latest] = await Promise.all([
    findActiveRecoveryAttempt(database, userId, courseId),
    findLatestSubmittedRecoveryAttempt(database, userId, courseId),
  ])
  return {
    activeAttemptPublicId: active?.public_id ?? null,
    latestResult:
      latest === null ||
      latest.submitted_at === null ||
      latest.score_percent === null
        ? null
        : {
            attemptPublicId: latest.public_id,
            scorePercent: latest.score_percent,
            correctCount: latest.correct_count,
            questionCount: latest.question_count,
            submittedAt: latest.submitted_at,
          },
  }
}

import { ZodError } from 'zod'

import {
  getGenerator,
  getRegisteredGenerators,
} from '../../generators/generator.registry'
import type { GeneratorSlug } from '../../generators/generator.types'
import {
  createCourseRow,
  createLessonBlockWithAudit,
  createLessonRow,
  createSubjectRow,
  createTopicRow,
  deleteLessonBlockRow,
  deletePracticeGeneratorConfig,
  findAdjacentRow,
  findAdminQuizById,
  findCourseById,
  findCourseBySlug,
  findLessonBlockAtPosition,
  findLessonBlockById,
  findLessonById,
  findPracticeQuestionById,
  findPracticeSetById,
  findPracticeSetByLessonId,
  findQuizByLessonId,
  findQuizQuestionById,
  findSubjectById,
  findTopicById,
  getAdminDashboardCounts,
  getMaxPosition,
  listCourses,
  listLessonBlocksForLesson,
  listLessonsForTopic,
  listPracticeChoices,
  listPracticeQuestions,
  listQuizChoices,
  listQuizQuestions,
  listSubjectsForCourse,
  listTopicsForSubject,
  repairPercentageGuidedTeachingWithAudit,
  reconcileTeachingSystemLessonBlocksWithAudit,
  shiftPositionsForInsert,
  swapAdjacentPositions,
  updateCourseRow,
  updateLessonBlockWithAudit,
  updateLessonRow,
  updateSubjectRow,
  updateTopicRow,
  upsertPracticeGeneratorConfig,
  upsertPracticeQuestionWithChoices,
  upsertPracticeSetRow,
  upsertQuizQuestionWithChoices,
  upsertQuizRow,
} from '../../repositories/admin/admin-content.repository'
import {
  parseLessonBlock,
  validateLessonBlockContent,
} from '../../schemas/lesson-block.schemas'
import type {
  CourseCreateInput,
  CourseUpdateInput,
  LessonCreateInput,
  LessonUpdateInput,
  SubjectCreateInput,
  SubjectUpdateInput,
  TopicCreateInput,
  TopicUpdateInput,
} from '../../schemas/admin/course-admin.schemas'
import type {
  AgeProblemsTeachingSystemReconcileInput,
  AverageTeachingSystemReconcileInput,
  DecimalsTeachingSystemReconcileInput,
  FixedQuestionInput,
  FractionsTeachingSystemReconcileInput,
  LessonBlockCreateInput,
  LessonBlockUpdateInput,
  NumberProblemsTeachingSystemReconcileInput,
  PercentageTeachingSystemReconcileInput,
  PracticeSetInput,
  QuizInput,
  QuizQuestionInput,
  RatioProportionTeachingSystemReconcileInput,
  WorkRateTeachingSystemReconcileInput,
  DistanceSpeedTimeTeachingSystemReconcileInput,
  SimpleInterestTeachingSystemReconcileInput,
  VocabularyWordMeaningTeachingSystemReconcileInput,
  SynonymsAntonymsTeachingSystemReconcileInput,
  ContextCluesTeachingSystemReconcileInput,
  SentenceCompletionTeachingSystemReconcileInput,
  GrammarCorrectUsageTeachingSystemReconcileInput,
  SubjectVerbAgreementTeachingSystemReconcileInput,
  PronounsModifiersTeachingSystemReconcileInput,
  SentenceStructureErrorsTeachingSystemReconcileInput,
} from '../../schemas/admin/content-admin.schemas'
import type {
  AdminCourseRow,
  AdminEntityStatus,
  AdminLessonBlockRow,
  AdminLessonRow,
  AdminPracticeChoiceRow,
  AdminPracticeQuestionRow,
  AdminPracticeSetRow,
  AdminQuizChoiceRow,
  AdminQuizQuestionRow,
  AdminQuizRow,
  AdminSubjectRow,
  AdminTopicRow,
} from '../../types/admin/content'
import type { AuthenticatedPrincipal } from '../../types/auth'
import { AppError } from '../../utils/app-error'
import { recordAdminAuditLog, type AdminAuditLog } from './audit-log.service'

type OrderedTable =
  | 'subjects'
  | 'topics'
  | 'lessons'
  | 'lesson_blocks'
  | 'practice_questions'
  | 'practice_question_choices'
  | 'questions'
  | 'question_choices'

interface OrderedEntityConfig {
  table: OrderedTable
  parentColumn: string
  parentId: number
  id: number
  position: number
}

export interface AdminCourse {
  id: number
  publicId: string
  title: string
  slug: string
  shortDescription: string | null
  description: string | null
  level: string | null
  thumbnailKey: string | null
  status: AdminEntityStatus
  accessDurationDays: number | null
  createdAt: string
  updatedAt: string
}

export interface AdminSubject {
  id: number
  courseId: number
  title: string
  slug: string
  description: string | null
  position: number
  status: AdminEntityStatus
  createdAt: string
  updatedAt: string
  topics: AdminTopic[]
}

export interface AdminTopic {
  id: number
  subjectId: number
  title: string
  slug: string
  description: string | null
  position: number
  status: AdminEntityStatus
  createdAt: string
  updatedAt: string
  lessons: AdminLesson[]
}

export interface AdminLesson {
  id: number
  topicId: number
  publicId: string
  title: string
  slug: string
  lessonType: AdminLessonRow['lesson_type']
  summary: string | null
  estimatedMinutes: number | null
  position: number
  isPreview: boolean
  requiresPrevious: boolean
  status: AdminEntityStatus
  createdAt: string
  updatedAt: string
}

export interface AdminLessonBlock {
  id: number
  lessonId: number
  type: AdminLessonBlockRow['block_type']
  content: unknown
  position: number
  createdAt: string
  updatedAt: string
}

export interface AdminPracticeSet {
  id: number
  lessonId: number
  title: string
  instructions: string | null
  passingScore: number
  questionCount: number
  maximumAttempts: number | null
  showExplanations: boolean
  status: AdminEntityStatus
  questionSource: AdminPracticeSetRow['question_source']
  generator: {
    slug: string
    version: number
    difficulty: {
      easy: number
      medium: number
      hard: number
    }
  } | null
  createdAt: string
  updatedAt: string
}

export interface AdminQuestionChoice {
  id: number
  text: string
  isCorrect: boolean
  position: number
  updatedAt: string | null
}

export interface AdminPracticeQuestion {
  id: number
  practiceSetId: number
  prompt: string
  explanation: string | null
  points: number
  position: number
  status: AdminPracticeQuestionRow['status']
  createdAt: string
  updatedAt: string
  choices: AdminQuestionChoice[]
}

export interface AdminQuiz {
  id: number
  lessonId: number | null
  topicId: number | null
  title: string
  description: string | null
  quizType: AdminQuizRow['quiz_type']
  passingScore: number
  timeLimitMinutes: number | null
  maximumAttempts: number | null
  shuffleQuestions: boolean
  shuffleChoices: boolean
  showExplanations: boolean
  status: AdminEntityStatus
  createdAt: string
  updatedAt: string
}

export interface AdminQuizQuestion {
  id: number
  quizId: number
  questionType: AdminQuizQuestionRow['question_type']
  prompt: string
  explanation: string | null
  points: number
  position: number
  status: AdminQuizQuestionRow['status']
  createdAt: string
  updatedAt: string
  choices: AdminQuestionChoice[]
}

function notFound(entity: string): AppError {
  return new AppError(404, 'ADMIN_CONTENT_NOT_FOUND', `${entity} was not found.`)
}

function staleError(): AppError {
  return new AppError(
    409,
    'CONTENT_MODIFIED',
    'This content was modified. Refresh before saving.',
  )
}

function assertFresh(rowUpdatedAt: string, submittedUpdatedAt: string): void {
  if (rowUpdatedAt !== submittedUpdatedAt) {
    throw staleError()
  }
}

function getSupportedGenerator(slug: string, version: number) {
  return getGenerator(slug as GeneratorSlug, version)
}

function assertGeneratedPracticeConfig(input: PracticeSetInput): void {
  if (
    input.generatorSlug === undefined ||
    input.generatorVersion === undefined ||
    input.difficulty === undefined
  ) {
    throw new AppError(
      400,
      'UNSUPPORTED_GENERATOR',
      'Generated practice requires a supported registered generator.',
    )
  }

  const generator = getSupportedGenerator(
    input.generatorSlug,
    input.generatorVersion,
  )

  if (generator === null) {
    throw new AppError(
      400,
      'UNSUPPORTED_GENERATOR',
      'Generated practice requires a supported registered generator.',
    )
  }

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    if (
      input.difficulty[difficulty] > 0 &&
      !generator.supportedDifficulties.includes(difficulty)
    ) {
      throw new AppError(
        400,
        'UNSUPPORTED_GENERATOR',
        `Generator ${generator.slug} does not support ${difficulty} questions.`,
      )
    }
  }
}

function assertStoredGeneratedPracticeConfig(
  practice: AdminPracticeSetRow,
): void {
  if (
    practice.generator_slug === null ||
    practice.generator_version === null ||
    practice.easy_count === null ||
    practice.medium_count === null ||
    practice.hard_count === null
  ) {
    throw new AppError(
      400,
      'PUBLISH_VALIDATION_FAILED',
      'Generated practice requires a supported registered generator.',
    )
  }

  const generator = getSupportedGenerator(
    practice.generator_slug,
    practice.generator_version,
  )

  if (generator === null) {
    throw new AppError(
      400,
      'PUBLISH_VALIDATION_FAILED',
      'Generated practice requires a supported registered generator.',
    )
  }

  if (
    practice.easy_count + practice.medium_count + practice.hard_count !==
    practice.question_count
  ) {
    throw new AppError(
      400,
      'PUBLISH_VALIDATION_FAILED',
      'Generated practice difficulty counts must equal the total question count.',
    )
  }

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const count =
      difficulty === 'easy'
        ? practice.easy_count
        : difficulty === 'medium'
          ? practice.medium_count
          : practice.hard_count

    if (count > 0 && !generator.supportedDifficulties.includes(difficulty)) {
      throw new AppError(
        400,
        'PUBLISH_VALIDATION_FAILED',
        `Generator ${generator.slug} does not support ${difficulty} questions.`,
      )
    }
  }
}

function assertNoRawHtmlContent(value: unknown): void {
  if (typeof value === 'string' && /<\/?[a-z][^>]*>/i.test(value)) {
    throw new AppError(
      400,
      'RAW_HTML_BLOCKED',
      'Lesson blocks must use structured content instead of raw HTML.',
    )
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoRawHtmlContent(item)
    }
    return
  }

  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) {
      assertNoRawHtmlContent(item)
    }
  }
}

function validateAdminLessonBlockContent(
  blockType: AdminLessonBlockRow['block_type'],
  content: unknown,
): ReturnType<typeof validateLessonBlockContent> {
  try {
    return validateLessonBlockContent(blockType, content)
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw new AppError(
        400,
        'INVALID_LESSON_BLOCK_CONTENT',
        `The content is not valid for a ${blockType} lesson block.`,
        {
          fieldErrors: {
            content: ['The lesson block content has an invalid shape.'],
          },
        },
      )
    }

    throw error
  }
}
function mapArchiveAwareStatus(row: {
  status: AdminEntityStatus
  archived_at: string | null
}): AdminEntityStatus {
  return row.archived_at === null ? row.status : 'archived'
}

function toArchiveAwareRowStatus(status: AdminEntityStatus): {
  status: 'draft' | 'published'
  archived_at: string | null
} {
  if (status === 'archived') {
    return {
      status: 'draft',
      archived_at: new Date().toISOString(),
    }
  }

  return {
    status,
    archived_at: null,
  }
}

function mapCourse(row: AdminCourseRow): AdminCourse {
  return {
    id: row.id,
    publicId: row.public_id,
    title: row.title,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    level: row.level,
    thumbnailKey: row.thumbnail_key,
    status: row.status,
    accessDurationDays: row.access_duration_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapLesson(row: AdminLessonRow): AdminLesson {
  return {
    id: row.id,
    topicId: row.topic_id,
    publicId: row.public_id,
    title: row.title,
    slug: row.slug,
    lessonType: row.lesson_type,
    summary: row.summary,
    estimatedMinutes: row.estimated_minutes,
    position: row.position,
    isPreview: row.is_preview === 1,
    requiresPrevious: row.requires_previous === 1,
    status: mapArchiveAwareStatus(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTopic(row: AdminTopicRow, lessons: AdminLesson[]): AdminTopic {
  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    position: row.position,
    status: mapArchiveAwareStatus(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lessons,
  }
}

function mapSubject(row: AdminSubjectRow, topics: AdminTopic[]): AdminSubject {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    position: row.position,
    status: mapArchiveAwareStatus(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    topics,
  }
}


function canonicalJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJsonValue)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [
      key,
      canonicalJsonValue((value as Record<string, unknown>)[key]),
    ]),
  )
}

function lessonBlockContentJsonEquals(left: string, right: string): boolean {
  return JSON.stringify(canonicalJsonValue(JSON.parse(left) as unknown)) ===
    JSON.stringify(canonicalJsonValue(JSON.parse(right) as unknown))
}

function mapBlock(row: AdminLessonBlockRow): AdminLessonBlock {
  const parsed = parseLessonBlock({
    id: row.id,
    blockType: row.block_type,
    contentJson: row.content_json,
    position: row.position,
  })

  return {
    id: row.id,
    lessonId: row.lesson_id,
    type: row.block_type,
    content: parsed.block?.content ?? null,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapPracticeSet(row: AdminPracticeSetRow): AdminPracticeSet {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    title: row.title,
    instructions: row.instructions,
    passingScore: row.passing_score,
    questionCount: row.question_count,
    maximumAttempts: row.maximum_attempts,
    showExplanations: row.show_explanations === 1,
    status: mapArchiveAwareStatus(row),
    questionSource: row.question_source,
    generator:
      row.generator_slug === null ||
      row.generator_version === null ||
      row.easy_count === null ||
      row.medium_count === null ||
      row.hard_count === null
        ? null
        : {
            slug: row.generator_slug,
            version: row.generator_version,
            difficulty: {
              easy: row.easy_count,
              medium: row.medium_count,
              hard: row.hard_count,
            },
          },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapChoice(
  row: AdminPracticeChoiceRow | AdminQuizChoiceRow,
): AdminQuestionChoice {
  return {
    id: row.id,
    text: row.choice_text,
    isCorrect: row.is_correct === 1,
    position: row.position,
    updatedAt: row.updated_at,
  }
}

function mapPracticeQuestion(
  row: AdminPracticeQuestionRow,
  choices: AdminPracticeChoiceRow[],
): AdminPracticeQuestion {
  return {
    id: row.id,
    practiceSetId: row.practice_set_id,
    prompt: row.prompt,
    explanation: row.explanation,
    points: row.points,
    position: row.position,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    choices: choices.map(mapChoice),
  }
}

function mapQuiz(row: AdminQuizRow): AdminQuiz {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    topicId: row.topic_id,
    title: row.title,
    description: row.description,
    quizType: row.quiz_type,
    passingScore: row.passing_score,
    timeLimitMinutes: row.time_limit_minutes,
    maximumAttempts: row.maximum_attempts,
    shuffleQuestions: row.shuffle_questions === 1,
    shuffleChoices: row.shuffle_choices === 1,
    showExplanations: row.show_explanations === 1,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapQuizQuestion(
  row: AdminQuizQuestionRow,
  choices: AdminQuizChoiceRow[],
): AdminQuizQuestion {
  return {
    id: row.id,
    quizId: row.quiz_id,
    questionType: row.question_type,
    prompt: row.prompt,
    explanation: row.explanation,
    points: row.points,
    position: row.position,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    choices: choices.map(mapChoice),
  }
}

async function nextPosition(
  database: D1Database,
  table: OrderedTable,
  parentColumn: string,
  parentId: number,
  requestedPosition: number | undefined,
): Promise<number> {
  if (requestedPosition === undefined) {
    return (await getMaxPosition(database, table, parentColumn, parentId)) + 1
  }

  await shiftPositionsForInsert(database, {
    table,
    parentColumn,
    parentId,
    position: requestedPosition,
  })

  return requestedPosition
}

async function moveOrderedEntity(
  database: D1Database,
  config: OrderedEntityConfig,
  direction: 'up' | 'down',
): Promise<boolean> {
  const target = await findAdjacentRow(database, {
    table: config.table,
    parentColumn: config.parentColumn,
    parentId: config.parentId,
    position: config.position,
    direction,
  })

  if (target === null) {
    return false
  }

  await swapAdjacentPositions(database, {
    table: config.table,
    parentColumn: config.parentColumn,
    parentId: config.parentId,
    currentId: config.id,
    currentPosition: config.position,
    targetId: target.id,
    targetPosition: target.position,
  })

  return true
}

export async function getAdminDashboard(
  database: D1Database,
): Promise<{
  counts: ReturnType<typeof mapDashboardCounts>
  recentChanges: AdminAuditLog[]
  cseProfessional: AdminCourse | null
}> {
  const [counts, auditRows, cseProfessional] = await Promise.all([
    getAdminDashboardCounts(database),
    import('./audit-log.service').then((module) =>
      module.getAdminAuditLogs(database, { limit: 8, offset: 0 }),
    ),
    findCourseBySlug(database, 'cse-professional'),
  ])

  return {
    counts: mapDashboardCounts(counts),
    recentChanges: auditRows.logs,
    cseProfessional:
      cseProfessional === null ? null : mapCourse(cseProfessional),
  }
}

function mapDashboardCounts(row: Awaited<ReturnType<typeof getAdminDashboardCounts>>) {
  return {
    courses: row.courses,
    publishedCourses: row.published_courses,
    draftCourses: row.draft_courses,
    subjects: row.subjects,
    topics: row.topics,
    lessons: row.lessons,
    publishedLessons: row.published_lessons,
    practiceSets: row.practice_sets,
    quizzes: row.quizzes,
  }
}

export async function getAdminCourses(
  database: D1Database,
): Promise<{ courses: AdminCourse[] }> {
  return {
    courses: (await listCourses(database)).map(mapCourse),
  }
}

export async function getAdminCourseDetail(
  database: D1Database,
  courseId: number,
): Promise<{ course: AdminCourse; subjects: AdminSubject[] }> {
  const course = await findCourseById(database, courseId)

  if (course === null) {
    throw notFound('Course')
  }

  const subjectRows = await listSubjectsForCourse(database, courseId)
  const subjects: AdminSubject[] = []

  for (const subject of subjectRows) {
    const topicRows = await listTopicsForSubject(database, subject.id)
    const topics: AdminTopic[] = []

    for (const topic of topicRows) {
      const lessons = (await listLessonsForTopic(database, topic.id)).map(
        mapLesson,
      )
      topics.push(mapTopic(topic, lessons))
    }

    subjects.push(mapSubject(subject, topics))
  }

  return { course: mapCourse(course), subjects }
}

export async function createAdminCourse(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  input: CourseCreateInput,
): Promise<{ course: AdminCourse }> {
  if ((await findCourseBySlug(database, input.slug)) !== null) {
    throw new AppError(409, 'DUPLICATE_SLUG', 'That course slug is already used.')
  }

  const row = await createCourseRow(database, {
    public_id: crypto.randomUUID(),
    title: input.title,
    slug: input.slug,
    short_description: input.shortDescription,
    description: input.description,
    level: input.level,
    thumbnail_key: input.thumbnailKey,
    status: input.status,
    access_duration_days: input.accessDurationDays ?? null,
  })

  if (row === null) {
    throw new Error('Course could not be created.')
  }

  await recordAdminAuditLog(database, actor, {
    action: 'create',
    entityType: 'course',
    entityId: row.id,
    metadata: { title: row.title, slug: row.slug },
  })

  return { course: mapCourse(row) }
}

export async function updateAdminCourse(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  courseId: number,
  input: CourseUpdateInput,
): Promise<{ course: AdminCourse }> {
  const existing = await findCourseById(database, courseId)

  if (existing === null) {
    throw notFound('Course')
  }

  assertFresh(existing.updated_at, input.updatedAt)

  const duplicate = await findCourseBySlug(database, input.slug ?? existing.slug)

  if (duplicate !== null && duplicate.id !== courseId) {
    throw new AppError(409, 'DUPLICATE_SLUG', 'That course slug is already used.')
  }

  const next: AdminCourseRow = {
    ...existing,
    title: input.title ?? existing.title,
    slug: input.slug ?? existing.slug,
    short_description:
      input.shortDescription === undefined
        ? existing.short_description
        : input.shortDescription,
    description:
      input.description === undefined ? existing.description : input.description,
    level: input.level === undefined ? existing.level : input.level,
    thumbnail_key:
      input.thumbnailKey === undefined
        ? existing.thumbnail_key
        : input.thumbnailKey,
    access_duration_days:
      input.accessDurationDays === undefined
        ? existing.access_duration_days
        : input.accessDurationDays,
    status: input.status ?? existing.status,
  }

  const updated = await updateCourseRow(database, next)

  if (updated === null) {
    throw new Error('Course could not be updated.')
  }

  await recordAdminAuditLog(database, actor, {
    action:
      existing.status !== updated.status
        ? updated.status === 'published'
          ? 'publish'
          : updated.status === 'archived'
            ? 'archive'
            : 'unpublish'
        : 'update',
    entityType: 'course',
    entityId: updated.id,
    metadata: { status: updated.status },
  })

  return { course: mapCourse(updated) }
}

export async function createAdminSubject(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  courseId: number,
  input: SubjectCreateInput,
): Promise<{ subject: AdminSubject }> {
  const course = await findCourseById(database, courseId)

  if (course === null) {
    throw notFound('Course')
  }

  const position = await nextPosition(
    database,
    'subjects',
    'course_id',
    courseId,
    input.position,
  )
  const archivedStatus = toArchiveAwareRowStatus(input.status)
  const row = await createSubjectRow(database, {
    course_id: courseId,
    title: input.title,
    slug: input.slug,
    description: input.description,
    position,
    status: archivedStatus.status,
    archived_at: archivedStatus.archived_at,
  })

  if (row === null) {
    throw new Error('Subject could not be created.')
  }

  await recordAdminAuditLog(database, actor, {
    action: 'create',
    entityType: 'subject',
    entityId: row.id,
    metadata: { courseId, title: row.title },
  })

  return { subject: mapSubject(row, []) }
}

export async function updateAdminSubject(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  subjectId: number,
  input: SubjectUpdateInput,
): Promise<{ subject: AdminSubject }> {
  const existing = await findSubjectById(database, subjectId)

  if (existing === null) {
    throw notFound('Subject')
  }

  assertFresh(existing.updated_at, input.updatedAt)

  const archivedStatus = toArchiveAwareRowStatus(
    input.status ?? mapArchiveAwareStatus(existing),
  )
  const next: AdminSubjectRow = {
    ...existing,
    title: input.title ?? existing.title,
    slug: input.slug ?? existing.slug,
    description:
      input.description === undefined ? existing.description : input.description,
    position: input.position ?? existing.position,
    status: archivedStatus.status,
    archived_at: archivedStatus.archived_at,
  }
  const updated = await updateSubjectRow(database, next)

  if (updated === null) {
    throw new Error('Subject could not be updated.')
  }

  await recordAdminAuditLog(database, actor, {
    action:
      mapArchiveAwareStatus(existing) !== mapArchiveAwareStatus(updated)
        ? mapArchiveAwareStatus(updated)
        : 'update',
    entityType: 'subject',
    entityId: updated.id,
    metadata: { status: mapArchiveAwareStatus(updated) },
  })

  return { subject: mapSubject(updated, []) }
}

export async function createAdminTopic(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  subjectId: number,
  input: TopicCreateInput,
): Promise<{ topic: AdminTopic }> {
  const subject = await findSubjectById(database, subjectId)

  if (subject === null) {
    throw notFound('Subject')
  }

  const position = await nextPosition(
    database,
    'topics',
    'subject_id',
    subjectId,
    input.position,
  )
  const archivedStatus = toArchiveAwareRowStatus(input.status)
  const row = await createTopicRow(database, {
    subject_id: subjectId,
    title: input.title,
    slug: input.slug,
    description: input.description,
    position,
    status: archivedStatus.status,
    archived_at: archivedStatus.archived_at,
  })

  if (row === null) {
    throw new Error('Topic could not be created.')
  }

  await recordAdminAuditLog(database, actor, {
    action: 'create',
    entityType: 'topic',
    entityId: row.id,
    metadata: { subjectId, title: row.title },
  })

  return { topic: mapTopic(row, []) }
}

export async function updateAdminTopic(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  topicId: number,
  input: TopicUpdateInput,
): Promise<{ topic: AdminTopic }> {
  const existing = await findTopicById(database, topicId)

  if (existing === null) {
    throw notFound('Topic')
  }

  assertFresh(existing.updated_at, input.updatedAt)

  const archivedStatus = toArchiveAwareRowStatus(
    input.status ?? mapArchiveAwareStatus(existing),
  )
  const next: AdminTopicRow = {
    ...existing,
    title: input.title ?? existing.title,
    slug: input.slug ?? existing.slug,
    description:
      input.description === undefined ? existing.description : input.description,
    position: input.position ?? existing.position,
    status: archivedStatus.status,
    archived_at: archivedStatus.archived_at,
  }
  const updated = await updateTopicRow(database, next)

  if (updated === null) {
    throw new Error('Topic could not be updated.')
  }

  await recordAdminAuditLog(database, actor, {
    action:
      mapArchiveAwareStatus(existing) !== mapArchiveAwareStatus(updated)
        ? mapArchiveAwareStatus(updated)
        : 'update',
    entityType: 'topic',
    entityId: updated.id,
    metadata: { status: mapArchiveAwareStatus(updated) },
  })

  return { topic: mapTopic(updated, []) }
}

export async function createAdminLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  topicId: number,
  input: LessonCreateInput,
): Promise<{ lesson: AdminLesson }> {
  const topic = await findTopicById(database, topicId)

  if (topic === null) {
    throw notFound('Topic')
  }

  if (input.status === 'published') {
    throw new AppError(
      400,
      'PUBLISH_VALIDATION_FAILED',
      'New lessons must be drafted before they can be validated and published.',
    )
  }

  const position = await nextPosition(
    database,
    'lessons',
    'topic_id',
    topicId,
    input.position,
  )
  const archivedStatus = toArchiveAwareRowStatus(input.status)
  const row = await createLessonRow(database, {
    topic_id: topicId,
    public_id: `lesson-${crypto.randomUUID()}`,
    title: input.title,
    slug: input.slug,
    lesson_type: input.lessonType,
    summary: input.summary,
    estimated_minutes: input.estimatedMinutes ?? null,
    position,
    is_preview: input.isPreview ? 1 : 0,
    requires_previous: input.requiresPrevious ? 1 : 0,
    status: archivedStatus.status,
    archived_at: archivedStatus.archived_at,
  })

  if (row === null) {
    throw new Error('Lesson could not be created.')
  }

  await recordAdminAuditLog(database, actor, {
    action: 'create',
    entityType: 'lesson',
    entityId: row.id,
    metadata: { topicId, title: row.title, lessonType: row.lesson_type },
  })

  return { lesson: mapLesson(row) }
}

async function validateLessonPublishReady(
  database: D1Database,
  lesson: AdminLessonRow,
): Promise<void> {
  if (lesson.lesson_type === 'reading') {
    const blocks = await listLessonBlocksForLesson(database, lesson.id)

    if (blocks.length === 0) {
      throw new AppError(
        400,
        'PUBLISH_VALIDATION_FAILED',
        'Reading lessons need at least one valid block before publishing.',
      )
    }

    return
  }

  if (lesson.lesson_type === 'practice') {
    const practice = await findPracticeSetByLessonId(database, lesson.id)

    if (practice === null || practice.status !== 'published') {
      throw new AppError(
        400,
        'PUBLISH_VALIDATION_FAILED',
        'Practice lessons need a published practice set before publishing.',
      )
    }

    await validatePracticePublishReady(database, practice)
    return
  }

  if (lesson.lesson_type === 'quiz') {
    const quiz = await findQuizByLessonId(database, lesson.id)

    if (quiz === null || quiz.status !== 'published') {
      throw new AppError(
        400,
        'PUBLISH_VALIDATION_FAILED',
        'Quiz lessons need a published quiz before publishing.',
      )
    }

    await validateQuizPublishReady(database, quiz)
  }
}

export async function updateAdminLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: LessonUpdateInput,
): Promise<{ lesson: AdminLesson }> {
  const existing = await findLessonById(database, lessonId)

  if (existing === null) {
    throw notFound('Lesson')
  }

  assertFresh(existing.updated_at, input.updatedAt)

  if (
    input.lessonType !== undefined &&
    input.lessonType !== existing.lesson_type
  ) {
    throw new AppError(
      409,
      'LESSON_TYPE_CHANGE_BLOCKED',
      'Changing lesson type is blocked in this milestone.',
    )
  }

  const archivedStatus = toArchiveAwareRowStatus(
    input.status ?? mapArchiveAwareStatus(existing),
  )
  const next: AdminLessonRow = {
    ...existing,
    title: input.title ?? existing.title,
    slug: input.slug ?? existing.slug,
    summary: input.summary === undefined ? existing.summary : input.summary,
    estimated_minutes:
      input.estimatedMinutes === undefined
        ? existing.estimated_minutes
        : input.estimatedMinutes,
    position: input.position ?? existing.position,
    is_preview:
      input.isPreview === undefined
        ? existing.is_preview
        : input.isPreview
          ? 1
          : 0,
    requires_previous:
      input.requiresPrevious === undefined
        ? existing.requires_previous
        : input.requiresPrevious
          ? 1
          : 0,
    status: archivedStatus.status,
    archived_at: archivedStatus.archived_at,
  }

  if (mapArchiveAwareStatus(next) === 'published') {
    await validateLessonPublishReady(database, next)
  }

  const updated = await updateLessonRow(database, next)

  if (updated === null) {
    throw new Error('Lesson could not be updated.')
  }

  await recordAdminAuditLog(database, actor, {
    action:
      mapArchiveAwareStatus(existing) !== mapArchiveAwareStatus(updated)
        ? mapArchiveAwareStatus(updated) === 'published'
          ? 'publish'
          : mapArchiveAwareStatus(updated) === 'archived'
            ? 'archive'
            : 'unpublish'
        : 'update',
    entityType: 'lesson',
    entityId: updated.id,
    metadata: { status: mapArchiveAwareStatus(updated) },
  })

  return { lesson: mapLesson(updated) }
}

export async function moveSubject(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  subjectId: number,
  direction: 'up' | 'down',
): Promise<{ moved: boolean }> {
  const subject = await findSubjectById(database, subjectId)

  if (subject === null) {
    throw notFound('Subject')
  }

  const moved = await moveOrderedEntity(
    database,
    {
      table: 'subjects',
      parentColumn: 'course_id',
      parentId: subject.course_id,
      id: subject.id,
      position: subject.position,
    },
    direction,
  )

  if (moved) {
    await recordAdminAuditLog(database, actor, {
      action: 'reorder',
      entityType: 'subject',
      entityId: subject.id,
      metadata: { direction },
    })
  }

  return { moved }
}

export async function moveTopic(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  topicId: number,
  direction: 'up' | 'down',
): Promise<{ moved: boolean }> {
  const topic = await findTopicById(database, topicId)

  if (topic === null) {
    throw notFound('Topic')
  }

  const moved = await moveOrderedEntity(
    database,
    {
      table: 'topics',
      parentColumn: 'subject_id',
      parentId: topic.subject_id,
      id: topic.id,
      position: topic.position,
    },
    direction,
  )

  if (moved) {
    await recordAdminAuditLog(database, actor, {
      action: 'reorder',
      entityType: 'topic',
      entityId: topic.id,
      metadata: { direction },
    })
  }

  return { moved }
}

export async function moveLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  direction: 'up' | 'down',
): Promise<{ moved: boolean }> {
  const lesson = await findLessonById(database, lessonId)

  if (lesson === null) {
    throw notFound('Lesson')
  }

  const moved = await moveOrderedEntity(
    database,
    {
      table: 'lessons',
      parentColumn: 'topic_id',
      parentId: lesson.topic_id,
      id: lesson.id,
      position: lesson.position,
    },
    direction,
  )

  if (moved) {
    await recordAdminAuditLog(database, actor, {
      action: 'reorder',
      entityType: 'lesson',
      entityId: lesson.id,
      metadata: { direction },
    })
  }

  return { moved }
}

export async function getAdminLessonBlocks(
  database: D1Database,
  lessonId: number,
): Promise<{ blocks: AdminLessonBlock[] }> {
  const lesson = await findLessonById(database, lessonId)

  if (lesson === null) {
    throw notFound('Lesson')
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
  }
}

export async function createAdminLessonBlock(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: LessonBlockCreateInput,
): Promise<{ block: AdminLessonBlock }> {
  const lesson = await findLessonById(database, lessonId)

  if (lesson === null) {
    throw notFound('Lesson')
  }

  assertNoRawHtmlContent(input.content)
  const content = validateAdminLessonBlockContent(input.blockType, input.content)
  const position = input.position ?? (
    await getMaxPosition(database, 'lesson_blocks', 'lesson_id', lessonId)
  ) + 1
  const occupied = input.position === undefined
    ? null
    : await findLessonBlockAtPosition(database, lessonId, position)
  const row = await createLessonBlockWithAudit(database, {
    block: {
      lesson_id: lessonId,
      block_type: input.blockType,
      content_json: JSON.stringify(content),
      position,
    },
    actorUserId: actor.internalUserId,
    metadataJson: JSON.stringify({ lessonId, blockType: input.blockType }),
    shiftOccupiedPosition: occupied !== null,
  })

  if (row === null) {
    throw new Error('Lesson block could not be created.')
  }

  return { block: mapBlock(row) }
}

export async function repairPercentageGuidedTeaching(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  rawContent: unknown,
): Promise<{
  block: AdminLessonBlock
  writeRequired: boolean
  repairedPositionCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null
    ? null
    : await findSubjectById(database, topic.subject_id)
  const course = subject === null
    ? null
    : await findCourseById(database, subject.course_id)
  if (
    lesson.slug !== 'finding-the-percentage' ||
    topic?.slug !== 'percentages' ||
    subject?.slug !== 'numerical-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'PERCENTAGE_REPAIR_TARGET_MISMATCH',
      'The guided-teaching repair is restricted to the CSE Percentage pilot lesson.',
    )
  }

  assertNoRawHtmlContent(rawContent)
  const content = validateAdminLessonBlockContent(
    'illustrated-guided-teaching',
    rawContent,
  )
  const contentJson = JSON.stringify(content)
  const blocks = await listLessonBlocksForLesson(database, lessonId)
  const guidedBlocks = blocks.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  if (guidedBlocks.length > 1) {
    throw new AppError(
      409,
      'PERCENTAGE_REPAIR_STATE_UNRECOGNIZED',
      'The Percentage lesson contains more than one guided-teaching block.',
    )
  }

  const existingBlocks = blocks.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const visualIndexes = existingBlocks.flatMap((block, index) => {
    if (block.block_type !== 'example') return []
    try {
      const value = JSON.parse(block.content_json) as {
        title?: unknown
        visual?: { kind?: unknown }
      }
      return value.title === 'Find 20% of 80' &&
        value.visual?.kind === 'decimal-movement'
        ? [index]
        : []
    } catch {
      return []
    }
  })
  if (
    existingBlocks.length !== 9 ||
    visualIndexes.length !== 1 ||
    visualIndexes[0] !== 4
  ) {
    throw new AppError(
      409,
      'PERCENTAGE_REPAIR_STATE_UNRECOGNIZED',
      'The Percentage lesson does not match the approved nine-block pilot structure.',
    )
  }

  const guided = guidedBlocks[0] ?? null
  const repairedPositionCount = existingBlocks.reduce((count, block, index) => {
    const expected = index < 4 ? index + 1 : index + 2
    return count + (block.position === expected ? 0 : 1)
  }, 0)
  const writeRequired =
    guided === null ||
    guided.position !== 5 ||
    guided.content_json !== contentJson ||
    repairedPositionCount > 0

  if (!writeRequired && guided !== null) {
    return {
      block: mapBlock(guided),
      writeRequired: false,
      repairedPositionCount: 0,
    }
  }

  const row = await repairPercentageGuidedTeachingWithAudit(database, {
    lessonId,
    actorUserId: actor.internalUserId,
    guidedBlockId: guided?.id ?? null,
    guidedContentJson: contentJson,
    orderedExistingBlockIds: existingBlocks.map((block) => block.id),
    metadataJson: JSON.stringify({
      lessonId,
      operation: 'percentage-guided-teaching-repair',
      repairedPositionCount,
    }),
  })
  if (row === null) throw new Error('Percentage guided teaching repair failed.')

  return { block: mapBlock(row), writeRequired: true, repairedPositionCount }
}


export async function reconcilePercentageTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: PercentageTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'percentages' ||
    subject?.slug !== 'numerical-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'PERCENTAGE_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Percentage Teaching System reconciliation is restricted to the CSE Percentages topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'PERCENTAGE_GUIDED_TEACHING_NOT_ALLOWED',
      'Percentage Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Percentage reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'percentage-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}


export async function reconcileFractionsTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: FractionsTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'fractions' ||
    subject?.slug !== 'numerical-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'FRACTIONS_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Fractions Teaching System reconciliation is restricted to the CSE Fractions topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'FRACTIONS_GUIDED_TEACHING_NOT_ALLOWED',
      'Fractions Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Fractions reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'fractions-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function reconcileDecimalsTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: DecimalsTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'decimals' ||
    subject?.slug !== 'numerical-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'DECIMALS_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Decimals Teaching System reconciliation is restricted to the CSE Decimals topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'DECIMALS_GUIDED_TEACHING_NOT_ALLOWED',
      'Decimals Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Decimals reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'decimals-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function reconcileRatioProportionTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: RatioProportionTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'ratio-and-proportion' ||
    subject?.slug !== 'numerical-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'RATIO_PROPORTION_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Ratio and Proportion Teaching System reconciliation is restricted to the CSE Ratio and Proportion topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'RATIO_PROPORTION_GUIDED_TEACHING_NOT_ALLOWED',
      'Ratio and Proportion Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Ratio and Proportion reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'ratio-proportion-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function reconcileAverageTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: AverageTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'average' ||
    subject?.slug !== 'numerical-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'AVERAGE_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Average Teaching System reconciliation is restricted to the CSE Average topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'AVERAGE_GUIDED_TEACHING_NOT_ALLOWED',
      'Average Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Average reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'average-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function reconcileNumberProblemsTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: NumberProblemsTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'number-problems' ||
    subject?.slug !== 'numerical-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'NUMBER_PROBLEMS_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Number Problems Teaching System reconciliation is restricted to the CSE Number Problems topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'NUMBER_PROBLEMS_GUIDED_TEACHING_NOT_ALLOWED',
      'Number Problems Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Number Problems reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'number-problems-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function reconcileAgeProblemsTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: AgeProblemsTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'age-problems' ||
    subject?.slug !== 'numerical-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'AGE_PROBLEMS_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Age Problems Teaching System reconciliation is restricted to the CSE Age Problems topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'AGE_PROBLEMS_GUIDED_TEACHING_NOT_ALLOWED',
      'Age Problems Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Age Problems reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'age-problems-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function reconcileWorkRateTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: WorkRateTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'work-and-rate-problems' ||
    subject?.slug !== 'numerical-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'WORK_RATE_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Work and Rate Teaching System reconciliation is restricted to the CSE Work and Rate Problems topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'WORK_RATE_GUIDED_TEACHING_NOT_ALLOWED',
      'Work and Rate Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Work and Rate reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'work-rate-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function reconcileDistanceSpeedTimeTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: DistanceSpeedTimeTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'distance-speed-and-time' ||
    subject?.slug !== 'numerical-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'DISTANCE_SPEED_TIME_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Distance, Speed and Time Teaching System reconciliation is restricted to the CSE Distance, Speed, and Time topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'DISTANCE_SPEED_TIME_GUIDED_TEACHING_NOT_ALLOWED',
      'Distance, Speed and Time Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Distance, Speed and Time reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'distance-speed-time-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function reconcileSimpleInterestTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: SimpleInterestTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'simple-interest' ||
    subject?.slug !== 'numerical-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'SIMPLE_INTEREST_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Simple Interest Teaching System reconciliation is restricted to the CSE Simple Interest topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'SIMPLE_INTEREST_GUIDED_TEACHING_NOT_ALLOWED',
      'Simple Interest Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Simple Interest reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'simple-interest-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function reconcileVocabularyWordMeaningTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: VocabularyWordMeaningTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'vocabulary-and-word-meaning' ||
    subject?.slug !== 'verbal-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'VOCABULARY_WORD_MEANING_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Vocabulary and Word Meaning Teaching System reconciliation is restricted to the CSE Verbal Ability topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'VOCABULARY_WORD_MEANING_GUIDED_TEACHING_NOT_ALLOWED',
      'Vocabulary and Word Meaning Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Vocabulary and Word Meaning reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'vocabulary-word-meaning-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function reconcileSynonymsAntonymsTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: SynonymsAntonymsTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'synonyms-and-antonyms' ||
    subject?.slug !== 'verbal-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'SYNONYMS_ANTONYMS_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Synonyms and Antonyms Teaching System reconciliation is restricted to the CSE Verbal Ability topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'SYNONYMS_ANTONYMS_GUIDED_TEACHING_NOT_ALLOWED',
      'Synonyms and Antonyms Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Synonyms and Antonyms reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'synonyms-antonyms-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function reconcileContextCluesTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: ContextCluesTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'context-clues' ||
    subject?.slug !== 'verbal-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'CONTEXT_CLUES_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Context Clues Teaching System reconciliation is restricted to the CSE Verbal Ability topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'CONTEXT_CLUES_GUIDED_TEACHING_NOT_ALLOWED',
      'Context Clues Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Context Clues reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'context-clues-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function reconcileSentenceCompletionTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: SentenceCompletionTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'sentence-completion' ||
    subject?.slug !== 'verbal-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'SENTENCE_COMPLETION_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Sentence Completion Teaching System reconciliation is restricted to the CSE Verbal Ability topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'SENTENCE_COMPLETION_GUIDED_TEACHING_NOT_ALLOWED',
      'Sentence Completion Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Sentence Completion reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'sentence-completion-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function getGrammarCorrectUsageTeachingSystemCapability(
  database: D1Database,
  lessonId: number,
): Promise<{ supported: true; operation: string; topicSlug: string }> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'grammar-and-correct-usage' ||
    subject?.slug !== 'verbal-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'GRAMMAR_CORRECT_USAGE_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Grammar and Correct Usage Teaching System capability is restricted to the CSE Verbal Ability topic.',
    )
  }
  return { supported: true, operation: 'grammar-correct-usage-teaching-system-v1', topicSlug: topic.slug }
}
export async function reconcileGrammarCorrectUsageTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: GrammarCorrectUsageTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'grammar-and-correct-usage' ||
    subject?.slug !== 'verbal-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'GRAMMAR_CORRECT_USAGE_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Grammar and Correct Usage Teaching System reconciliation is restricted to the CSE Verbal Ability topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'GRAMMAR_CORRECT_USAGE_GUIDED_TEACHING_NOT_ALLOWED',
      'Grammar and Correct Usage Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Grammar and Correct Usage reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'grammar-and-correct-usage-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function getSubjectVerbAgreementTeachingSystemCapability(
  database: D1Database,
  lessonId: number,
): Promise<{ supported: true; operation: string; topicSlug: string }> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'subject-verb-agreement' ||
    subject?.slug !== 'verbal-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'SUBJECT_VERB_AGREEMENT_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Subject–Verb Agreement Teaching System capability is restricted to the CSE Verbal Ability topic.',
    )
  }
  return { supported: true, operation: 'subject-verb-agreement-teaching-system-v1', topicSlug: topic.slug }
}
export async function reconcileSubjectVerbAgreementTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: SubjectVerbAgreementTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'subject-verb-agreement' ||
    subject?.slug !== 'verbal-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'SUBJECT_VERB_AGREEMENT_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Subject–Verb Agreement Teaching System reconciliation is restricted to the CSE Verbal Ability topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'SUBJECT_VERB_AGREEMENT_GUIDED_TEACHING_NOT_ALLOWED',
      'Subject–Verb Agreement Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Subject–Verb Agreement reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'subject-verb-agreement-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function getPronounsModifiersTeachingSystemCapability(
  database: D1Database,
  lessonId: number,
): Promise<{ supported: true; operation: string; topicSlug: string }> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'pronouns-and-modifiers' ||
    subject?.slug !== 'verbal-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'PRONOUNS_MODIFIERS_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Pronouns and Modifiers Teaching System capability is restricted to the CSE Verbal Ability topic.',
    )
  }
  return { supported: true, operation: 'pronouns-and-modifiers-teaching-system-v1', topicSlug: topic.slug }
}
export async function reconcilePronounsModifiersTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: PronounsModifiersTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'pronouns-and-modifiers' ||
    subject?.slug !== 'verbal-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'PRONOUNS_MODIFIERS_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Pronouns and Modifiers Teaching System reconciliation is restricted to the CSE Verbal Ability topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'PRONOUNS_MODIFIERS_GUIDED_TEACHING_NOT_ALLOWED',
      'Pronouns and Modifiers Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Pronouns and Modifiers reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'pronouns-and-modifiers-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function getSentenceStructureErrorsTeachingSystemCapability(
  database: D1Database,
  lessonId: number,
): Promise<{ supported: true; operation: string; topicSlug: string }> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'sentence-structure-and-error-identification' ||
    subject?.slug !== 'verbal-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'SENTENCE_STRUCTURE_ERRORS_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Sentence Structure and Error Identification Teaching System capability is restricted to the CSE Verbal Ability topic.',
    )
  }
  return { supported: true, operation: 'sentence-structure-and-error-identification-teaching-system-v1', topicSlug: topic.slug }
}
export async function reconcileSentenceStructureErrorsTeachingSystemLesson(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: SentenceStructureErrorsTeachingSystemReconcileInput,
): Promise<{
  blocks: AdminLessonBlock[]
  writeRequired: boolean
  createdCount: number
  updatedCount: number
  deletedCount: number
}> {
  const lesson = await findLessonById(database, lessonId)
  if (lesson === null) throw notFound('Lesson')
  const topic = await findTopicById(database, lesson.topic_id)
  const subject = topic === null ? null : await findSubjectById(database, topic.subject_id)
  const course = subject === null ? null : await findCourseById(database, subject.course_id)
  if (
    topic?.slug !== 'sentence-structure-and-error-identification' ||
    subject?.slug !== 'verbal-ability' ||
    course?.slug !== 'cse-professional'
  ) {
    throw new AppError(
      409,
      'SENTENCE_STRUCTURE_ERRORS_TEACHING_SYSTEM_TARGET_MISMATCH',
      'Sentence Structure and Error Identification Teaching System reconciliation is restricted to the CSE Verbal Ability topic.',
    )
  }

  const desired = input.blocks.map((block) => {
    assertNoRawHtmlContent(block.content)
    const content = validateAdminLessonBlockContent(block.blockType, block.content)
    return {
      blockType: block.blockType,
      contentJson: JSON.stringify(content),
      position: block.position,
    }
  })
  if (desired.some((block) => block.blockType === 'illustrated-guided-teaching')) {
    throw new AppError(
      409,
      'SENTENCE_STRUCTURE_ERRORS_GUIDED_TEACHING_NOT_ALLOWED',
      'Sentence Structure and Error Identification Teaching System v1 does not include illustrated guided teaching.',
    )
  }

  const existing = await listLessonBlocksForLesson(database, lessonId)
  const guided = existing.filter(
    (block) => block.block_type === 'illustrated-guided-teaching',
  )
  const allowed = existing.filter(
    (block) => block.block_type !== 'illustrated-guided-teaching',
  )
  const retainedCount = Math.min(allowed.length, desired.length)
  const retained = allowed.slice(0, retainedCount).map((block, index) => {
    const target = desired[index]
    if (target === undefined) throw new Error('Sentence Structure and Error Identification reconciliation target is missing.')
    return {
      id: block.id,
      blockType: target.blockType,
      contentJson: target.contentJson,
      position: target.position,
      contentChanged:
        block.block_type !== target.blockType ||
        !lessonBlockContentJsonEquals(block.content_json, target.contentJson),
      positionChanged: block.position !== target.position,
    }
  })
  const deleteIds = [
    ...guided.map((block) => block.id),
    ...allowed.slice(desired.length).map((block) => block.id),
  ]
  const creates = desired.slice(allowed.length)
  const updatedCount = retained.filter(
    (block) => block.contentChanged || block.positionChanged,
  ).length
  const writeRequired =
    updatedCount > 0 || deleteIds.length > 0 || creates.length > 0

  if (writeRequired) {
    await reconcileTeachingSystemLessonBlocksWithAudit(database, {
      lessonId,
      actorUserId: actor.internalUserId,
      retained,
      deleteIds,
      creates,
      metadataJson: JSON.stringify({
        lessonId,
        operation: 'sentence-structure-and-error-identification-teaching-system-v1-reconcile',
        createdCount: creates.length,
        updatedCount,
        deletedCount: deleteIds.length,
      }),
    })
  }

  return {
    blocks: (await listLessonBlocksForLesson(database, lessonId)).map(mapBlock),
    writeRequired,
    createdCount: creates.length,
    updatedCount,
    deletedCount: deleteIds.length,
  }
}

export async function updateAdminLessonBlock(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  blockId: number,
  input: LessonBlockUpdateInput,
  requestId: string,
): Promise<{ block: AdminLessonBlock }> {
  const existing = await findLessonBlockById(database, blockId)

  if (existing === null) {
    throw notFound('Lesson block')
  }

  const blockType = input.blockType ?? existing.block_type
  const rawContent =
    input.content === undefined
      ? JSON.parse(existing.content_json) as unknown
      : input.content
  assertNoRawHtmlContent(rawContent)
  const content = validateAdminLessonBlockContent(blockType, rawContent)
  let updated: AdminLessonBlockRow | null

  try {
    updated = await updateLessonBlockWithAudit(database, {
      block: {
        ...existing,
        block_type: blockType,
        content_json: JSON.stringify(content),
        position: input.position ?? existing.position,
      },
      actorUserId: actor.internalUserId,
      metadataJson: JSON.stringify({ blockType }),
    })
  } catch (error: unknown) {
    console.error(
      JSON.stringify({
        message: 'Admin lesson block update failed',
        requestId,
        stage: 'atomic_update_and_audit',
        blockId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      }),
    )
    throw error
  }

  if (updated === null) {
    throw new Error('Lesson block could not be updated.')
  }

  return { block: mapBlock(updated) }
}

export async function deleteAdminLessonBlock(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  blockId: number,
): Promise<{ deleted: true }> {
  const block = await findLessonBlockById(database, blockId)

  if (block === null) {
    throw notFound('Lesson block')
  }

  await deleteLessonBlockRow(database, blockId)
  await recordAdminAuditLog(database, actor, {
    action: 'safe_delete',
    entityType: 'lesson_block',
    entityId: blockId,
    metadata: { lessonId: block.lesson_id },
  })

  return { deleted: true }
}

export async function moveLessonBlock(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  blockId: number,
  direction: 'up' | 'down',
): Promise<{ moved: boolean }> {
  const block = await findLessonBlockById(database, blockId)

  if (block === null) {
    throw notFound('Lesson block')
  }

  const moved = await moveOrderedEntity(
    database,
    {
      table: 'lesson_blocks',
      parentColumn: 'lesson_id',
      parentId: block.lesson_id,
      id: block.id,
      position: block.position,
    },
    direction,
  )

  if (moved) {
    await recordAdminAuditLog(database, actor, {
      action: 'reorder',
      entityType: 'lesson_block',
      entityId: block.id,
      metadata: { direction },
    })
  }

  return { moved }
}

async function validatePracticePublishReady(
  database: D1Database,
  practice: AdminPracticeSetRow,
): Promise<void> {
  if (practice.question_source === 'generated') {
    assertStoredGeneratedPracticeConfig(practice)
    return
  }

  const questions = await listPracticeQuestions(database, practice.id)
  const activeQuestions = questions.filter(
    (question) => question.status === 'active',
  )

  if (activeQuestions.length === 0) {
    throw new AppError(
      400,
      'PUBLISH_VALIDATION_FAILED',
      'Fixed practice needs at least one active question.',
    )
  }

  for (const question of activeQuestions) {
    const choices = await listPracticeChoices(database, question.id)

    if (
      choices.length !== 4 ||
      choices.filter((choice) => choice.is_correct === 1).length !== 1 ||
      new Set(choices.map((choice) => choice.choice_text.toLowerCase())).size !==
        choices.length
    ) {
      throw new AppError(
        400,
        'PUBLISH_VALIDATION_FAILED',
        'Each fixed practice question needs four unique choices and one correct answer.',
      )
    }
  }
}

export async function getAdminPracticeSet(
  database: D1Database,
  lessonId: number,
): Promise<{ practiceSet: AdminPracticeSet | null; questions: AdminPracticeQuestion[] }> {
  const practice = await findPracticeSetByLessonId(database, lessonId)

  if (practice === null) {
    return { practiceSet: null, questions: [] }
  }

  const questions = await listPracticeQuestions(database, practice.id)
  const mappedQuestions: AdminPracticeQuestion[] = []

  for (const question of questions) {
    mappedQuestions.push(
      mapPracticeQuestion(question, await listPracticeChoices(database, question.id)),
    )
  }

  return {
    practiceSet: mapPracticeSet(practice),
    questions: mappedQuestions,
  }
}

export async function saveAdminPracticeSet(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: PracticeSetInput,
): Promise<{ practiceSet: AdminPracticeSet }> {
  const lesson = await findLessonById(database, lessonId)

  if (lesson === null) {
    throw notFound('Lesson')
  }

  const existing = await findPracticeSetByLessonId(database, lessonId)

  if (existing !== null && input.updatedAt !== undefined) {
    assertFresh(existing.updated_at, input.updatedAt)
  }

  if (input.questionSource === 'generated') {
    assertGeneratedPracticeConfig(input)
  }

  const requestedStatus = input.status
  const statusForValidation =
    requestedStatus === 'published' ? 'draft' : requestedStatus
  const archivedStatus = toArchiveAwareRowStatus(statusForValidation)

  const row = await upsertPracticeSetRow(database, {
    lesson_id: lessonId,
    title: input.title,
    instructions: input.instructions,
    passing_score: input.passingScore,
    question_count: input.questionCount,
    maximum_attempts: input.maximumAttempts ?? null,
    show_explanations: input.showExplanations ? 1 : 0,
    status: archivedStatus.status,
    archived_at: archivedStatus.archived_at,
    question_source: input.questionSource,
  })

  if (row === null) {
    throw new Error('Practice set could not be saved.')
  }

  if (input.questionSource === 'generated') {
    if (
      input.generatorSlug === undefined ||
      input.generatorVersion === undefined ||
      input.difficulty === undefined
    ) {
      throw new Error('Generator input was unexpectedly missing.')
    }

    await upsertPracticeGeneratorConfig(database, {
      practiceSetId: row.id,
      generatorSlug: input.generatorSlug,
      generatorVersion: input.generatorVersion,
      easyCount: input.difficulty.easy,
      mediumCount: input.difficulty.medium,
      hardCount: input.difficulty.hard,
    })
  } else {
    await deletePracticeGeneratorConfig(database, row.id)
  }

  let refreshed = await findPracticeSetById(database, row.id)

  if (refreshed === null) {
    throw new Error('Practice set could not be reloaded.')
  }

  if (requestedStatus === 'published') {
    await validatePracticePublishReady(database, refreshed)

    refreshed = await upsertPracticeSetRow(database, {
      lesson_id: lessonId,
      title: input.title,
      instructions: input.instructions,
      passing_score: input.passingScore,
      question_count: input.questionCount,
      maximum_attempts: input.maximumAttempts ?? null,
      show_explanations: input.showExplanations ? 1 : 0,
      status: 'published',
      archived_at: null,
      question_source: input.questionSource,
    })

    if (refreshed === null) {
      throw new Error('Practice set could not be published.')
    }
  }

  await recordAdminAuditLog(database, actor, {
    action:
      existing === null
        ? 'create'
        : mapArchiveAwareStatus(existing) !== mapArchiveAwareStatus(refreshed)
          ? mapArchiveAwareStatus(refreshed) === 'published'
            ? 'publish'
            : mapArchiveAwareStatus(refreshed) === 'archived'
              ? 'archive'
              : 'unpublish'
          : 'update',
    entityType: 'practice_set',
    entityId: refreshed.id,
    metadata: { lessonId, questionSource: refreshed.question_source },
  })

  return { practiceSet: mapPracticeSet(refreshed) }
}

export async function saveAdminPracticeQuestion(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  practiceSetId: number,
  questionId: number | null,
  input: FixedQuestionInput,
): Promise<{ question: AdminPracticeQuestion }> {
  let parentPracticeSetId = practiceSetId
  if (questionId !== null) {
    const existing = await findPracticeQuestionById(database, questionId)

    if (existing === null) {
      throw notFound('Practice question')
    }

    if (input.updatedAt !== undefined) {
      assertFresh(existing.updated_at, input.updatedAt)
    }

    parentPracticeSetId = existing.practice_set_id
  }

  const practice = await findPracticeSetById(database, parentPracticeSetId)

  if (practice === null) {
    throw notFound('Practice set')
  }

  if (questionId === null) {
    await shiftPositionsForInsert(database, {
      table: 'practice_questions',
      parentColumn: 'practice_set_id',
      parentId: parentPracticeSetId,
      position: input.position,
    })
  }

  const row = await upsertPracticeQuestionWithChoices(database, {
    questionId,
    question: {
      practice_set_id: parentPracticeSetId,
      prompt: input.prompt,
      explanation: input.explanation,
      points: input.points,
      position: input.position,
      status: input.status,
    },
    choices: input.choices.map((choice) => ({
      id: choice.id ?? null,
      text: choice.text,
      isCorrect: choice.isCorrect ? 1 : 0,
      position: choice.position,
    })),
  })

  if (row === null) {
    throw new Error('Practice question could not be saved.')
  }

  await recordAdminAuditLog(database, actor, {
    action: questionId === null ? 'create' : 'update',
    entityType: 'practice_question',
    entityId: row.id,
    metadata: { practiceSetId: parentPracticeSetId },
  })

  return {
    question: mapPracticeQuestion(
      row,
      await listPracticeChoices(database, row.id),
    ),
  }
}

export async function moveAdminPracticeQuestion(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  questionId: number,
  direction: 'up' | 'down',
): Promise<{ moved: boolean }> {
  const question = await findPracticeQuestionById(database, questionId)

  if (question === null) {
    throw notFound('Practice question')
  }

  const moved = await moveOrderedEntity(
    database,
    {
      table: 'practice_questions',
      parentColumn: 'practice_set_id',
      parentId: question.practice_set_id,
      id: question.id,
      position: question.position,
    },
    direction,
  )

  if (moved) {
    await recordAdminAuditLog(database, actor, {
      action: 'reorder',
      entityType: 'practice_question',
      entityId: question.id,
      metadata: { direction },
    })
  }

  return { moved }
}

async function validateQuizPublishReady(
  database: D1Database,
  quiz: AdminQuizRow,
): Promise<void> {
  const questions = await listQuizQuestions(database, quiz.id)
  const activeQuestions = questions.filter(
    (question) => question.status === 'active',
  )

  if (activeQuestions.length === 0) {
    throw new AppError(
      400,
      'PUBLISH_VALIDATION_FAILED',
      'A quiz needs at least one active question before publishing.',
    )
  }

  for (const question of activeQuestions) {
    const choices = await listQuizChoices(database, question.id)

    if (
      choices.length !== 4 ||
      choices.filter((choice) => choice.is_correct === 1).length !== 1 ||
      new Set(choices.map((choice) => choice.choice_text.toLowerCase())).size !==
        choices.length
    ) {
      throw new AppError(
        400,
        'PUBLISH_VALIDATION_FAILED',
        'Each quiz question needs four unique choices and one correct answer.',
      )
    }
  }
}

export async function getAdminQuiz(
  database: D1Database,
  lessonId: number,
): Promise<{ quiz: AdminQuiz | null; questions: AdminQuizQuestion[] }> {
  const quiz = await findQuizByLessonId(database, lessonId)

  if (quiz === null) {
    return { quiz: null, questions: [] }
  }

  const questions = await listQuizQuestions(database, quiz.id)
  const mappedQuestions: AdminQuizQuestion[] = []

  for (const question of questions) {
    mappedQuestions.push(
      mapQuizQuestion(question, await listQuizChoices(database, question.id)),
    )
  }

  return { quiz: mapQuiz(quiz), questions: mappedQuestions }
}

export async function saveAdminQuiz(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  lessonId: number,
  input: QuizInput,
): Promise<{ quiz: AdminQuiz }> {
  const lesson = await findLessonById(database, lessonId)

  if (lesson === null) {
    throw notFound('Lesson')
  }

  const existing = await findQuizByLessonId(database, lessonId)

  if (existing !== null && input.updatedAt !== undefined) {
    assertFresh(existing.updated_at, input.updatedAt)
  }

  const requestedStatus = input.status
  const statusForValidation =
    requestedStatus === 'published' ? 'draft' : requestedStatus
  const archivedStatus = toArchiveAwareRowStatus(statusForValidation)

  let row = await upsertQuizRow(database, {
    lesson_id: lessonId,
    topic_id: lesson.topic_id,
    title: input.title,
    description: input.description,
    quiz_type: input.quizType,
    passing_score: input.passingScore,
    time_limit_minutes: input.timeLimitMinutes ?? null,
    maximum_attempts: input.maximumAttempts ?? null,
    shuffle_questions: input.shuffleQuestions ? 1 : 0,
    shuffle_choices: input.shuffleChoices ? 1 : 0,
    show_explanations: input.showExplanations ? 1 : 0,
    status: archivedStatus.status,
    archived_at: archivedStatus.archived_at,
  })

  if (row === null) {
    throw new Error('Quiz could not be saved.')
  }

  if (requestedStatus === 'published') {
    await validateQuizPublishReady(database, row)

    row = await upsertQuizRow(database, {
      lesson_id: lessonId,
      topic_id: lesson.topic_id,
      title: input.title,
      description: input.description,
      quiz_type: input.quizType,
      passing_score: input.passingScore,
      time_limit_minutes: input.timeLimitMinutes ?? null,
      maximum_attempts: input.maximumAttempts ?? null,
      shuffle_questions: input.shuffleQuestions ? 1 : 0,
      shuffle_choices: input.shuffleChoices ? 1 : 0,
      show_explanations: input.showExplanations ? 1 : 0,
      status: 'published',
      archived_at: null,
    })

    if (row === null) {
      throw new Error('Quiz could not be published.')
    }
  }

  await recordAdminAuditLog(database, actor, {
    action:
      existing === null
        ? 'create'
        : mapArchiveAwareStatus(existing) !== mapArchiveAwareStatus(row)
          ? mapArchiveAwareStatus(row) === 'published'
            ? 'publish'
            : mapArchiveAwareStatus(row) === 'archived'
              ? 'archive'
              : 'unpublish'
          : 'update',
    entityType: 'quiz',
    entityId: row.id,
    metadata: { lessonId },
  })

  return { quiz: mapQuiz(row) }
}

export async function saveAdminQuizQuestion(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  quizId: number,
  questionId: number | null,
  input: QuizQuestionInput,
): Promise<{ question: AdminQuizQuestion }> {
  let parentQuizId = quizId
  if (questionId !== null) {
    const existing = await findQuizQuestionById(database, questionId)

    if (existing === null) {
      throw notFound('Quiz question')
    }

    if (input.updatedAt !== undefined) {
      assertFresh(existing.updated_at, input.updatedAt)
    }

    parentQuizId = existing.quiz_id
  }

  const quiz = await findAdminQuizById(database, parentQuizId)

  if (quiz === null) {
    throw notFound('Quiz')
  }

  if (questionId === null) {
    await shiftPositionsForInsert(database, {
      table: 'questions',
      parentColumn: 'quiz_id',
      parentId: parentQuizId,
      position: input.position,
    })
  }

  const row = await upsertQuizQuestionWithChoices(database, {
    questionId,
    question: {
      quiz_id: parentQuizId,
      question_type: input.questionType,
      prompt: input.prompt,
      explanation: input.explanation,
      points: input.points,
      position: input.position,
      status: input.status,
    },
    choices: input.choices.map((choice) => ({
      id: choice.id ?? null,
      text: choice.text,
      isCorrect: choice.isCorrect ? 1 : 0,
      position: choice.position,
    })),
  })

  if (row === null) {
    throw new Error('Quiz question could not be saved.')
  }

  await recordAdminAuditLog(database, actor, {
    action: questionId === null ? 'create' : 'update',
    entityType: 'quiz_question',
    entityId: row.id,
    metadata: { quizId: parentQuizId },
  })

  return {
    question: mapQuizQuestion(row, await listQuizChoices(database, row.id)),
  }
}

export async function moveAdminQuizQuestion(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  questionId: number,
  direction: 'up' | 'down',
): Promise<{ moved: boolean }> {
  const question = await findQuizQuestionById(database, questionId)

  if (question === null) {
    throw notFound('Quiz question')
  }

  const moved = await moveOrderedEntity(
    database,
    {
      table: 'questions',
      parentColumn: 'quiz_id',
      parentId: question.quiz_id,
      id: question.id,
      position: question.position,
    },
    direction,
  )

  if (moved) {
    await recordAdminAuditLog(database, actor, {
      action: 'reorder',
      entityType: 'quiz_question',
      entityId: question.id,
      metadata: { direction },
    })
  }

  return { moved }
}

export function getSupportedPracticeGenerators(): {
  generators: Array<{
    slug: string
    version: number
    title: string
    supportedDifficulties: readonly string[]
  }>
} {
  return {
    generators: getRegisteredGenerators().map((generator) => ({
      slug: generator.slug,
      version: generator.version,
      title: generator.title,
      supportedDifficulties: generator.supportedDifficulties,
    })),
  }
}

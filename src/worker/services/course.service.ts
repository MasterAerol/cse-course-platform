import {
  findCourseEnrollmentById,
  completeLessonProgress,
  findCourseIdBySlug,
  findLessonBlocks,
  findLessonProgress,
  findPublishedCourseBySlug,
  findPublishedCourseEnrollment,
  findPublishedCourses,
  findPublishedCurriculumLessons,
  findPublishedLessonByPublicId,
  findRequiredLessonProgressRows,
  findStudentPublishedEnrollments,
  findUserIdByEmail,
  startLessonProgress,
  upsertActiveEnrollment,
  type CourseDetailRow,
  type CourseListRow,
  type CurriculumLessonRow,
  type EnrollmentCourseRow,
  type LessonProgressRow,
  type PublishedLessonDetailRow,
  type RequiredLessonProgressRow,
} from '../repositories/course.repository'
import {
  parseLessonBlock,
  type LessonBlock,
} from '../schemas/lesson-block.schemas'
import type { OperationalEnrollmentInput } from '../schemas/course.schemas'
import { AppError } from '../utils/app-error'

export interface EnrollmentState {
  status: string
  accessStartsAt: string
  accessExpiresAt: string | null
  hasAccess: boolean
}

export interface CourseSummary {
  title: string
  slug: string
  shortDescription: string | null
  level: string | null
  thumbnailKey: string | null
  enrollment: EnrollmentState | null
}

export interface CurriculumTopicSummary {
  title: string
  slug: string
  position: number
  publishedLessonCount: number
  lessons: CurriculumLessonSummary[]
}

export interface CurriculumSubjectSummary {
  title: string
  slug: string
  position: number
  topics: CurriculumTopicSummary[]
}

export interface CourseDetail extends CourseSummary {
  description: string | null
  curriculum: CurriculumSubjectSummary[]
}

export interface ContinueLesson {
  publicId: string
  title: string
  slug: string
  lessonType: string
  summary: string | null
  isLocked: boolean
}

export interface ContinueLearningState {
  courseCompleted: boolean
  lesson: ContinueLesson | null
}

export interface CourseProgressState {
  course: CourseSummary
  enrollment: EnrollmentState
  progressPercentage: number
  completedRequiredLessons: number
  totalRequiredLessons: number
  continueLearning: ContinueLearningState
}

export interface StudentDashboardCourse extends CourseProgressState {
  enrolledAt: string
}

export interface StudentDashboard {
  courses: StudentDashboardCourse[]
}

export interface LessonAccessibility {
  canAccess: boolean
  reason:
    | 'active_enrollment'
    | 'preview'
    | 'not_required'
    | 'enrollment_required'
    | 'previous_required_lesson_incomplete'
}

export type PublicLessonProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'

export interface CurriculumLessonSummary {
  publicId: string
  title: string
  slug: string
  lessonType: string
  position: number
  estimatedMinutes: number | null
  isPreview: boolean
  isRequired: boolean
  progressStatus: PublicLessonProgressStatus
  completedAt: string | null
  isAccessible: boolean
  isLocked: boolean
  lockReason: string | null
  accessibility: LessonAccessibility
}

export interface StudentCourseCurriculum {
  course: CourseSummary
  subjects: CurriculumSubjectSummary[]
}

export interface LessonNavigationItem {
  publicId: string
  title: string
  slug: string
  lessonType: string
  estimatedMinutes: number | null
  isAccessible: boolean
  isLocked: boolean
  lockReason: string | null
}

export interface LessonDetail {
  publicId: string
  title: string
  slug: string
  summary: string | null
  lessonType: string
  estimatedMinutes: number | null
  isPreview: boolean
  course: {
    title: string
    slug: string
  }
  subject: {
    title: string
    slug: string
    position: number
  }
  topic: {
    title: string
    slug: string
    position: number
  }
  blocks: LessonBlock[]
  malformedBlockCount: number
  progress: {
    status: PublicLessonProgressStatus
    startedAt: string | null
    completedAt: string | null
    lastViewedAt: string | null
    progressPercent: number
  }
  manualCompletionAllowed: boolean
  previousLesson: LessonNavigationItem | null
  nextLesson: LessonNavigationItem | null
  navigation: {
    currentLessonPublicId: string
    subjectPosition: number
    topicPosition: number
    lessonPosition: number
  }
}

export interface TopicProgress {
  topicSlug: string
  completedRequiredLessons: number
  totalRequiredLessons: number
  progressPercentage: number
}

export interface LessonCompletionResult {
  completedLesson: {
    publicId: string
    title: string
    progress: LessonDetail['progress']
  }
  newlyUnlockedNextLesson: LessonNavigationItem | null
  topicProgress: TopicProgress
  courseProgress: CourseProgressState
}

function mapEnrollment(row: {
  enrollment_status: string | null
  access_starts_at: string | null
  access_expires_at: string | null
  has_active_access: 0 | 1
}): EnrollmentState | null {
  if (row.enrollment_status === null || row.access_starts_at === null) {
    return null
  }

  return {
    status: row.enrollment_status,
    accessStartsAt: row.access_starts_at,
    accessExpiresAt: row.access_expires_at,
    hasAccess: row.has_active_access === 1,
  }
}

function mapCourse(row: CourseListRow | CourseDetailRow): CourseSummary {
  return {
    title: row.title,
    slug: row.slug,
    shortDescription: row.short_description,
    level: row.level,
    thumbnailKey: row.thumbnail_key,
    enrollment: mapEnrollment(row),
  }
}

function mapEnrollmentCourse(row: EnrollmentCourseRow): CourseSummary {
  return {
    title: row.course_title,
    slug: row.course_slug,
    shortDescription: row.short_description,
    level: row.level,
    thumbnailKey: row.thumbnail_key,
    enrollment: {
      status: row.enrollment_status,
      accessStartsAt: row.access_starts_at,
      accessExpiresAt: row.access_expires_at,
      hasAccess: row.has_active_access === 1,
    },
  }
}

function isActiveEnrollment(enrollment: EnrollmentState | null): boolean {
  return enrollment?.hasAccess === true
}

function isRequiredLesson(
  row: Pick<CurriculumLessonRow, 'is_preview'>,
): boolean {
  return row.is_preview === 0
}

function normalizeProgressStatus(
  status: string | null,
): PublicLessonProgressStatus {
  if (status === 'in_progress' || status === 'completed') {
    return status
  }

  return 'not_started'
}

function mapProgress(
  progress: LessonProgressRow | null,
): LessonDetail['progress'] {
  return {
    status: normalizeProgressStatus(progress?.status ?? null),
    startedAt: progress?.started_at ?? null,
    completedAt: progress?.completed_at ?? null,
    lastViewedAt: progress?.last_viewed_at ?? null,
    progressPercent: progress?.progress_percent ?? 0,
  }
}

function getEnrollmentError(enrollment: EnrollmentState | null): AppError {
  if (enrollment === null) {
    return new AppError(
      403,
      'ENROLLMENT_REQUIRED',
      'An active enrollment is required for this course.',
    )
  }

  return new AppError(
    403,
    'COURSE_ACCESS_EXPIRED',
    'This enrollment does not currently grant course access.',
  )
}

function getLockReason(accessibility: LessonAccessibility): string | null {
  if (accessibility.canAccess) {
    return null
  }

  if (accessibility.reason === 'enrollment_required') {
    return 'Active enrollment is required.'
  }

  return 'Complete the previous required lesson to unlock this lesson.'
}

function getLessonAccessibilityFromOrderedRows(
  row: CurriculumLessonRow,
  orderedRows: CurriculumLessonRow[],
  enrollment: EnrollmentState | null,
): LessonAccessibility {
  if (row.is_preview === 1) {
    return { canAccess: true, reason: 'preview' }
  }

  if (!isActiveEnrollment(enrollment)) {
    return { canAccess: false, reason: 'enrollment_required' }
  }

  if (!isRequiredLesson(row)) {
    return { canAccess: true, reason: 'not_required' }
  }

  if (row.requires_previous === 0) {
    return { canAccess: true, reason: 'active_enrollment' }
  }

  const requiredRows = orderedRows.filter(isRequiredLesson)
  const currentIndex = requiredRows.findIndex(
    (candidate) => candidate.lesson_public_id === row.lesson_public_id,
  )

  if (currentIndex <= 0) {
    return { canAccess: true, reason: 'active_enrollment' }
  }

  const previousRequiredLesson = requiredRows[currentIndex - 1]

  if (previousRequiredLesson?.progress_status === 'completed') {
    return { canAccess: true, reason: 'active_enrollment' }
  }

  return {
    canAccess: false,
    reason: 'previous_required_lesson_incomplete',
  }
}

function getLessonAccessibility(
  row: CurriculumLessonRow,
  orderedRows: CurriculumLessonRow[],
  enrollment: EnrollmentState | null,
): LessonAccessibility {
  return getLessonAccessibilityFromOrderedRows(row, orderedRows, enrollment)
}

function mapCurriculum(
  rows: CurriculumLessonRow[],
  enrollment: EnrollmentState | null,
): CurriculumSubjectSummary[] {
  const subjects = new Map<number, CurriculumSubjectSummary>()
  const topics = new Set<string>()

  for (const row of rows) {
    const existingSubject = subjects.get(row.subject_id)

    const subject =
      existingSubject ??
      {
        title: row.subject_title,
        slug: row.subject_slug,
        position: row.subject_position,
        topics: [],
      }

    const topicKey = `${row.subject_id}:${row.topic_id}`
    let topic = subject.topics.find(
      (candidate) => candidate.slug === row.topic_slug,
    )

    if (!topics.has(topicKey) || topic === undefined) {
      topic = {
        title: row.topic_title,
        slug: row.topic_slug,
        position: row.topic_position,
        publishedLessonCount: 0,
        lessons: [],
      }
      subject.topics.push(topic)
      topics.add(topicKey)
    }

    topic.lessons.push({
      publicId: row.lesson_public_id,
      title: row.lesson_title,
      slug: row.lesson_slug,
      lessonType: row.lesson_type,
      position: row.lesson_position,
      estimatedMinutes: row.estimated_minutes,
      isPreview: row.is_preview === 1,
      isRequired: isRequiredLesson(row),
      progressStatus: normalizeProgressStatus(row.progress_status),
      completedAt: row.completed_at,
      isAccessible: getLessonAccessibility(row, rows, enrollment).canAccess,
      isLocked: !getLessonAccessibility(row, rows, enrollment).canAccess,
      lockReason: getLockReason(getLessonAccessibility(row, rows, enrollment)),
      accessibility: getLessonAccessibility(row, rows, enrollment),
    })
    topic.publishedLessonCount = topic.lessons.length

    if (existingSubject === undefined) {
      subjects.set(row.subject_id, subject)
    }
  }

  return Array.from(subjects.values())
}

function calculateProgress(
  rows: RequiredLessonProgressRow[],
): Pick<
  CourseProgressState,
  | 'progressPercentage'
  | 'completedRequiredLessons'
  | 'totalRequiredLessons'
  | 'continueLearning'
> {
  const totalRequiredLessons = rows.length
  const completedRequiredLessons = rows.filter(
    (row) => row.progress_status === 'completed',
  ).length
  const accessibleRows = getAccessibleRequiredProgressRows(rows)
  const inProgressLesson = accessibleRows.find(
    (row) => row.progress_status === 'in_progress',
  )
  const nextIncompleteLesson =
    inProgressLesson ??
    accessibleRows.find((row) => row.progress_status !== 'completed')
  const courseCompleted =
    totalRequiredLessons > 0 &&
    completedRequiredLessons === totalRequiredLessons

  return {
    totalRequiredLessons,
    completedRequiredLessons,
    progressPercentage:
      totalRequiredLessons === 0
        ? 0
        : Math.round(
            (completedRequiredLessons / totalRequiredLessons) * 100,
          ),
    continueLearning: {
      courseCompleted,
      lesson:
        nextIncompleteLesson === undefined || courseCompleted
          ? null
          : {
              title: nextIncompleteLesson.lesson_title,
              publicId: nextIncompleteLesson.lesson_public_id,
              slug: nextIncompleteLesson.lesson_slug,
              lessonType: nextIncompleteLesson.lesson_type,
              summary: nextIncompleteLesson.summary,
              isLocked: false,
            },
    },
  }
}

function getAccessibleRequiredProgressRows(
  rows: RequiredLessonProgressRow[],
): RequiredLessonProgressRow[] {
  return rows.filter((row, index) => {
    if (row.requires_previous === 0 || index === 0) {
      return true
    }

    return rows[index - 1]?.progress_status === 'completed'
  })
}

function calculateTopicProgress(
  rows: RequiredLessonProgressRow[],
  topicSlug: string,
): TopicProgress {
  const topicRows = rows.filter((row) => row.topic_slug === topicSlug)
  const totalRequiredLessons = topicRows.length
  const completedRequiredLessons = topicRows.filter(
    (row) => row.progress_status === 'completed',
  ).length

  return {
    topicSlug,
    totalRequiredLessons,
    completedRequiredLessons,
    progressPercentage:
      totalRequiredLessons === 0
        ? 0
        : Math.round(
            (completedRequiredLessons / totalRequiredLessons) * 100,
          ),
  }
}

function accessDeniedError(): AppError {
  return new AppError(
    403,
    'COURSE_ACCESS_DENIED',
    'You do not have active access to this course.',
  )
}

function mapNavigationLesson(
  row: CurriculumLessonRow | undefined,
  orderedRows: CurriculumLessonRow[],
  enrollment: EnrollmentState | null,
): LessonNavigationItem | null {
  if (row === undefined) {
    return null
  }
  const accessibility = getLessonAccessibilityFromOrderedRows(
    row,
    orderedRows,
    enrollment,
  )

  return {
    publicId: row.lesson_public_id,
    title: row.lesson_title,
    slug: row.lesson_slug,
    lessonType: row.lesson_type,
    estimatedMinutes: row.estimated_minutes,
    isAccessible: accessibility.canAccess,
    isLocked: !accessibility.canAccess,
    lockReason: getLockReason(accessibility),
  }
}

async function getAccessibleLessonContext(
  database: D1Database,
  userId: number,
  lessonPublicId: string,
): Promise<{
  lesson: PublishedLessonDetailRow
  enrollment: EnrollmentState | null
  curriculumRows: CurriculumLessonRow[]
  currentLesson: CurriculumLessonRow
}> {
  const lesson = await findPublishedLessonByPublicId(
    database,
    lessonPublicId,
  )

  if (lesson === null) {
    throw new AppError(
      404,
      'LESSON_NOT_FOUND',
      'The requested lesson was not found.',
    )
  }

  const enrollmentRow = await findCourseEnrollmentById(
    database,
    userId,
    lesson.course_id,
  )
  const enrollment =
    enrollmentRow === null ? null : mapEnrollment(enrollmentRow)

  if (!isActiveEnrollment(enrollment) && lesson.is_preview !== 1) {
    throw getEnrollmentError(enrollment)
  }

  const curriculumRows = await findPublishedCurriculumLessons(
    database,
    lesson.course_id,
    userId,
  )
  const currentLesson = curriculumRows.find(
    (row) => row.lesson_public_id === lessonPublicId,
  )

  if (currentLesson === undefined) {
    throw new AppError(
      404,
      'LESSON_NOT_FOUND',
      'The requested lesson was not found.',
    )
  }

  const accessibility = getLessonAccessibilityFromOrderedRows(
    currentLesson,
    curriculumRows,
    enrollment,
  )

  if (!accessibility.canAccess) {
    throw new AppError(
      403,
      'LESSON_LOCKED',
      'Complete the previous required lesson to unlock this lesson.',
    )
  }

  return {
    lesson,
    enrollment,
    curriculumRows,
    currentLesson,
  }
}

async function buildStudentLessonDetail(
  database: D1Database,
  context: {
    lesson: PublishedLessonDetailRow
    enrollment: EnrollmentState | null
    curriculumRows: CurriculumLessonRow[]
  },
  progress: LessonProgressRow | null,
): Promise<LessonDetail> {
  const { lesson, enrollment, curriculumRows } = context
  const blockRows = await findLessonBlocks(database, lesson.lesson_id)
  const blocks: LessonBlock[] = []
  let malformedBlockCount = 0

  for (const row of blockRows) {
    const result = parseLessonBlock({
      id: row.id,
      blockType: row.block_type,
      contentJson: row.content_json,
      position: row.position,
    })

    if (result.block === null) {
      malformedBlockCount += 1
      console.warn(
        JSON.stringify({
          message: 'Skipping malformed lesson block',
          lessonPublicId: lesson.lesson_public_id,
          blockId: row.id,
          blockType: row.block_type,
        }),
      )
      continue
    }

    blocks.push(result.block)
  }

  const currentIndex = curriculumRows.findIndex(
    (row) => row.lesson_public_id === lesson.lesson_public_id,
  )
  const previousLesson = mapNavigationLesson(
    curriculumRows[currentIndex - 1],
    curriculumRows,
    enrollment,
  )
  const nextLesson = mapNavigationLesson(
    curriculumRows[currentIndex + 1],
    curriculumRows,
    enrollment,
  )

  return {
    publicId: lesson.lesson_public_id,
    title: lesson.lesson_title,
    slug: lesson.lesson_slug,
    summary: lesson.lesson_summary,
    lessonType: lesson.lesson_type,
    estimatedMinutes: lesson.estimated_minutes,
    isPreview: lesson.is_preview === 1,
    course: {
      title: lesson.course_title,
      slug: lesson.course_slug,
    },
    subject: {
      title: lesson.subject_title,
      slug: lesson.subject_slug,
      position: lesson.subject_position,
    },
    topic: {
      title: lesson.topic_title,
      slug: lesson.topic_slug,
      position: lesson.topic_position,
    },
    blocks,
    malformedBlockCount,
    progress: mapProgress(progress),
    manualCompletionAllowed: lesson.lesson_type === 'reading',
    previousLesson,
    nextLesson,
    navigation: {
      currentLessonPublicId: lesson.lesson_public_id,
      subjectPosition: lesson.subject_position,
      topicPosition: lesson.topic_position,
      lessonPosition: lesson.lesson_position,
    },
  }
}

export async function listCourses(
  database: D1Database,
  userId: number | null,
): Promise<{ courses: CourseSummary[] }> {
  const rows = await findPublishedCourses(database, userId)

  return {
    courses: rows.map(mapCourse),
  }
}

export async function getCourseDetail(
  database: D1Database,
  courseSlug: string,
  userId: number | null,
): Promise<CourseDetail> {
  const course = await findPublishedCourseBySlug(
    database,
    courseSlug,
    userId,
  )

  if (course === null) {
    throw new AppError(
      404,
      'COURSE_NOT_FOUND',
      'The requested course was not found.',
    )
  }

  const enrollment = mapEnrollment(course)
  const curriculumRows = await findPublishedCurriculumLessons(
    database,
    course.id,
    userId,
  )

  return {
    ...mapCourse(course),
    description: course.description,
    curriculum: mapCurriculum(curriculumRows, enrollment),
  }
}

export async function getStudentCourseCurriculum(
  database: D1Database,
  userId: number,
  courseSlug: string,
): Promise<StudentCourseCurriculum> {
  const course = await findPublishedCourseBySlug(
    database,
    courseSlug,
    userId,
  )

  if (course === null) {
    throw new AppError(
      404,
      'COURSE_NOT_FOUND',
      'The requested course was not found.',
    )
  }

  const enrollment = mapEnrollment(course)
  const curriculumRows = await findPublishedCurriculumLessons(
    database,
    course.id,
    userId,
  )
  const subjects = mapCurriculum(curriculumRows, enrollment)

  if (
    !isActiveEnrollment(enrollment) &&
    !curriculumRows.some((row) => row.is_preview === 1)
  ) {
    throw accessDeniedError()
  }

  return {
    course: mapCourse(course),
    subjects,
  }
}

export async function getStudentCourseProgress(
  database: D1Database,
  userId: number,
  courseSlug: string,
): Promise<CourseProgressState> {
  const enrollment = await findPublishedCourseEnrollment(
    database,
    userId,
    courseSlug,
  )

  if (enrollment === null) {
    throw accessDeniedError()
  }

  const enrollmentState = mapEnrollmentCourse(enrollment).enrollment

  if (enrollmentState === null || !enrollmentState.hasAccess) {
    throw accessDeniedError()
  }

  const progress = calculateProgress(
    await findRequiredLessonProgressRows(
      database,
      userId,
      enrollment.course_id,
    ),
  )

  return {
    course: mapEnrollmentCourse(enrollment),
    enrollment: enrollmentState,
    ...progress,
  }
}

export async function getStudentLessonDetail(
  database: D1Database,
  userId: number,
  lessonPublicId: string,
): Promise<LessonDetail> {
  const context = await getAccessibleLessonContext(
    database,
    userId,
    lessonPublicId,
  )
  const progress = isActiveEnrollment(context.enrollment)
    ? await startLessonProgress(database, userId, context.lesson.lesson_id)
    : await findLessonProgress(database, userId, context.lesson.lesson_id)

  return buildStudentLessonDetail(database, context, progress)
}

export async function startStudentLesson(
  database: D1Database,
  userId: number,
  lessonPublicId: string,
): Promise<LessonDetail> {
  const context = await getAccessibleLessonContext(
    database,
    userId,
    lessonPublicId,
  )

  if (context.enrollment === null || !context.enrollment.hasAccess) {
    throw getEnrollmentError(context.enrollment)
  }

  const progress = await startLessonProgress(
    database,
    userId,
    context.lesson.lesson_id,
  )

  return buildStudentLessonDetail(database, context, progress)
}

export async function completeStudentLesson(
  database: D1Database,
  userId: number,
  lessonPublicId: string,
): Promise<LessonCompletionResult> {
  const context = await getAccessibleLessonContext(
    database,
    userId,
    lessonPublicId,
  )

  if (context.enrollment === null || !context.enrollment.hasAccess) {
    throw getEnrollmentError(context.enrollment)
  }
  const activeEnrollment = context.enrollment

  if (context.lesson.lesson_type !== 'reading') {
    throw new AppError(
      409,
      'COMPLETION_REQUIRES_ACTIVITY',
      'This lesson type cannot be completed manually.',
    )
  }

  const existingProgress = await findLessonProgress(
    database,
    userId,
    context.lesson.lesson_id,
  )

  if (existingProgress === null) {
    throw new AppError(
      409,
      'LESSON_NOT_STARTED',
      'Start the lesson before marking it complete.',
    )
  }

  const completedProgress = await completeLessonProgress(
    database,
    userId,
    context.lesson.lesson_id,
  )

  if (completedProgress === null) {
    throw new AppError(
      409,
      'LESSON_NOT_STARTED',
      'Start the lesson before marking it complete.',
    )
  }

  const [progressRows, curriculumRows] = await Promise.all([
    findRequiredLessonProgressRows(
      database,
      userId,
      context.lesson.course_id,
    ),
    findPublishedCurriculumLessons(
      database,
      context.lesson.course_id,
      userId,
    ),
  ])
  const currentIndex = curriculumRows.findIndex(
    (row) => row.lesson_public_id === lessonPublicId,
  )
  const nextLesson = mapNavigationLesson(
    curriculumRows[currentIndex + 1],
    curriculumRows,
    context.enrollment,
  )
  const progress = calculateProgress(progressRows)

  return {
    completedLesson: {
      publicId: context.lesson.lesson_public_id,
      title: context.lesson.lesson_title,
      progress: mapProgress(completedProgress),
    },
    newlyUnlockedNextLesson:
      nextLesson === null || nextLesson.isLocked ? null : nextLesson,
    topicProgress: calculateTopicProgress(
      progressRows,
      context.lesson.topic_slug,
    ),
    courseProgress: {
      course: {
        title: context.lesson.course_title,
        slug: context.lesson.course_slug,
        shortDescription: null,
        level: null,
        thumbnailKey: null,
        enrollment: activeEnrollment,
      },
      enrollment: activeEnrollment,
      ...progress,
    },
  }
}

export async function getStudentDashboard(
  database: D1Database,
  userId: number,
): Promise<StudentDashboard> {
  const enrollments = await findStudentPublishedEnrollments(
    database,
    userId,
  )
  const courses = await Promise.all(
    enrollments.map(async (enrollment) => {
      const progress = calculateProgress(
        await findRequiredLessonProgressRows(
          database,
          userId,
          enrollment.course_id,
        ),
      )
      const course = mapEnrollmentCourse(enrollment)
      const enrollmentState = course.enrollment

      if (enrollmentState === null) {
        throw new Error('Enrollment row did not include enrollment state.')
      }

      return {
        course,
        enrollment: enrollmentState,
        enrolledAt: enrollment.enrolled_at,
        ...progress,
        continueLearning: enrollmentState.hasAccess
          ? progress.continueLearning
          : {
              courseCompleted: false,
              lesson: null,
            },
      }
    }),
  )

  return { courses }
}

export async function enrollStudentOperationally(
  database: D1Database,
  input: OperationalEnrollmentInput,
): Promise<{ enrollment: EnrollmentState }> {
  const [user, course] = await Promise.all([
    findUserIdByEmail(database, input.email),
    findCourseIdBySlug(database, input.courseSlug),
  ])

  if (user === null || course === null) {
    throw new AppError(
      404,
      'ENROLLMENT_TARGET_NOT_FOUND',
      'The requested user or course was not found.',
    )
  }

  const enrollment = await upsertActiveEnrollment(database, {
    userId: user.id,
    courseId: course.id,
    accessExpiresAt: input.accessExpiresAt ?? null,
  })

  if (enrollment === null) {
    throw new Error('The enrollment could not be loaded.')
  }

  return {
    enrollment: mapEnrollment(enrollment) as EnrollmentState,
  }
}

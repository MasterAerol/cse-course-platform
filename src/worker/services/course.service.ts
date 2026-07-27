import {
  findCourseEnrollmentById,
  findCourseIdBySlug,
  findLessonBlocks,
  findPublishedCourseBySlug,
  findPublishedCourseEnrollment,
  findPublishedCourses,
  findPublishedCurriculumLessons,
  findPublishedLessonByPublicId,
  findPublishedNavigationLessons,
  findRequiredLessonProgressRows,
  findStudentPublishedEnrollments,
  findUserIdByEmail,
  upsertActiveEnrollment,
  type CourseDetailRow,
  type CourseListRow,
  type CurriculumLessonRow,
  type EnrollmentCourseRow,
  type NavigationLessonRow,
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
  reason: 'active_enrollment' | 'preview' | 'enrollment_required'
}

export interface CurriculumLessonSummary {
  publicId: string
  title: string
  slug: string
  lessonType: string
  position: number
  estimatedMinutes: number | null
  isPreview: boolean
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
  previousLesson: LessonNavigationItem | null
  nextLesson: LessonNavigationItem | null
  navigation: {
    currentLessonPublicId: string
    subjectPosition: number
    topicPosition: number
    lessonPosition: number
  }
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

function getLessonAccessibility(
  row: Pick<CurriculumLessonRow, 'is_preview'>,
  enrollment: EnrollmentState | null,
): LessonAccessibility {
  if (isActiveEnrollment(enrollment)) {
    return { canAccess: true, reason: 'active_enrollment' }
  }

  if (row.is_preview === 1) {
    return { canAccess: true, reason: 'preview' }
  }

  return { canAccess: false, reason: 'enrollment_required' }
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
      accessibility: getLessonAccessibility(row, enrollment),
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
  const inProgressLesson = rows.find(
    (row) => row.progress_status === 'in_progress',
  )
  const nextIncompleteLesson =
    inProgressLesson ??
    rows.find((row) => row.progress_status !== 'completed')
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
            },
    },
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
  row: NavigationLessonRow | undefined,
): LessonNavigationItem | null {
  if (row === undefined) {
    return null
  }

  return {
    publicId: row.lesson_public_id,
    title: row.lesson_title,
    slug: row.lesson_slug,
    lessonType: row.lesson_type,
    estimatedMinutes: row.estimated_minutes,
  }
}

function assertLessonAccess(
  enrollment: EnrollmentState | null,
  isPreview: boolean,
): void {
  if (isActiveEnrollment(enrollment) || isPreview) {
    return
  }

  throw accessDeniedError()
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

  assertLessonAccess(enrollment, lesson.is_preview === 1)

  const [blockRows, navigationRows] = await Promise.all([
    findLessonBlocks(database, lesson.lesson_id),
    findPublishedNavigationLessons(database, lesson.course_id),
  ])
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
          lessonPublicId,
          blockId: row.id,
          blockType: row.block_type,
        }),
      )
      continue
    }

    blocks.push(result.block)
  }

  const currentIndex = navigationRows.findIndex(
    (row) => row.lesson_public_id === lessonPublicId,
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
    previousLesson: mapNavigationLesson(navigationRows[currentIndex - 1]),
    nextLesson: mapNavigationLesson(navigationRows[currentIndex + 1]),
    navigation: {
      currentLessonPublicId: lesson.lesson_public_id,
      subjectPosition: lesson.subject_position,
      topicPosition: lesson.topic_position,
      lessonPosition: lesson.lesson_position,
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

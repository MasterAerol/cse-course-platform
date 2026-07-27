import {
  findCourseIdBySlug,
  findPublishedCourseBySlug,
  findPublishedCourseEnrollment,
  findPublishedCourses,
  findPublishedCurriculumSummary,
  findRequiredLessonProgressRows,
  findStudentPublishedEnrollments,
  findUserIdByEmail,
  upsertActiveEnrollment,
  type CourseDetailRow,
  type CourseListRow,
  type CurriculumSummaryRow,
  type EnrollmentCourseRow,
  type RequiredLessonProgressRow,
} from '../repositories/course.repository'
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

function mapCurriculum(
  rows: CurriculumSummaryRow[],
): CurriculumSubjectSummary[] {
  const subjects = new Map<number, CurriculumSubjectSummary>()

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

    subject.topics.push({
      title: row.topic_title,
      slug: row.topic_slug,
      position: row.topic_position,
      publishedLessonCount: row.published_lesson_count,
    })

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

  const curriculumRows = await findPublishedCurriculumSummary(
    database,
    course.id,
  )

  return {
    ...mapCourse(course),
    description: course.description,
    curriculum: mapCurriculum(curriculumRows),
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

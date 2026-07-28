import {
  findCourseIdBySlug,
  findUserIdByEmail,
  upsertActiveEnrollment,
  type CourseDetailRow,
  type CourseListRow,
  type EnrollmentCourseRow,
} from '../repositories/course.repository'
import type { OperationalEnrollmentInput } from '../schemas/course.schemas'
import { AppError } from '../utils/app-error'
import type { CourseSummary, EnrollmentState } from './course.types'

export function mapEnrollment(row: {
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

export function mapCourse(
  row: CourseListRow | CourseDetailRow,
): CourseSummary {
  return {
    title: row.title,
    slug: row.slug,
    shortDescription: row.short_description,
    level: row.level,
    thumbnailKey: row.thumbnail_key,
    enrollment: mapEnrollment(row),
  }
}

export function mapEnrollmentCourse(
  row: EnrollmentCourseRow,
): CourseSummary {
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

export function isActiveEnrollment(
  enrollment: EnrollmentState | null,
): boolean {
  return enrollment?.hasAccess === true
}

export function getEnrollmentError(
  enrollment: EnrollmentState | null,
): AppError {
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

export function accessDeniedError(): AppError {
  return new AppError(
    403,
    'COURSE_ACCESS_DENIED',
    'You do not have active access to this course.',
  )
}

export function assertActiveEnrollment(
  enrollment: EnrollmentState | null,
): asserts enrollment is EnrollmentState {
  if (!isActiveEnrollment(enrollment)) {
    throw getEnrollmentError(enrollment)
  }
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

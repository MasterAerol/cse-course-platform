import {
  FREE_PREVIEW_LESSON_COUNT,
  PREMIUM_LOCK_COPY,
} from '../domain/commercial-access'
import {
  findCourseEnrollmentById,
  findPublishedCurriculumLessons,
  findPublishedLessonByPublicId,
  type CurriculumLessonRow,
  type PublishedLessonDetailRow,
} from '../repositories/course.repository'
import { AppError } from '../utils/app-error'
import { getLearnerCommercialAccess } from './commercial.service'
import type { EnrollmentState, LessonAccessibility } from './course.types'
import {
  getEnrollmentError,
  isActiveEnrollment,
  mapEnrollment,
} from './enrollment.service'

export interface AccessibleLessonContext {
  lesson: PublishedLessonDetailRow
  enrollment: EnrollmentState | null
  curriculumRows: CurriculumLessonRow[]
  hasCommercialAccess: boolean
  currentLesson: CurriculumLessonRow
}

export function isRequiredLesson(
  row: Pick<CurriculumLessonRow, 'is_preview'>,
): boolean {
  return row.is_preview === 0
}

export function getLockReason(
  accessibility: LessonAccessibility,
): string | null {
  if (accessibility.canAccess) {
    return null
  }

  if (accessibility.reason === 'enrollment_required') {
    return 'Active enrollment is required.'
  }

  if (accessibility.reason === 'commercial_premium_required') {
    return `${PREMIUM_LOCK_COPY.badge} — ${PREMIUM_LOCK_COPY.message}`
  }

  return 'Complete the previous required lesson to unlock this lesson.'
}

export function getLessonAccessibilityFromOrderedRows(
  row: CurriculumLessonRow,
  orderedRows: CurriculumLessonRow[],
  enrollment: EnrollmentState | null,
  hasCommercialAccess = true,
): LessonAccessibility {
  if (row.is_preview === 1) {
    return { canAccess: true, reason: 'preview' }
  }

  if (!isActiveEnrollment(enrollment)) {
    return { canAccess: false, reason: 'enrollment_required' }
  }

  const normalProgressionIndex = orderedRows.findIndex(
    (candidate) => candidate.lesson_public_id === row.lesson_public_id,
  )
  const isFreePreviewLesson =
    normalProgressionIndex >= 0 &&
    normalProgressionIndex < FREE_PREVIEW_LESSON_COUNT
  if (!hasCommercialAccess && !isFreePreviewLesson) {
    return { canAccess: false, reason: 'commercial_premium_required' }
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

export function getLessonAccessibility(
  row: CurriculumLessonRow,
  orderedRows: CurriculumLessonRow[],
  enrollment: EnrollmentState | null,
  hasCommercialAccess = true,
): LessonAccessibility {
  return getLessonAccessibilityFromOrderedRows(
    row,
    orderedRows,
    enrollment,
    hasCommercialAccess,
  )
}

export async function getAccessibleLessonContext(
  database: D1Database,
  userId: number,
  lessonPublicId: string,
): Promise<AccessibleLessonContext> {
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

  const commercialAccess = await getLearnerCommercialAccess(database, userId)
  const accessibility = getLessonAccessibilityFromOrderedRows(
    currentLesson,
    curriculumRows,
    enrollment,
    commercialAccess.features.full_curriculum,
  )

  if (!accessibility.canAccess) {
    const commercialLock =
      accessibility.reason === 'commercial_premium_required'
    throw new AppError(
      403,
      commercialLock ? 'PREMIUM_ACCESS_REQUIRED' : 'LESSON_LOCKED',
      commercialLock
        ? PREMIUM_LOCK_COPY.message
        : 'Complete the previous required lesson to unlock this lesson.',
    )
  }

  return {
    lesson,
    enrollment,
    curriculumRows,
    currentLesson,
    hasCommercialAccess: commercialAccess.features.full_curriculum,
  }
}

export function assertManualCompletionAllowed(
  lesson: Pick<PublishedLessonDetailRow, 'lesson_type'>,
): void {
  if (lesson.lesson_type === 'reading') {
    return
  }

  throw new AppError(
    409,
    'COMPLETION_REQUIRES_ACTIVITY',
    'This lesson type cannot be completed manually.',
  )
}

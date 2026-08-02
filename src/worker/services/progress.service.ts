import {
  calculateProgress,
  calculateTopicProgress,
  mapProgress,
} from '../domain/progress-calculation'
import {
  completeLessonProgress,
  findLessonProgress,
  findPublishedCourseEnrollment,
  findPublishedCurriculumLessons,
  findRequiredLessonProgressRows,
  findStudentPublishedEnrollments,
  startLessonProgress,
} from '../repositories/course.repository'
import { AppError } from '../utils/app-error'
import type {
  CourseProgressState,
  LessonCompletionResult,
  LessonDetail,
  StudentDashboard,
} from './course.types'
import {
  buildStudentLessonDetail,
  mapNavigationLesson,
} from './curriculum.service'
import {
  accessDeniedError,
  assertActiveEnrollment,
  isActiveEnrollment,
  mapEnrollmentCourse,
} from './enrollment.service'
import {
  assertManualCompletionAllowed,
  type AccessibleLessonContext,
  getAccessibleLessonContext,
} from './lesson-access.service'
import { getDashboardSubjectAssessment } from './subject-assessment.service'

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

  assertActiveEnrollment(context.enrollment)

  const progress = await startLessonProgress(
    database,
    userId,
    context.lesson.lesson_id,
  )

  return buildStudentLessonDetail(database, context, progress)
}

export async function startActivityLesson(
  database: D1Database,
  userId: number,
  context: AccessibleLessonContext,
): Promise<void> {
  assertActiveEnrollment(context.enrollment)
  await startLessonProgress(database, userId, context.lesson.lesson_id)
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

  assertActiveEnrollment(context.enrollment)
  assertManualCompletionAllowed(context.lesson)

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

  const completion = await buildActivityCompletionState(
    database,
    userId,
    context,
    lessonPublicId,
  )

  return {
    completedLesson: {
      publicId: context.lesson.lesson_public_id,
      title: context.lesson.lesson_title,
      progress: mapProgress(completedProgress),
    },
    ...completion,
  }
}

export async function completeActivityLesson(
  database: D1Database,
  userId: number,
  context: AccessibleLessonContext,
): Promise<LessonCompletionResult> {
  assertActiveEnrollment(context.enrollment)
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

  const completion = await buildActivityCompletionState(
    database,
    userId,
    context,
    context.lesson.lesson_public_id,
  )

  return {
    completedLesson: {
      publicId: context.lesson.lesson_public_id,
      title: context.lesson.lesson_title,
      progress: mapProgress(completedProgress),
    },
    ...completion,
  }
}

async function buildActivityCompletionState(
  database: D1Database,
  userId: number,
  context: AccessibleLessonContext,
  lessonPublicId: string,
): Promise<Omit<LessonCompletionResult, 'completedLesson'>> {
  assertActiveEnrollment(context.enrollment)
  const activeEnrollment = context.enrollment
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
    activeEnrollment,
  )
  const progress = calculateProgress(progressRows)

  return {
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
        subjectAssessment: enrollmentState.hasAccess
          ? await getDashboardSubjectAssessment(database, userId, enrollment.course_id)
          : null,
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

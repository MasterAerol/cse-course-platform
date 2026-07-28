import {
  findPublishedCourseBySlug,
  findPublishedCourses,
  findPublishedCurriculumLessons,
} from '../repositories/course.repository'
import { AppError } from '../utils/app-error'
import { mapCurriculum } from './curriculum.service'
import { mapCourse, mapEnrollment } from './enrollment.service'
import type { CourseDetail, CourseSummary } from './course.types'

export type {
  CourseDetail,
  CourseProgressState,
  CourseSummary,
  CurriculumLessonSummary,
  CurriculumSubjectSummary,
  CurriculumTopicSummary,
  EnrollmentState,
  LessonAccessibility,
  LessonCompletionResult,
  LessonDetail,
  LessonNavigationItem,
  PublicLessonProgressStatus,
  StudentCourseCurriculum,
  StudentDashboard,
  StudentDashboardCourse,
  TopicProgress,
} from './course.types'
export { getStudentCourseCurriculum } from './curriculum.service'
export { enrollStudentOperationally } from './enrollment.service'
export {
  completeStudentLesson,
  getStudentCourseProgress,
  getStudentDashboard,
  getStudentLessonDetail,
  startStudentLesson,
} from './progress.service'

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

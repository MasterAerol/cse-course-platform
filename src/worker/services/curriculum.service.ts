import { mapProgress, normalizeProgressStatus } from '../domain/progress-calculation'
import {
  findLessonBlocks,
  findPublishedCourseBySlug,
  findPublishedCurriculumLessons,
  type CurriculumLessonRow,
  type LessonProgressRow,
  type PublishedLessonDetailRow,
} from '../repositories/course.repository'
import {
  parseLessonBlock,
  type LessonBlock,
} from '../schemas/lesson-block.schemas'
import { AppError } from '../utils/app-error'
import type {
  CurriculumSubjectSummary,
  EnrollmentState,
  LessonDetail,
  LessonNavigationItem,
  StudentCourseCurriculum,
} from './course.types'
import {
  accessDeniedError,
  isActiveEnrollment,
  mapCourse,
  mapEnrollment,
} from './enrollment.service'
import {
  getLessonAccessibility,
  getLessonAccessibilityFromOrderedRows,
  getLockReason,
  isRequiredLesson,
} from './lesson-access.service'

export function mapCurriculum(
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

    const accessibility = getLessonAccessibility(row, rows, enrollment)

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
      isAccessible: accessibility.canAccess,
      isLocked: !accessibility.canAccess,
      lockReason: getLockReason(accessibility),
      accessibility,
    })
    topic.publishedLessonCount = topic.lessons.length

    if (existingSubject === undefined) {
      subjects.set(row.subject_id, subject)
    }
  }

  return Array.from(subjects.values())
}

export function mapNavigationLesson(
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

export async function buildStudentLessonDetail(
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

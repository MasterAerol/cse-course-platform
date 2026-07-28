import type {
  LessonProgressRow,
  RequiredLessonProgressRow,
} from '../repositories/course.repository'
import type {
  CourseProgressState,
  LessonProgressState,
  PublicLessonProgressStatus,
  TopicProgress,
} from '../services/course.types'

export function normalizeProgressStatus(
  status: string | null,
): PublicLessonProgressStatus {
  if (status === 'in_progress' || status === 'completed') {
    return status
  }

  return 'not_started'
}

export function mapProgress(
  progress: LessonProgressRow | null,
): LessonProgressState {
  return {
    status: normalizeProgressStatus(progress?.status ?? null),
    startedAt: progress?.started_at ?? null,
    completedAt: progress?.completed_at ?? null,
    lastViewedAt: progress?.last_viewed_at ?? null,
    progressPercent: progress?.progress_percent ?? 0,
  }
}

export function calculateProgress(
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

export function calculateTopicProgress(
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

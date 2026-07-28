import { Link } from 'react-router'

import type { CurriculumLesson } from '../lib/api'

interface CurriculumLessonItemProps {
  courseSlug: string
  lesson: CurriculumLesson
  currentLessonPublicId?: string
  compact?: boolean
}

export function CurriculumLessonItem({
  courseSlug,
  lesson,
  currentLessonPublicId,
  compact = false,
}: CurriculumLessonItemProps) {
  const isCurrent = lesson.publicId === currentLessonPublicId
  const progressLabel =
    lesson.progressStatus === 'completed'
      ? 'Completed'
      : lesson.progressStatus === 'in_progress'
        ? 'In progress'
        : null
  const content = (
    <>
      <span className="lesson-item__title">{lesson.title}</span>
      <span className="lesson-item__meta">
        {lesson.lessonType}
        {lesson.estimatedMinutes !== null
          ? ` - ${lesson.estimatedMinutes} min`
          : ''}
        {lesson.isPreview ? ' - Preview' : ''}
        {!lesson.isRequired ? ' - Optional' : ''}
      </span>
    </>
  )

  if (lesson.isLocked) {
    return (
      <li
        className={`lesson-item lesson-item--locked ${
          compact ? 'lesson-item--compact' : ''
        }`}
      >
        {content}
        <span className="lesson-item__state">
          Locked
          {lesson.lockReason === null ? '' : ` - ${lesson.lockReason}`}
        </span>
      </li>
    )
  }

  return (
    <li
      className={`lesson-item ${isCurrent ? 'lesson-item--current' : ''} ${
        compact ? 'lesson-item--compact' : ''
      }`}
    >
      <Link
        to={`/courses/${courseSlug}/lessons/${lesson.publicId}`}
        aria-current={isCurrent ? 'page' : undefined}
      >
        {content}
      </Link>
      {progressLabel !== null && (
        <span className="lesson-item__state">{progressLabel}</span>
      )}
    </li>
  )
}

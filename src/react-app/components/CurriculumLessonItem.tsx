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
  const content = (
    <>
      <span className="lesson-item__title">{lesson.title}</span>
      <span className="lesson-item__meta">
        {lesson.lessonType}
        {lesson.estimatedMinutes !== null
          ? ` • ${lesson.estimatedMinutes} min`
          : ''}
        {lesson.isPreview ? ' • Preview' : ''}
      </span>
    </>
  )

  if (!lesson.accessibility.canAccess) {
    return (
      <li
        className={`lesson-item lesson-item--locked ${
          compact ? 'lesson-item--compact' : ''
        }`}
      >
        {content}
        <span className="lesson-item__state">Enrollment required</span>
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
    </li>
  )
}

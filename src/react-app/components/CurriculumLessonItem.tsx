import { Link } from 'react-router'

import type { CurriculumLesson } from '../lib/curriculum.types'

interface CurriculumLessonItemProps {
  courseSlug: string
  lesson: CurriculumLesson
  currentLessonPublicId?: string
  compact?: boolean
  onNavigate?: () => void
}

export function CurriculumLessonItem({
  courseSlug,
  lesson,
  currentLessonPublicId,
  compact = false,
  onNavigate,
}: CurriculumLessonItemProps) {
  const isCurrent = lesson.publicId === currentLessonPublicId
  const progressLabel =
    lesson.progressStatus === 'completed'
      ? 'Completed'
      : lesson.progressStatus === 'in_progress'
        ? 'In progress'
        : 'Not started'
  const itemStateClass =
    lesson.progressStatus === 'completed'
      ? 'lesson-item__status--completed'
      : lesson.progressStatus === 'in_progress'
        ? 'lesson-item__status--in-progress'
        : 'lesson-item__status--pending'
  const metaParts = [lesson.lessonType]

  if (lesson.estimatedMinutes !== null) {
    metaParts.push(`${lesson.estimatedMinutes} min`)
  }

  if (lesson.isPreview) {
    metaParts.push('Preview')
  }

  if (!lesson.isRequired) {
    metaParts.push('Optional')
  }

  const metadata = metaParts.join(' · ')

  if (lesson.isLocked) {
    const lockLabel =
      lesson.lockReason === null
        ? 'Locked'
        : `Locked - ${lesson.lockReason}`

    return (
      <li
        className={`lesson-item lesson-item--locked ${
          compact ? 'lesson-item--compact' : ''
        }`}
      >
        <span className="lesson-item__body">
          <span className="lesson-item__title">{lesson.title}</span>
          <span className="lesson-item__meta">{metadata}</span>
        </span>
        <span className="lesson-item__status lesson-item__status--locked">{lockLabel}</span>
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
        className="lesson-item__body"
        to={`/courses/${courseSlug}/lessons/${lesson.publicId}`}
        aria-current={isCurrent ? 'page' : undefined}
        onClick={() => {
          onNavigate?.()
        }}
      >
        <span>
          <span className="lesson-item__title">{lesson.title}</span>
          <span className="lesson-item__meta">{metadata}</span>
        </span>
        <span
          className={`lesson-item__status ${itemStateClass}${
            isCurrent ? ' lesson-item__status--current' : ''
          }`}
        >
          {isCurrent ? 'Current' : progressLabel}
        </span>
      </Link>
    </li>
  )
}
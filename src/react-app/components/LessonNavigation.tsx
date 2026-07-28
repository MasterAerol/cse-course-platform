import { Link } from 'react-router'

import type { LessonDetail } from '../lib/api'

interface LessonNavigationProps {
  courseSlug: string
  previousLesson: LessonDetail['previousLesson']
  nextLesson: LessonDetail['nextLesson']
}

export function LessonNavigation({
  courseSlug,
  previousLesson,
  nextLesson,
}: LessonNavigationProps) {
  const previousLink =
    previousLesson === null ? (
      <span className="lesson-navigation__placeholder">First lesson</span>
    ) : previousLesson.isLocked ? (
      <span className="button-link button-link--secondary button-link--disabled">
        Previous locked
      </span>
    ) : (
      <Link
        className="button-link button-link--secondary"
        to={`/courses/${courseSlug}/lessons/${previousLesson.publicId}`}
      >
        Previous: {previousLesson.title}
      </Link>
    )
  const nextLink =
    nextLesson === null ? (
      <span className="lesson-navigation__placeholder">Last lesson</span>
    ) : nextLesson.isLocked ? (
      <span
        className="button-link button-link--disabled"
        title={nextLesson.lockReason ?? undefined}
      >
        Next locked
      </span>
    ) : (
      <Link
        className="button-link"
        to={`/courses/${courseSlug}/lessons/${nextLesson.publicId}`}
      >
        Next: {nextLesson.title}
      </Link>
    )

  return (
    <nav className="lesson-navigation" aria-label="Lesson navigation">
      {previousLink}
      {nextLink}
    </nav>
  )
}

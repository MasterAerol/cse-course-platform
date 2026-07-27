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
  return (
    <nav className="lesson-navigation" aria-label="Lesson navigation">
      {previousLesson === null ? (
        <span className="lesson-navigation__placeholder">First lesson</span>
      ) : (
        <Link
          className="button-link button-link--secondary"
          to={`/courses/${courseSlug}/lessons/${previousLesson.publicId}`}
        >
          Previous: {previousLesson.title}
        </Link>
      )}

      {nextLesson === null ? (
        <span className="lesson-navigation__placeholder">Last lesson</span>
      ) : (
        <Link
          className="button-link"
          to={`/courses/${courseSlug}/lessons/${nextLesson.publicId}`}
        >
          Next: {nextLesson.title}
        </Link>
      )}
    </nav>
  )
}

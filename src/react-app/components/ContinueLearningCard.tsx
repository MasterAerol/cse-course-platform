import { Link } from 'react-router'

import type { CourseProgress } from '../lib/api'

interface ContinueLearningCardProps {
  progress: Pick<
    CourseProgress,
    | 'course'
    | 'continueLearning'
    | 'completedRequiredLessons'
    | 'totalRequiredLessons'
  >
}

export function ContinueLearningCard({
  progress,
}: ContinueLearningCardProps) {
  if (progress.continueLearning.courseCompleted) {
    return (
      <section className="continue-card">
        <p className="eyebrow">Continue Learning</p>
        <h2>{progress.course.title}</h2>
        <p>Course completed. Nice work.</p>
      </section>
    )
  }

  if (progress.continueLearning.lesson === null) {
    return (
      <section className="continue-card">
        <p className="eyebrow">Continue Learning</p>
        <h2>{progress.course.title}</h2>
        <p>No available lesson is ready yet.</p>
      </section>
    )
  }

  return (
    <section className="continue-card">
      <p className="eyebrow">Continue Learning</p>
      <h2>{progress.continueLearning.lesson.title}</h2>
      <p>{progress.continueLearning.lesson.summary}</p>
      <p className="meta-copy">
        {progress.completedRequiredLessons} of {progress.totalRequiredLessons}{' '}
        required lessons complete
      </p>
      <Link
        className="button-link"
        to={`/courses/${progress.course.slug}`}
      >
        Open course
      </Link>
    </section>
  )
}

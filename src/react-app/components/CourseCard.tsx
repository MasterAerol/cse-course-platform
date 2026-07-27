import { Link } from 'react-router'

import type { CourseSummary } from '../lib/api'
import { EnrollmentBadge } from './EnrollmentBadge'

interface CourseCardProps {
  course: CourseSummary
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <article className="course-card">
      <div>
        <div className="card-heading-row">
          <p className="eyebrow">{course.level ?? 'Course'}</p>
          <EnrollmentBadge enrollment={course.enrollment} />
        </div>
        <h2>{course.title}</h2>
        <p>{course.shortDescription ?? 'Course summary coming soon.'}</p>
      </div>

      <Link className="button-link button-link--secondary" to={`/courses/${course.slug}`}>
        View course
      </Link>
    </article>
  )
}

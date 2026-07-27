import type { CourseSummary } from '../lib/api'

interface EnrollmentBadgeProps {
  enrollment: CourseSummary['enrollment']
}

export function EnrollmentBadge({ enrollment }: EnrollmentBadgeProps) {
  if (enrollment === null) {
    return <span className="badge badge--muted">Not enrolled</span>
  }

  const label = enrollment.hasAccess
    ? 'Active'
    : enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)

  return (
    <span
      className={`badge ${
        enrollment.hasAccess ? 'badge--active' : 'badge--muted'
      }`}
    >
      {label}
    </span>
  )
}

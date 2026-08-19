import { Link } from 'react-router'

import type { SubjectAssessmentCardSummary } from './subject-assessment-card.types'

function getSubjectAssessmentAction(
  assessment: SubjectAssessmentCardSummary,
): 'Start Assessment' | 'Resume Assessment' | 'Retake Assessment' | 'Review Result' | 'Unavailable' {
  if (!assessment.availability.available) return 'Unavailable'
  if (assessment.state === 'in_progress') return 'Resume Assessment'
  if (assessment.state === 'passed') return 'Review Result'
  if (assessment.state === 'needs_improvement') return 'Retake Assessment'
  return 'Start Assessment'
}

function getSubjectAssessmentStatus(summary: SubjectAssessmentCardSummary): string {
  if (summary.state === 'not_started') return 'Not Started'
  if (summary.state === 'in_progress') return 'In Progress'
  if (summary.state === 'passed') return 'Passed'
  return 'Needs Improvement'
}

export function SubjectAssessmentCard({ summary }: { summary: SubjectAssessmentCardSummary }) {
  const action = getSubjectAssessmentAction(summary)
  const latestSubmitted = summary.history.find((attempt) => attempt.status === 'submitted')
  const href =
    summary.state === 'in_progress' && summary.inProgressAttemptPublicId !== null
      ? `/assessment-attempts/${summary.inProgressAttemptPublicId}`
      : summary.state === 'passed' && latestSubmitted !== undefined
        ? `/assessment-attempts/${latestSubmitted.attemptPublicId}/review`
      : `/assessments/${summary.assessment.slug}`

  return (
    <section
      className={`continue-card course-detail-assessment-card assessment-card--${summary.state}${
        summary.availability.available ? '' : ' continue-card--muted'
      }`}
    >
      <div className="assessment-card__heading">
        <p className="eyebrow">Subject milestone</p>
        <span className={`assessment-status assessment-status--${summary.state}`}>
          {getSubjectAssessmentStatus(summary)}
        </span>
      </div>
      <h3>{summary.assessment.title}</h3>
      {summary.assessment.description !== null && <p>{summary.assessment.description}</p>}
      <div className="assessment-card__facts" aria-label="Assessment details">
        <span>{summary.assessment.questionCount} questions</span>
        <span>{summary.assessment.passingScore}% passing score</span>
        <span>
          {summary.assessment.timeLimitMinutes === null
            ? 'No time limit'
            : `${summary.assessment.timeLimitMinutes} minutes`}
        </span>
      </div>
      {summary.bestScore !== null && (
        <p className="meta-copy assessment-card__best">
          Best score <strong>{summary.bestScore}%</strong>
        </p>
      )}
      {summary.availability.available ? (
        <div className="topbar-actions assessment-card__actions">
          <Link className="button-link" to={href}>{action}</Link>
          {latestSubmitted !== undefined && summary.state !== 'passed' && (
            <Link
              className="button-link button-link--secondary"
              to={`/assessment-attempts/${latestSubmitted.attemptPublicId}/review`}
            >
              Review
            </Link>
          )}
        </div>
      ) : (
        <p className="meta-copy">
          Locked: {summary.availability.reason ?? 'This assessment is unavailable.'}
        </p>
      )}
    </section>
  )
}
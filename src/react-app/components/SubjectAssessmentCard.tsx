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
    <section className={`continue-card assessment-card${summary.availability.available ? '' : ' continue-card--muted'}`}>
      <p className="eyebrow">Subject assessment</p>
      <h3>{summary.assessment.title}</h3>
      {summary.assessment.description !== null && <p>{summary.assessment.description}</p>}
      <p>{summary.assessment.questionCount} questions · {summary.assessment.passingScore}% passing score · {summary.assessment.timeLimitMinutes === null ? 'No time limit' : `${summary.assessment.timeLimitMinutes} minutes`}</p>
      <p className="meta-copy">
        Status: {summary.state === 'not_started' ? 'Not Started' : summary.state === 'in_progress' ? 'In Progress' : summary.state === 'passed' ? 'Passed' : 'Needs Improvement'}
        {summary.bestScore === null ? '' : ` · Best ${summary.bestScore}%`}
      </p>
      {summary.availability.available ? (
        <div className="topbar-actions">
          <Link className="button-link" to={href}>{action}</Link>
          {latestSubmitted !== undefined && summary.state !== 'passed' && (
            <Link className="button-link button-link--secondary" to={`/assessment-attempts/${latestSubmitted.attemptPublicId}/review`}>Review</Link>
          )}
        </div>
      ) : (
        <p className="meta-copy">Locked: {summary.availability.reason ?? 'This assessment is unavailable.'}</p>
      )}
    </section>
  )
}

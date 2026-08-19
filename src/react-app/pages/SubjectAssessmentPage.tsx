import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import { fetchSubjectAssessment, startSubjectAssessment, type SubjectAssessmentSummary } from '../lib/api'

export function SubjectAssessmentPage() {
  const { assessmentSlug = '' } = useParams()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<SubjectAssessmentSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchSubjectAssessment(assessmentSlug, controller.signal)
      .then(setSummary)
      .catch((value: unknown) => {
        if (!controller.signal.aborted) setError(value instanceof Error ? value.message : 'Assessment could not be loaded.')
      })
    return () => controller.abort()
  }, [assessmentSlug])

  async function begin(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const data = await startSubjectAssessment(assessmentSlug)
      await navigate(`/assessment-attempts/${data.attempt.publicId}`)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Attempt could not be started.')
    } finally {
      setBusy(false)
    }
  }

  if (error !== null) {
    return (
      <main className='dashboard-page'>
        <LearnerTopbar showSignOut>
          <Link className='button-link button-link--secondary' to='/dashboard'>
            Dashboard
          </Link>
        </LearnerTopbar>
        <p className='form-error' role='alert'>{error}</p>
      </main>
    )
  }

  if (summary === null) {
    return <PasaWisePageLoader label="Preparing your assessment…" />
  }

  const passingTarget = Math.ceil(
    (summary.assessment.questionCount * summary.assessment.passingScore) / 100,
  )
  const hasPerformanceSummary =
    summary.attemptCount > 0 &&
    summary.latestScore !== null &&
    summary.bestScore !== null

  return (
    <main className='dashboard-page subject-assessment-page'>
      <LearnerTopbar showSignOut>
        <Link className='button-link button-link--secondary' to='/dashboard'>
          Dashboard
        </Link>
      </LearnerTopbar>

      <section className='dashboard-card assessment-overview'>
        <div className='assessment-overview__grid'>
          <div className='assessment-overview__details'>
            <p className='eyebrow'>{summary.assessment.subjectTitle}</p>
            <h1>{summary.assessment.title}</h1>
            {summary.assessment.description !== null ? (
              <p className='assessment-overview__description'>{summary.assessment.description}</p>
            ) : null}
            <div className='assessment-facts' aria-label='Assessment details'>
              <span>{summary.assessment.questionCount} questions</span>
              <span>{summary.assessment.questionCount} points</span>
              <span>
                Pass {passingTarget}/{summary.assessment.questionCount} ({summary.assessment.passingScore}%)
              </span>
              <span>
                {summary.assessment.timeLimitMinutes === null
                  ? 'No time limit'
                  : `${summary.assessment.timeLimitMinutes} minute limit`}
              </span>
            </div>
            <p
              className={`assessment-availability assessment-availability--${summary.availability.available ? 'available' : 'unavailable'}`}
            >
              {summary.availability.available
                ? 'Eligible to take this assessment'
                : summary.availability.reason}
            </p>
            <div className='assessment-overview__action'>
              {summary.inProgressAttemptPublicId !== null ? (
                <Link className='button-link' to={`/assessment-attempts/${summary.inProgressAttemptPublicId}`}>
                  Resume Active Attempt
                </Link>
              ) : (
                <button
                  type='button'
                  disabled={busy || !summary.availability.available}
                  onClick={() => void begin()}
                >
                  {busy
                    ? 'Preparing…'
                    : summary.attemptCount > 0
                      ? 'Retake Assessment'
                      : 'Start Assessment'}
                </button>
              )}
            </div>
          </div>

          {hasPerformanceSummary ? (
            <aside className='assessment-performance' aria-labelledby='assessment-performance-title'>
              <h2 id='assessment-performance-title'>Your performance</h2>
              <dl className='assessment-performance__metrics'>
                <div>
                  <dt>Latest score</dt>
                  <dd>{summary.latestScore}%</dd>
                </div>
                <div className='assessment-performance__best'>
                  <dt>Best score</dt>
                  <dd>{summary.bestScore}%</dd>
                </div>
                <div>
                  <dt>Attempts</dt>
                  <dd>{summary.attemptCount}</dd>
                </div>
              </dl>
            </aside>
          ) : null}
        </div>
      </section>

      <AssessmentHistory summary={summary} />
    </main>
  )
}

function AssessmentHistory({ summary }: { summary: SubjectAssessmentSummary }) {
  if (summary.history.length === 0) return null

  return (
    <section className='dashboard-card assessment-history-section'>
      <div className='assessment-history-section__heading'>
        <div>
          <p className='eyebrow'>Your progress</p>
          <h2>Attempt history</h2>
        </div>
        <span>{summary.history.length} {summary.history.length === 1 ? 'attempt' : 'attempts'}</span>
      </div>
      <div className='assessment-history'>
        {summary.history.map((item) => {
          const status = item.passed === true
            ? 'Passed'
            : item.passed === false
              ? 'Needs Improvement'
              : 'In Progress'

          return (
            <article key={item.attemptPublicId}>
              <div className='assessment-history__identity'>
                <strong>Attempt {item.attemptNumber}</strong>
                {item.submittedAt !== null ? (
                  <time dateTime={item.submittedAt}>{formatAttemptDate(item.submittedAt)}</time>
                ) : null}
              </div>
              <div className='assessment-history__score'>
                <span>Score</span>
                <strong>{item.scorePercent === null ? '—' : `${item.scorePercent}%`}</strong>
              </div>
              <span
                className={`assessment-status assessment-status--${item.passed === true ? 'passed' : item.passed === false ? 'improvement' : 'progress'}`}
              >
                {status}
              </span>
              <Link
                className='button-link button-link--secondary'
                to={`/assessment-attempts/${item.attemptPublicId}/results`}
              >
                View Results
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function formatAttemptDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

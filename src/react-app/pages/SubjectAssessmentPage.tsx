import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
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
    return (
      <main className='dashboard-page'>
        <LearnerTopbar showSignOut>
          <Link className='button-link button-link--secondary' to='/dashboard'>
            Dashboard
          </Link>
        </LearnerTopbar>
        <p>Loading assessment...</p>
      </main>
    )
  }

  const passingTarget = Math.ceil(
    (summary.assessment.questionCount * summary.assessment.passingScore) / 100,
  )
  return (
    <main className='dashboard-page'>
      <LearnerTopbar showSignOut>
        <Link className='button-link button-link--secondary' to='/dashboard'>
          Dashboard
        </Link>
      </LearnerTopbar>

      <section className='dashboard-card assessment-overview'>
        <p className='eyebrow'>{summary.assessment.subjectTitle}</p>
        <h1>{summary.assessment.title}</h1>
        <p>{summary.assessment.description}</p>
        <div className='assessment-facts'>
          <span>{summary.assessment.questionCount} questions</span>
          <span>{summary.assessment.questionCount} points</span>
          <span>
            Pass: {passingTarget}/{summary.assessment.questionCount} ({summary.assessment.passingScore}% )
          </span>
          <span>No time limit</span>
        </div>
        <p>
          {summary.availability.available
            ? 'You are eligible to take this assessment.'
            : summary.availability.reason}
        </p>
        {summary.inProgressAttemptPublicId !== null ? (
          <Link className='button-link' to={`/assessment-attempts/${summary.inProgressAttemptPublicId}`}>
            Resume active attempt
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
                ? 'Try again'
                : 'Start assessment'}
          </button>
        )}
      </section>

      <AssessmentHistory summary={summary} />
    </main>
  )
}

function AssessmentHistory({ summary }: { summary: SubjectAssessmentSummary }) {
  if (summary.history.length === 0) return null

  return (
    <section className='dashboard-card'>
      <h2>Attempt history</h2>
      <div className='assessment-history'>
        {summary.history.map((item) => (
          <article key={item.attemptPublicId}>
            <strong>Attempt {item.attemptNumber}</strong>
            <span>
              {item.scorePercent ?? 0}% · {item.passed ? 'Passed' : 'Needs improvement'}
            </span>
            <Link to={`/assessment-attempts/${item.attemptPublicId}/results`}>
              Results
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}

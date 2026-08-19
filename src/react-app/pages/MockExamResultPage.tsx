import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import { fetchMockResult, type MockResult } from '../lib/mock-exam-api'

export function MockExamResultPage() {
  const { attemptPublicId = '' } = useParams()
  const [data, setData] = useState<MockResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const c = new AbortController()
    fetchMockResult(attemptPublicId, c.signal)
      .then(setData)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Result unavailable.')
      })
    return () => c.abort()
  }, [attemptPublicId])

  if (error !== null) {
    return (
      <main className="page-shell">
        <LearnerTopbar as="header" showSignOut>
          <Link className="button-link button-link--secondary" to="/dashboard">
            Dashboard
          </Link>
          <Link className="button-link button-link--secondary" to="/courses">
            Catalog
          </Link>
        </LearnerTopbar>
        <p className="form-error">{error}</p>
      </main>
    )
  }

  if (data === null) {
    return <PasaWisePageLoader label="Checking your Full Mock resultsâ€¦" />
  }

  return (
    <main className="page-shell">
      <LearnerTopbar as="header" showSignOut>
        <Link className="button-link button-link--secondary" to="/dashboard">
          Dashboard
        </Link>
        <Link className="button-link button-link--secondary" to="/courses">
          Catalog
        </Link>
      </LearnerTopbar>

      <section className="dashboard-card">
        <p className="eyebrow">
          {data.attempt.mode} · Attempt {data.attempt.attemptNumber}
        </p>
        <h1>
          {data.passed ? 'You passed this simulation' : 'Keep building toward your goal'}
        </h1>
        <p className="assessment-score">{data.earnedPoints}/150 · {data.scorePercent}%</p>
        <p>
          Correct {data.correctCount} · Incorrect {data.incorrectCount} · Unanswered{' '}
          {data.unansweredCount} · Target 120/150
        </p>
        <p>
          Time used: {formatDuration(data.attempt.durationSeconds)}
          {data.attempt.autoSubmitted ? ' · Auto-submitted at deadline' : ''}
        </p>
        <p>{data.notice}</p>
        <h2>Subject performance</h2>
        <Breakdowns values={data.subjects} />
        <h2>Topic performance</h2>
        <Breakdowns values={data.topics} />
        <p>
          Strongest subject: {data.strongestSubject?.title ?? '—'} · Needs focus:{' '}
          {data.weakestSubject?.title ?? '—'}
        </p>

        <div className="quiz-step-row">
          <Link className="button-link" to={`/mock-exam-attempts/${attemptPublicId}/review`}>
            Review Answers
          </Link>
          <Link
            className="button-link button-link--secondary"
            to="/mock-examinations/full-cse-professional-mock-examination"
          >
            Retake Mock Examination
          </Link>
        </div>
      </section>
    </main>
  )
}

function Breakdowns({ values }: { values: MockResult['subjects'] }) {
  return (
    <div className="assessment-history">
      {values.map((item) => (
        <article key={item.slug}>
          <strong>{item.title}</strong>
          <span>
            {item.correct}/{item.total} · {item.percentage}% · {item.status}
          </span>
          <small>
            {item.incorrect} incorrect · {item.unanswered} unanswered
          </small>
        </article>
      ))}
    </div>
  )
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

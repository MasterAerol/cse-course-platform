import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import { fetchMockResult, type MockResult } from '../lib/mock-exam-api'

function MockResultTopbar() {
  return (
    <LearnerTopbar
      as="header"
      mobileCollapsible
      showSignOut
      ariaLabel="Main navigation"
    >
      <Link className="button-link button-link--secondary" to="/dashboard">
        Dashboard
      </Link>
      <Link className="button-link button-link--secondary" to="/courses">
        Courses
      </Link>
      <Link className="button-link button-link--secondary" to="/readiness">
        Readiness
      </Link>
    </LearnerTopbar>
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

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Not available'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return [
    hours > 0 ? `${hours}h` : null,
    `${minutes}m`,
    hours === 0 ? `${remainingSeconds}s` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' ')
}

export function MockExamResultView({ data }: { data: MockResult }) {
  const statusLabel = data.passed ? 'Passed' : 'Needs Improvement'
  const pointsToPassing = Math.max(
    0,
    data.examination.passingTarget - data.earnedPoints,
  )

  return (
    <main className="page-shell mock-result-page">
      <MockResultTopbar />

      <section
        className={`mock-result-hero mock-result-hero--${data.passed ? 'passed' : 'improvement'}`}
        aria-labelledby="mock-result-title"
      >
        <div className="mock-result-hero__summary">
          <p className="eyebrow">Full Mock Result</p>
          <span
            className={`mock-status mock-status--${data.passed ? 'passed' : 'improvement'}`}
            aria-label={`Status: ${statusLabel}`}
          >
            {statusLabel}
          </span>
          <h1 id="mock-result-title">{data.examination.title}</h1>
          <p
            className="mock-result-score"
            aria-label={`${data.earnedPoints} out of ${data.totalPoints}, ${data.scorePercent} percent`}
          >
            <strong>
              {data.earnedPoints} / {data.totalPoints}
            </strong>
            <span>{data.scorePercent}%</span>
          </p>
          <p className="mock-result-passing">
            Passing score: {data.examination.passingTarget} / {data.totalPoints}{' '}
            ({data.examination.passingScore}%)
          </p>
          {!data.passed ? (
            <p className="mock-result-gap">
              {pointsToPassing}{' '}
              {pointsToPassing === 1 ? 'more correct answer' : 'more correct answers'}{' '}
              needed to reach the passing target.
            </p>
          ) : null}
          <p className="mock-result-attempt-meta">
            Attempt {data.attempt.attemptNumber} ·{' '}
            {data.attempt.mode === 'timed'
              ? 'Timed Simulation'
              : 'Untimed Practice'}
          </p>
          <p className="mock-result-attempt-meta">
            Completed {formatAttemptDate(data.attempt.submittedAt)} · Time used{' '}
            {formatDuration(data.attempt.durationSeconds)}
            {data.attempt.autoSubmitted ? ' · Auto-submitted at deadline' : ''}
          </p>
        </div>

        <dl className="mock-result-metrics" aria-label="Full Mock result summary">
          <div className="mock-result-metric mock-result-metric--correct">
            <dt>Correct</dt>
            <dd>{data.correctCount}</dd>
          </div>
          <div className="mock-result-metric mock-result-metric--incorrect">
            <dt>Incorrect</dt>
            <dd>{data.incorrectCount}</dd>
          </div>
          <div className="mock-result-metric mock-result-metric--unanswered">
            <dt>Unanswered</dt>
            <dd>{data.unansweredCount}</dd>
          </div>
          <div className="mock-result-metric mock-result-metric--total">
            <dt>Total</dt>
            <dd>{data.totalPoints}</dd>
          </div>
        </dl>
      </section>

      <section
        className="mock-result-section"
        aria-labelledby="mock-subject-performance-title"
      >
        <div className="mock-result-section__heading">
          <div>
            <p className="eyebrow">Major exam areas</p>
            <h2 id="mock-subject-performance-title">Subject performance</h2>
          </div>
          <p>
            Strongest: <strong>{data.strongestSubject?.title ?? 'Not available'}</strong>
            {' · '}Needs focus:{' '}
            <strong>{data.weakestSubject?.title ?? 'Not available'}</strong>
          </p>
        </div>
        <Breakdowns values={data.subjects} variant="subject" />
      </section>

      <section
        className="mock-result-section mock-topic-results-section"
        aria-labelledby="mock-topic-performance-title"
      >
        <div className="mock-result-section__heading">
          <div>
            <p className="eyebrow">Detailed review</p>
            <h2 id="mock-topic-performance-title">Topic performance</h2>
          </div>
          <p>Use these real result rows to choose focused lesson review.</p>
        </div>
        <Breakdowns values={data.topics} variant="topic" />
      </section>

      <section
        className="mock-result-actions"
        aria-labelledby="mock-result-actions-title"
      >
        <div>
          <p className="eyebrow">Next step</p>
          <h2 id="mock-result-actions-title">Turn this simulation into progress</h2>
          <p>{data.notice}</p>
        </div>
        <nav aria-label="Full Mock result actions">
          <Link
            className="button-link"
            to={`/mock-exam-attempts/${data.attempt.publicId}/review`}
          >
            Review Answers
          </Link>
          <Link className="button-link button-link--secondary" to="/readiness">
            View Readiness
          </Link>
          <Link
            className="button-link button-link--secondary"
            to={`/mock-examinations/${data.examination.slug}`}
          >
            Retake or View History
          </Link>
        </nav>
      </section>
    </main>
  )
}

export function MockExamResultPage() {
  const { attemptPublicId = '' } = useParams()
  const [data, setData] = useState<MockResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchMockResult(attemptPublicId, controller.signal)
      .then(setData)
      .catch((value: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            value instanceof Error ? value.message : 'Result unavailable.',
          )
        }
      })
    return () => controller.abort()
  }, [attemptPublicId])

  if (error !== null) {
    return (
      <main className="page-shell mock-result-page">
        <MockResultTopbar />
        <p className="form-error" role="alert">
          {error}
        </p>
      </main>
    )
  }

  if (data === null) {
    return <PasaWisePageLoader label="Checking your Full Mock results…" />
  }

  return <MockExamResultView data={data} />
}

function Breakdowns({
  values,
  variant,
}: {
  values: MockResult['subjects']
  variant: 'subject' | 'topic'
}) {
  return (
    <div className={`mock-breakdown-list mock-breakdown-list--${variant}`}>
      {values.map((item) => (
        <article className="mock-breakdown-row" key={item.slug}>
          <div>
            <h3>{item.title}</h3>
            <p>
              {item.correct} of {item.total} correct · {item.incorrect} incorrect
              {item.unanswered > 0
                ? ` · ${item.unanswered} unanswered`
                : ''}
            </p>
          </div>
          <div className="mock-breakdown-row__result">
            <strong>{item.percentage}%</strong>
            <span>{item.status}</span>
          </div>
        </article>
      ))}
    </div>
  )
}

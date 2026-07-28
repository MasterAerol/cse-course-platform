import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  ApiClientError,
  fetchLessonPracticeSummary,
  startPracticeAttempt,
  type LessonPracticeSummary,
} from '../lib/api'

type PracticePanelState =
  | { status: 'loading' }
  | { status: 'loaded'; summary: LessonPracticeSummary }
  | { status: 'error'; message: string }

function getPracticeErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'LESSON_LOCKED') {
      return 'Complete the previous required lesson to unlock this practice activity.'
    }

    if (error.code === 'MAXIMUM_ATTEMPTS_REACHED') {
      return 'You have used all available practice attempts.'
    }

    if (error.code === 'PRACTICE_NOT_FOUND') {
      return 'This practice activity is not available yet.'
    }

    if (error.code === 'UNAUTHENTICATED') {
      return 'Please sign in to open this practice activity.'
    }

    return error.message
  }

  return error instanceof Error
    ? error.message
    : 'The practice activity could not be loaded.'
}

function formatAttemptOutcome(
  attempt: LessonPracticeSummary['attempts'][number],
): string {
  if (attempt.status === 'in_progress') {
    return 'In progress'
  }

  if (attempt.passed === null || attempt.scorePercent === null) {
    return attempt.status
  }

  return `${attempt.passed ? 'Passed' : 'Try again'} · ${attempt.scorePercent}%`
}

function formatAttemptDate(startedAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(startedAt))
}

export function PracticeLessonPanel({
  lessonPublicId,
}: {
  lessonPublicId: string
}) {
  const navigate = useNavigate()
  const [state, setState] = useState<PracticePanelState>({
    status: 'loading',
  })
  const [startStatus, setStartStatus] = useState<
    | { type: 'idle' }
    | { type: 'submitting' }
    | { type: 'error'; message: string }
  >({ type: 'idle' })

  useEffect(() => {
    const controller = new AbortController()

    async function loadPractice(): Promise<void> {
      try {
        const summary = await fetchLessonPracticeSummary(
          lessonPublicId,
          controller.signal,
        )

        setState({ status: 'loaded', summary })
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: getPracticeErrorMessage(error),
          })
        }
      }
    }

    void loadPractice()

    return () => {
      controller.abort()
    }
  }, [lessonPublicId])

  async function handleStartAttempt(practiceSetId: number): Promise<void> {
    setStartStatus({ type: 'submitting' })

    try {
      const attempt = await startPracticeAttempt(practiceSetId)
      void navigate(`/practice-attempts/${attempt.attempt.publicId}`)
    } catch (error: unknown) {
      setStartStatus({
        type: 'error',
        message: getPracticeErrorMessage(error),
      })
    }
  }

  if (state.status === 'loading') {
    return (
      <section className="quiz-panel" aria-live="polite">
        <p>Loading practice activity...</p>
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section className="quiz-panel" role="alert">
        <h2>Practice unavailable</h2>
        <p>{state.message}</p>
      </section>
    )
  }

  const { summary } = state
  const attemptsRemaining = summary.practice.attemptsRemaining
  const cannotStart = attemptsRemaining !== null && attemptsRemaining <= 0
  const latestSubmittedAttempt = summary.attempts.find(
    (attempt) => attempt.status === 'submitted',
  )

  return (
    <section className="quiz-panel" aria-labelledby="practice-panel-title">
      <p className="eyebrow">Practice activity</p>
      <h2 id="practice-panel-title">{summary.practice.title}</h2>
      {summary.practice.instructions !== null && (
        <p>{summary.practice.instructions}</p>
      )}
      {summary.lessonCompleted && (
        <p className="form-success">This practice lesson is completed.</p>
      )}
      <dl className="quiz-meta">
        <div>
          <dt>Questions</dt>
          <dd>{summary.practice.questionCount}</dd>
        </div>
        <div>
          <dt>Passing score</dt>
          <dd>{summary.practice.passingScore}%</dd>
        </div>
        <div>
          <dt>Attempts</dt>
          <dd>
            {summary.practice.maximumAttempts === null
              ? 'Unlimited'
              : `${summary.practice.attemptsRemaining ?? 0} remaining`}
          </dd>
        </div>
      </dl>

      <div className="button-row">
        {summary.inProgressAttempt === null ? (
          <button
            type="button"
            disabled={cannotStart || startStatus.type === 'submitting'}
            onClick={() => void handleStartAttempt(summary.practice.id)}
          >
            {startStatus.type === 'submitting'
              ? 'Starting...'
              : latestSubmittedAttempt === undefined
                ? 'Start practice'
                : 'Retry practice'}
          </button>
        ) : (
          <Link
            className="button-link"
            to={`/practice-attempts/${summary.inProgressAttempt.attemptPublicId}`}
          >
            Resume practice
          </Link>
        )}
      </div>

      {startStatus.type === 'error' && (
        <p className="form-error" role="alert">
          {startStatus.message}
        </p>
      )}

      {summary.attempts.length > 0 && (
        <div className="attempt-history">
          <h3>Attempt history</h3>
          <ol>
            {summary.attempts.map((attempt) => (
              <li key={attempt.attemptPublicId}>
                <span>
                  Attempt {attempt.attemptNumber}:{' '}
                  {formatAttemptOutcome(attempt)}
                  <small>{formatAttemptDate(attempt.startedAt)}</small>
                </span>
                {attempt.status === 'submitted' ? (
                  <Link
                    to={`/practice-attempts/${attempt.attemptPublicId}/results`}
                  >
                    View results
                  </Link>
                ) : (
                  <Link to={`/practice-attempts/${attempt.attemptPublicId}`}>
                    Resume
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { LearnerTopbar } from '../components/LearnerTopbar'

import {
  ApiClientError,
  fetchPracticeAttemptResult,
  startPracticeAttempt,
  type PracticeAttemptResult,
} from '../lib/api'

type ResultPageState =
  | { status: 'loading' }
  | { status: 'loaded'; result: PracticeAttemptResult }
  | { status: 'error'; message: string }

function getResultErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'PRACTICE_NOT_SUBMITTED') {
      return 'Submit the practice attempt before viewing results.'
    }

    if (error.code === 'ATTEMPT_FORBIDDEN') {
      return 'This practice attempt belongs to another user.'
    }

    if (error.code === 'UNAUTHENTICATED') {
      return 'Please sign in to view practice results.'
    }

    return error.message
  }

  return error instanceof Error
    ? error.message
    : 'The practice result could not be loaded.'
}

export function PracticeResultPage() {
  const { attemptPublicId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<ResultPageState>({
    status: 'loading',
  })
  const [retryStatus, setRetryStatus] = useState<
    | { type: 'idle' }
    | { type: 'submitting' }
    | { type: 'error'; message: string }
  >({ type: 'idle' })

  useEffect(() => {
    const controller = new AbortController()

    async function loadResult(): Promise<void> {
      if (attemptPublicId === undefined) {
        setState({
          status: 'error',
          message: 'The practice result URL is incomplete.',
        })
        return
      }

      try {
        const result = await fetchPracticeAttemptResult(
          attemptPublicId,
          controller.signal,
        )

        setState({ status: 'loaded', result })
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: getResultErrorMessage(error),
          })
        }
      }
    }

    void loadResult()

    return () => {
      controller.abort()
    }
  }, [attemptPublicId])

  async function handleRetry(practiceSetId: number): Promise<void> {
    setRetryStatus({ type: 'submitting' })

    try {
      const attempt = await startPracticeAttempt(practiceSetId)
      void navigate(`/practice-attempts/${attempt.attempt.publicId}`)
    } catch (error: unknown) {
      setRetryStatus({
        type: 'error',
        message: getResultErrorMessage(error),
      })
    }
  }

  return (
    <main className="page-shell quiz-page">
      <LearnerTopbar as="header">
        <Link className="button-link button-link--secondary" to="/dashboard">
          Dashboard
        </Link>
      </LearnerTopbar>

      {state.status === 'loading' && (
        <section className="message-card" aria-live="polite">
          <p>Loading practice results...</p>
        </section>
      )}

      {state.status === 'error' && (
        <section className="message-card" role="alert">
          <h1>Results unavailable</h1>
          <p>{state.message}</p>
          <Link className="button-link" to="/dashboard">
            Return to dashboard
          </Link>
        </section>
      )}

      {state.status === 'loaded' && (
        <section className="quiz-result-card">
          <p className="eyebrow">Practice results</p>
          <h1>{state.result.practice.title}</h1>
          <div
            className={
              state.result.passed
                ? 'quiz-score quiz-score--passed'
                : 'quiz-score quiz-score--failed'
            }
          >
            <span>{state.result.passed ? 'Passed' : 'Try again'}</span>
            <strong>{state.result.scorePercent}%</strong>
            <span>
              {state.result.earnedPoints} of {state.result.totalPoints} points
            </span>
          </div>

          <progress
            className="progress"
            aria-label="Course progress"
            max="100"
            value={state.result.courseProgress.progressPercentage}
          />
          <p className="meta-copy">
            Course progress:{' '}
            {state.result.courseProgress.completedRequiredLessons} of{' '}
            {state.result.courseProgress.totalRequiredLessons} required lessons
            completed.
          </p>

          {state.result.passed ? (
            state.result.newlyUnlockedNextLesson !== null ? (
              <p className="form-success">
                Passed. {state.result.newlyUnlockedNextLesson.title} is now
                unlocked.
              </p>
            ) : (
              <p className="form-success">Practice completed.</p>
            )
          ) : (
            <p className="form-error">
              Score at least {state.result.practice.passingScore}% to complete
              this practice lesson.
            </p>
          )}

          <div className="button-row">
            {!state.result.passed && (
              <button
                type="button"
                disabled={retryStatus.type === 'submitting'}
                onClick={() => void handleRetry(state.result.practice.id)}
              >
                {retryStatus.type === 'submitting'
                  ? 'Starting...'
                  : 'Retry practice'}
              </button>
            )}
            {state.result.newlyUnlockedNextLesson !== null && (
              <Link
                className="button-link"
                to={`/courses/${
                  state.result.courseProgress.course.slug
                }/lessons/${state.result.newlyUnlockedNextLesson.publicId}`}
              >
                Continue learning
              </Link>
            )}
            <Link
              className="button-link button-link--secondary"
              to={`/courses/${state.result.courseProgress.course.slug}`}
            >
              Back to course
            </Link>
          </div>
          {retryStatus.type === 'error' && (
            <p className="form-error" role="alert">
              {retryStatus.message}
            </p>
          )}

          <div className="quiz-review-list">
            {state.result.questions.map((question) => (
              <article className="quiz-review-card" key={question.id}>
                <h2>
                  Question {question.position}:{' '}
                  {question.isCorrect ? 'Correct' : 'Review'}
                </h2>
                <p className="question-prompt">{question.prompt}</p>
                <p>
                  Your answer:{' '}
                  {question.selectedChoice === null
                    ? 'No answer'
                    : question.selectedChoice.text}
                </p>
                <p>Correct answer: {question.correctChoice.text}</p>
                {question.explanation !== null && (
                  <p className="meta-copy">{question.explanation}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
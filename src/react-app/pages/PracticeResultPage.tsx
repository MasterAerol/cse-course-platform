import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'

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
  const correctCount =
    state.status === 'loaded'
      ? state.result.questions.filter((question) => question.isCorrect).length
      : 0
  const unansweredCount =
    state.status === 'loaded'
      ? state.result.questions.filter(
          (question) => question.selectedChoice === null,
        ).length
      : 0
  const incorrectCount =
    state.status === 'loaded'
      ? state.result.questions.length - correctCount - unansweredCount
      : 0

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

  if (state.status === 'loading') {
    return <PasaWisePageLoader label="Checking your practice results…" />
  }

  return (
    <main className="page-shell quiz-page learning-result-page practice-result-page">
      <LearnerTopbar
        as="header"
        mobileCollapsible
        showSignOut
        ariaLabel="Practice result navigation"
      >
        <Link className="button-link button-link--secondary" to="/dashboard">
          Dashboard
        </Link>
      </LearnerTopbar>

      {state.status === 'error' && (
        <section className="message-card learning-activity-error" role="alert">
          <h1>Results unavailable</h1>
          <p>{state.message}</p>
          <Link className="button-link" to="/dashboard">
            Return to dashboard
          </Link>
        </section>
      )}

      {state.status === 'loaded' && (
        <section className="quiz-result-card learning-result-card">
          <header className="learning-result-hero learning-result-hero--practice">
            <div>
              <p className="eyebrow">Practice complete</p>
              <h1>{state.result.practice.title}</h1>
              <p>
                {state.result.passed
                  ? 'You reached this lesson’s completion target.'
                  : 'Review the explanations below, then try another set when you are ready.'}
              </p>
            </div>
            <div className="learning-result-score" aria-label="Practice score">
              <strong>
                {state.result.earnedPoints} / {state.result.totalPoints}
              </strong>
              <span>{state.result.scorePercent}%</span>
              <small>points earned</small>
            </div>
          </header>

          <dl className="learning-result-metrics" aria-label="Practice result summary">
            <div className="learning-result-metric learning-result-metric--correct">
              <dt>Correct</dt>
              <dd>{correctCount}</dd>
            </div>
            <div className="learning-result-metric learning-result-metric--incorrect">
              <dt>Incorrect</dt>
              <dd>{incorrectCount}</dd>
            </div>
            <div className="learning-result-metric learning-result-metric--unanswered">
              <dt>Unanswered</dt>
              <dd>{unansweredCount}</dd>
            </div>
            <div className="learning-result-metric learning-result-metric--total">
              <dt>Total</dt>
              <dd>{state.result.questions.length}</dd>
            </div>
          </dl>

          <section
            className="learning-course-progress"
            aria-labelledby="practice-course-progress-title"
          >
            <h2 id="practice-course-progress-title">Course progress</h2>
            <progress
              className="progress"
              aria-label="Course progress"
              max="100"
              value={state.result.courseProgress.progressPercentage}
            />
            <p className="meta-copy">
              {state.result.courseProgress.completedRequiredLessons} of{' '}
              {state.result.courseProgress.totalRequiredLessons} required lessons
              completed.
            </p>
          </section>

          {state.result.passed ? (
            state.result.newlyUnlockedNextLesson !== null ? (
              <p className="learning-result-guidance learning-result-guidance--success">
                Great progress. {state.result.newlyUnlockedNextLesson.title} is now
                unlocked.
              </p>
            ) : (
              <p className="learning-result-guidance learning-result-guidance--success">
                Practice completed. Review any explanation you want to revisit.
              </p>
            )
          ) : (
            <p className="learning-result-guidance learning-result-guidance--review">
              Score at least {state.result.practice.passingScore}% to complete
              this practice lesson. Use the answer review below to prepare for
              another attempt.
            </p>
          )}

          <div className="button-row learning-result-actions">
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

          <section
            className="learning-answer-review"
            aria-labelledby="practice-answer-review-title"
          >
            <header>
              <h2 id="practice-answer-review-title">Review your answers</h2>
              <p>Compare each response and use the supplied explanation to learn from it.</p>
            </header>
            <div className="quiz-review-list">
              {state.result.questions.map((question) => {
                const status =
                  question.selectedChoice === null
                    ? 'Unanswered'
                    : question.isCorrect
                      ? 'Correct'
                      : 'Needs another look'

                return (
                  <article
                    className={`quiz-review-card learning-review-card ${
                      question.selectedChoice === null
                        ? 'learning-review-card--unanswered'
                        : question.isCorrect
                          ? 'learning-review-card--correct'
                          : 'learning-review-card--incorrect'
                    }`}
                    key={question.id}
                  >
                    <header className="learning-review-card__header">
                      <p className="eyebrow">Question {question.position}</p>
                      <span>{status}</span>
                    </header>
                    <h3 className="question-prompt">{question.prompt}</h3>
                    <dl className="learning-answer-comparison">
                      <div>
                        <dt>Your answer</dt>
                        <dd>
                          {question.selectedChoice === null
                            ? 'No answer selected'
                            : question.selectedChoice.text}
                        </dd>
                      </div>
                      <div>
                        <dt>Correct answer</dt>
                        <dd>{question.correctChoice.text}</dd>
                      </div>
                    </dl>
                    {question.explanation !== null && (
                      <section className="learning-explanation">
                        <h4>Why this works</h4>
                        <p>{question.explanation}</p>
                      </section>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        </section>
      )}
    </main>
  )
}
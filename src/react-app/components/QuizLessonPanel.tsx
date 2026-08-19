import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PasaWiseLoader } from './PasaWiseLoader'

import {
  ApiClientError,
  fetchLessonQuizSummary,
  startQuizAttempt,
  type LessonQuizSummary,
} from '../lib/api'

type QuizPanelState =
  | { status: 'loading' }
  | { status: 'loaded'; summary: LessonQuizSummary }
  | { status: 'error'; message: string }

function getQuizErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'LESSON_LOCKED') {
      return 'Complete the previous required lesson to unlock this quiz.'
    }

    if (error.code === 'MAXIMUM_ATTEMPTS_REACHED') {
      return 'You have used all available quiz attempts.'
    }

    if (error.code === 'QUIZ_NOT_FOUND') {
      return 'This quiz is not available yet.'
    }

    if (error.code === 'UNAUTHENTICATED') {
      return 'Please sign in to open this quiz.'
    }

    return error.message
  }

  return error instanceof Error
    ? error.message
    : 'The quiz could not be loaded.'
}

function formatAttemptOutcome(
  attempt: LessonQuizSummary['attempts'][number],
): string {
  if (attempt.status === 'in_progress') {
    return 'In progress'
  }

  if (attempt.passed === null || attempt.scorePercent === null) {
    return attempt.status
  }

  return `${attempt.passed ? 'Passed' : 'Not passed'} · ${attempt.scorePercent}%`
}

function formatAttemptDate(startedAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(startedAt))
}

export function QuizLessonPanel({
  lessonPublicId,
}: {
  lessonPublicId: string
}) {
  const navigate = useNavigate()
  const [state, setState] = useState<QuizPanelState>({ status: 'loading' })
  const [startStatus, setStartStatus] = useState<
    | { type: 'idle' }
    | { type: 'submitting' }
    | { type: 'error'; message: string }
  >({ type: 'idle' })

  useEffect(() => {
    const controller = new AbortController()

    async function loadQuiz(): Promise<void> {
      try {
        const summary = await fetchLessonQuizSummary(
          lessonPublicId,
          controller.signal,
        )

        setState({ status: 'loaded', summary })
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: getQuizErrorMessage(error),
          })
        }
      }
    }

    void loadQuiz()

    return () => {
      controller.abort()
    }
  }, [lessonPublicId])

  async function handleStartAttempt(quizId: number): Promise<void> {
    setStartStatus({ type: 'submitting' })

    try {
      const attempt = await startQuizAttempt(quizId)
      void navigate(`/quiz-attempts/${attempt.attempt.publicId}`)
    } catch (error: unknown) {
      setStartStatus({
        type: 'error',
        message: getQuizErrorMessage(error),
      })
    }
  }

  if (state.status === 'loading') {
    return (
      <section
        className="quiz-panel learning-activity-panel learning-activity-panel--quiz"
        aria-live="polite"
      >
        <PasaWiseLoader label="Preparing this topic quiz…" />
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section
        className="quiz-panel learning-activity-panel learning-activity-panel--quiz"
        role="alert"
      >
        <h2>Quiz unavailable</h2>
        <p>{state.message}</p>
      </section>
    )
  }

  const { summary } = state
  const attemptsRemaining = summary.quiz.attemptsRemaining
  const cannotStart = attemptsRemaining !== null && attemptsRemaining <= 0

  return (
    <section
      className="quiz-panel learning-activity-panel learning-activity-panel--quiz"
      aria-labelledby="quiz-panel-title"
    >
      <header className="learning-activity-panel__header">
        <p className="eyebrow">Topic quiz</p>
        <h2 id="quiz-panel-title">{summary.quiz.title}</h2>
        <p>
          {summary.quiz.description ??
            'Check your understanding with this focused topic quiz.'}
        </p>
      </header>
      <dl className="quiz-meta">
        <div>
          <dt>Questions</dt>
          <dd>{summary.quiz.questionCount}</dd>
        </div>
        <div>
          <dt>Completion target</dt>
          <dd>{summary.quiz.passingScore}%</dd>
        </div>
        <div>
          <dt>Time limit</dt>
          <dd>
            {summary.quiz.timeLimitMinutes === null
              ? 'No time limit'
              : `${summary.quiz.timeLimitMinutes} minutes`}
          </dd>
        </div>
        <div>
          <dt>Attempts</dt>
          <dd>
            {summary.quiz.maximumAttempts === null
              ? 'Unlimited'
              : `${summary.quiz.attemptsRemaining ?? 0} remaining`}
          </dd>
        </div>
      </dl>
      <p className="learning-activity-panel__note">
        Work one question at a time. Your answers save as you go, and
        explanations appear after submission.
      </p>

      <div className="button-row learning-activity-panel__actions">
        {summary.inProgressAttempt === null ? (
          <button
            type="button"
            disabled={cannotStart || startStatus.type === 'submitting'}
            onClick={() => void handleStartAttempt(summary.quiz.id)}
          >
            {startStatus.type === 'submitting'
              ? 'Starting...'
              : 'Start quiz'}
          </button>
        ) : (
          <Link
            className="button-link"
            to={`/quiz-attempts/${summary.inProgressAttempt.attemptPublicId}`}
          >
            Continue quiz
          </Link>
        )}
      </div>

      {startStatus.type === 'error' && (
        <p className="form-error" role="alert">
          {startStatus.message}
        </p>
      )}

      {summary.attempts.length > 0 && (
        <div className="attempt-history learning-attempt-history">
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
                  <Link to={`/quiz-attempts/${attempt.attemptPublicId}/results`}>
                    View results
                  </Link>
                ) : (
                  <Link to={`/quiz-attempts/${attempt.attemptPublicId}`}>
                    Continue
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

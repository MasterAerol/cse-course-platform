import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'

import {
  ApiClientError,
  fetchQuizAttempt,
  saveQuizAnswer,
  submitQuizAttempt,
  type QuizAttemptPayload,
} from '../lib/api'

type AttemptPageState =
  | { status: 'loading' }
  | { status: 'loaded'; attempt: QuizAttemptPayload }
  | { status: 'error'; message: string }

function getAttemptErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'ATTEMPT_EXPIRED') {
      return 'This quiz attempt has expired.'
    }

    if (error.code === 'ATTEMPT_ALREADY_SUBMITTED') {
      return 'This quiz attempt has already been submitted.'
    }

    if (error.code === 'ATTEMPT_FORBIDDEN') {
      return 'This quiz attempt belongs to another user.'
    }

    if (error.code === 'UNAUTHENTICATED') {
      return 'Please sign in to continue this quiz.'
    }

    return error.message
  }

  return error instanceof Error
    ? error.message
    : 'The quiz attempt could not be loaded.'
}

export function QuizAttemptPage() {
  const { attemptPublicId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<AttemptPageState>({
    status: 'loading',
  })
  const [selectedChoices, setSelectedChoices] = useState<
    Record<number, number | null>
  >({})
  const [saveStatus, setSaveStatus] = useState<
    | { type: 'idle' }
    | { type: 'saving'; questionId: number }
    | { type: 'saved'; message: string }
    | { type: 'error'; message: string }
  >({ type: 'idle' })
  const [submitting, setSubmitting] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadAttempt(): Promise<void> {
      if (attemptPublicId === undefined) {
        setState({
          status: 'error',
          message: 'The quiz attempt URL is incomplete.',
        })
        return
      }

      try {
        const attempt = await fetchQuizAttempt(
          attemptPublicId,
          controller.signal,
        )

        if ('resultAvailable' in attempt) {
          void navigate(`/quiz-attempts/${attempt.attempt.publicId}/results`, {
            replace: true,
          })
          return
        }

        const initialSelections = Object.fromEntries(
          attempt.questions.map((question) => [
            question.id,
            question.selectedChoiceId,
          ]),
        )

        setSelectedChoices(initialSelections)
        setCurrentQuestionIndex(0)
        setState({ status: 'loaded', attempt })
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: getAttemptErrorMessage(error),
          })
        }
      }
    }

    void loadAttempt()

    return () => {
      controller.abort()
    }
  }, [attemptPublicId, navigate])

  const answeredCount = useMemo(
    () =>
      Object.values(selectedChoices).filter(
        (choiceId) => choiceId !== null,
      ).length,
    [selectedChoices],
  )
  const currentQuestion =
    state.status === 'loaded'
      ? (state.attempt.questions[currentQuestionIndex] ??
        state.attempt.questions[0] ??
        null)
      : null
  const unansweredCount =
    state.status === 'loaded'
      ? state.attempt.questions.length - answeredCount
      : 0

  async function handleSelectChoice(
    questionId: number,
    selectedChoiceId: number,
  ): Promise<void> {
    if (attemptPublicId === undefined) {
      return
    }

    const previousChoiceId = selectedChoices[questionId] ?? null
    setSelectedChoices((current) => ({
      ...current,
      [questionId]: selectedChoiceId,
    }))
    setSaveStatus({ type: 'saving', questionId })

    try {
      const result = await saveQuizAnswer(
        attemptPublicId,
        questionId,
        selectedChoiceId,
      )

      setSaveStatus({
        type: 'saved',
        message: `Saved ${result.answeredCount} of ${result.totalCount} answers.`,
      })
    } catch (error: unknown) {
      setSelectedChoices((current) => ({
        ...current,
        [questionId]: previousChoiceId,
      }))
      setSaveStatus({
        type: 'error',
        message: getAttemptErrorMessage(error),
      })
    }
  }

  async function handleSubmit(): Promise<void> {
    if (attemptPublicId === undefined) {
      return
    }

    const confirmed = window.confirm(
      'Submit this quiz attempt? Unanswered questions will receive zero points.',
    )

    if (!confirmed) {
      return
    }

    setSubmitting(true)
    setSaveStatus({ type: 'idle' })

    try {
      const result = await submitQuizAttempt(attemptPublicId)
      void navigate(`/quiz-attempts/${result.attempt.publicId}/results`, {
        replace: true,
      })
    } catch (error: unknown) {
      setSubmitting(false)
      setSaveStatus({
        type: 'error',
        message: getAttemptErrorMessage(error),
      })
    }
  }

  if (state.status === 'loading') {
    return <PasaWisePageLoader label="Preparing your quiz…" />
  }

  return (
    <main className="page-shell quiz-page">
      <LearnerTopbar as="header">
        <Link className="button-link button-link--secondary" to="/dashboard">
          Dashboard
        </Link>
      </LearnerTopbar>

      {state.status === 'error' && (
        <section className="message-card" role="alert">
          <h1>Quiz unavailable</h1>
          <p>{state.message}</p>
          <Link className="button-link" to="/dashboard">
            Return to dashboard
          </Link>
        </section>
      )}

      {state.status === 'loaded' && (
        <section className="quiz-attempt-card">
          <p className="eyebrow">Attempt {state.attempt.attempt.attemptNumber}</p>
          <h1>{state.attempt.quiz.title}</h1>
          <p>
            Passing score: {state.attempt.quiz.passingScore}% � Questions:{' '}
            {state.attempt.quiz.questionCount}
          </p>
          <p className="meta-copy" aria-live="polite">
            Answered {answeredCount} of {state.attempt.questions.length}
          </p>

          <nav className="quiz-question-nav" aria-label="Question navigation">
            {state.attempt.questions.map((question, index) => {
              const isAnswered = selectedChoices[question.id] !== null

              return (
                <button
                  className={
                    index === currentQuestionIndex
                      ? 'quiz-question-nav__item quiz-question-nav__item--current'
                      : isAnswered
                        ? 'quiz-question-nav__item quiz-question-nav__item--answered'
                        : 'quiz-question-nav__item'
                  }
                  type="button"
                  aria-current={
                    index === currentQuestionIndex ? 'step' : undefined
                  }
                  key={question.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                >
                  <span>{question.position}</span>
                  <small>{isAnswered ? 'Answered' : 'Unanswered'}</small>
                </button>
              )
            })}
          </nav>

          <form
            className="quiz-question-list"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSubmit()
            }}
          >
            {currentQuestion !== null && (
              <fieldset className="quiz-question" key={currentQuestion.id}>
                <legend>
                  <span>Question {currentQuestion.position}</span>
                  {currentQuestion.prompt}
                </legend>
                <div className="quiz-choice-list">
                  {currentQuestion.choices.map((choice) => (
                    <label className="quiz-choice" key={choice.id}>
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={choice.id}
                        checked={
                          selectedChoices[currentQuestion.id] === choice.id
                        }
                        disabled={submitting}
                        onChange={() =>
                          void handleSelectChoice(currentQuestion.id, choice.id)
                        }
                      />
                      <span>{choice.text}</span>
                    </label>
                  ))}
                </div>
                {saveStatus.type === 'saving' &&
                  saveStatus.questionId === currentQuestion.id && (
                    <p className="meta-copy">Saving answer...</p>
                  )}
              </fieldset>
            )}

            <div className="quiz-step-row">
              <button
                className="button-secondary"
                type="button"
                disabled={currentQuestionIndex === 0 || submitting}
                onClick={() =>
                  setCurrentQuestionIndex((index) => Math.max(0, index - 1))
                }
              >
                Previous
              </button>
              <button
                className="button-secondary"
                type="button"
                disabled={
                  state.attempt.questions.length === 0 ||
                  currentQuestionIndex >= state.attempt.questions.length - 1 ||
                  submitting
                }
                onClick={() =>
                  setCurrentQuestionIndex((index) =>
                    Math.min(state.attempt.questions.length - 1, index + 1),
                  )
                }
              >
                Next
              </button>
            </div>

            <div className="quiz-submit-row">
              <button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit quiz'}
              </button>
              <p className="meta-copy">
                {unansweredCount} unanswered. You can submit with unanswered
                questions, but they count as zero.
              </p>
            </div>
          </form>

          {saveStatus.type === 'saved' && (
            <p className="form-success" aria-live="polite">
              {saveStatus.message}
            </p>
          )}
          {saveStatus.type === 'error' && (
            <p className="form-error" role="alert">
              {saveStatus.message}
            </p>
          )}
        </section>
      )}
    </main>
  )
}

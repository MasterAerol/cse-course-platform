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
  const totalQuestions =
    state.status === 'loaded' ? state.attempt.questions.length : 0
  const currentPosition = currentQuestion?.position ?? 0
  const progressPercent =
    totalQuestions === 0
      ? 0
      : Math.round((currentPosition / totalQuestions) * 100)

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
    <main className="page-shell quiz-page learning-attempt-page topic-quiz-attempt-page">
      <LearnerTopbar
        as="header"
        mobileCollapsible
        showSignOut
        ariaLabel="Topic quiz navigation"
      >
        <Link className="button-link button-link--secondary" to="/dashboard">
          Dashboard
        </Link>
      </LearnerTopbar>

      {state.status === 'error' && (
        <section className="message-card learning-activity-error" role="alert">
          <h1>Quiz unavailable</h1>
          <p>{state.message}</p>
          <Link className="button-link" to="/dashboard">
            Return to dashboard
          </Link>
        </section>
      )}

      {state.status === 'loaded' && (
        <section
          className="quiz-attempt-card learning-attempt-card learning-attempt-card--quiz"
          aria-labelledby="topic-quiz-attempt-title"
        >
          <header className="learning-attempt-header">
            <div>
              <p className="eyebrow">
                Topic quiz · Attempt {state.attempt.attempt.attemptNumber}
              </p>
              <h1 id="topic-quiz-attempt-title">{state.attempt.quiz.title}</h1>
              <p>Check your topic understanding</p>
            </div>
            <dl className="learning-attempt-facts" aria-label="Quiz details">
              <div>
                <dt>Questions</dt>
                <dd>{state.attempt.quiz.questionCount}</dd>
              </div>
              <div>
                <dt>Completion target</dt>
                <dd>{state.attempt.quiz.passingScore}%</dd>
              </div>
            </dl>
          </header>

          <section
            className="learning-attempt-progress"
            aria-label="Topic quiz progress"
          >
            <div>
              <strong>
                Question {currentPosition} of {totalQuestions}
              </strong>
              <span>{progressPercent}%</span>
            </div>
            <progress
              max={Math.max(totalQuestions, 1)}
              value={currentPosition}
              aria-label={`Topic quiz progress: question ${currentPosition} of ${totalQuestions}`}
            />
            <p className="meta-copy" aria-live="polite">
              Answered {answeredCount} of {totalQuestions}
            </p>
          </section>

          <nav
            className="quiz-question-nav learning-question-nav"
            aria-label="Topic quiz question navigation"
          >
            {state.attempt.questions.map((question, index) => {
              const isAnswered = selectedChoices[question.id] !== null
              const isCurrent = index === currentQuestionIndex

              return (
                <button
                  className={`quiz-question-nav__item ${
                    isCurrent ? 'quiz-question-nav__item--current' : ''
                  } ${isAnswered ? 'quiz-question-nav__item--answered' : ''}`}
                  type="button"
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Question ${question.position}, ${
                    isCurrent ? 'current, ' : ''
                  }${isAnswered ? 'answered' : 'unanswered'}`}
                  key={question.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                >
                  <span>{question.position}</span>
                  <small aria-hidden="true">
                    <span className="learning-question-status learning-question-status--desktop">
                      {isAnswered ? 'Answered' : 'Unanswered'}
                    </span>
                    <span className="learning-question-status learning-question-status--mobile">
                      {isAnswered ? 'Done' : 'Open'}
                    </span>
                  </small>
                </button>
              )
            })}
          </nav>

          <form
            className="quiz-question-list learning-question-form"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSubmit()
            }}
          >
            {currentQuestion !== null && (
              <fieldset
                className="quiz-question learning-question-card"
                key={currentQuestion.id}
              >
                <legend>
                  <span>
                    Question {currentQuestion.position} of {totalQuestions}
                  </span>
                  <strong>{currentQuestion.prompt}</strong>
                </legend>
                <div className="quiz-choice-list">
                  {currentQuestion.choices.map((choice, choiceIndex) => (
                    <label
                      className="quiz-choice learning-answer-choice"
                      key={choice.id}
                    >
                      <input
                        className="answer-choice-control"
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
                      <span className="answer-choice-marker learning-answer-choice__label" aria-hidden="true">
                        {String.fromCharCode(65 + choiceIndex)}
                      </span>
                      <span className="learning-answer-choice__text">
                        {choice.text}
                      </span>
                    </label>
                  ))}
                </div>
                {saveStatus.type === 'saving' &&
                  saveStatus.questionId === currentQuestion.id && (
                    <p className="meta-copy learning-save-status">Saving answer...</p>
                  )}
              </fieldset>
            )}

            <div className="quiz-step-row learning-attempt-navigation">
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

            <div className="quiz-submit-row learning-submit-panel">
              <div>
                <h2>Finish this topic quiz?</h2>
                <p className="meta-copy">
                  {unansweredCount === 0
                    ? 'All questions have an answer recorded.'
                    : `${unansweredCount} ${
                        unansweredCount === 1 ? 'question is' : 'questions are'
                      } unanswered. You can review them before submitting; unanswered questions count as zero.`}
                </p>
              </div>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit quiz'}
              </button>
            </div>
          </form>

          {saveStatus.type === 'saved' && (
            <p
              className="learning-save-status learning-save-status--saved"
              aria-live="polite"
            >
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

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import {
  fetchSmartRecoveryAttempt,
  saveSmartRecoveryAnswer,
  submitSmartRecoveryAttempt,
  type RecoveryAttempt,
} from '../lib/smart-recovery-api'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function RecoveryAttemptTopbar() {
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
    </LearnerTopbar>
  )
}

function saveStateLabel(saveState: SaveState): string {
  switch (saveState) {
    case 'saving':
      return 'Saving...'
    case 'saved':
      return 'Saved'
    case 'error':
      return 'Save failed'
    case 'idle':
      return 'Autosave active'
  }
}

export function SmartRecoveryAttemptView({
  attempt,
  currentIndex,
  reviewing,
  saveState,
  error,
  submitting,
  onChoose,
  onSelectQuestion,
  onPrevious,
  onNext,
  onReview,
  onSubmit,
}: {
  attempt: RecoveryAttempt
  currentIndex: number
  reviewing: boolean
  saveState: SaveState
  error: string | null
  submitting: boolean
  onChoose: (choicePublicId: string) => void
  onSelectQuestion: (index: number) => void
  onPrevious: () => void
  onNext: () => void
  onReview: () => void
  onSubmit: () => void
}) {
  const question = attempt.questions[currentIndex]
  if (question === undefined) return null

  const currentPosition = question.position
  const answeredCount = attempt.questions.filter(
    (item) => item.selectedChoicePublicId !== null,
  ).length
  const unansweredCount = attempt.totalCount - answeredCount
  const progressPercent = Math.round(
    (currentPosition / attempt.totalCount) * 100,
  )
  const saveText = saveStateLabel(saveState)

  return (
    <main
      className="page-shell quiz-page assessment-attempt-page smart-recovery-attempt-page"
      data-testid="recovery-attempt-page"
    >
      <RecoveryAttemptTopbar />

      <header
        className="recovery-attempt-context"
        aria-labelledby="recovery-attempt-heading"
      >
        <div className="recovery-attempt-context__skill">
          <div className="recovery-attempt-context__label">
            <span aria-hidden="true">✦</span>
            <p className="eyebrow">Smart Recovery</p>
          </div>
          <h1 id="recovery-attempt-heading">{question.skill.title}</h1>
          <p className="recovery-attempt-context__taxonomy">
            {question.subject.title}
            {question.topic !== null && ` · ${question.topic.title}`}
          </p>
          <p className="recovery-attempt-context__reason">
            Targeted practice for a current recovery priority.
          </p>
        </div>

        <div className="assessment-progress recovery-attempt-progress">
          <p className="recovery-attempt-progress__title">
            Targeted Recovery Set
          </p>
          <div className="assessment-progress__label">
            <strong>
              Question {currentPosition} of {attempt.totalCount}
            </strong>
            <span>{progressPercent}%</span>
          </div>
          <progress
            aria-label={`Recovery progress: question ${currentPosition} of ${attempt.totalCount}`}
            max={attempt.totalCount}
            value={currentPosition}
          />
          <p aria-live="polite">
            {answeredCount} of {attempt.totalCount} answered · {saveText}
          </p>
        </div>
      </header>

      <nav
        className="quiz-question-nav assessment-question-nav recovery-question-nav"
        aria-label="Recovery questions"
      >
        {attempt.questions.map((item, index) => {
          const isAnswered = item.selectedChoicePublicId !== null
          return (
            <button
              type="button"
              key={item.publicId}
              className={
                index === currentIndex
                  ? 'quiz-question-nav__item quiz-question-nav__item--current'
                  : isAnswered
                    ? 'quiz-question-nav__item quiz-question-nav__item--answered'
                    : 'quiz-question-nav__item'
              }
              aria-current={index === currentIndex ? 'step' : undefined}
              aria-label={`Question ${item.position}, ${isAnswered ? 'answered' : 'unanswered'}`}
              onClick={() => onSelectQuestion(index)}
            >
              <span>{item.position}</span>
              <small>{isAnswered ? 'Answered' : 'Unanswered'}</small>
            </button>
          )
        })}
      </nav>

      {reviewing ? (
        <section
          className="quiz-attempt-card recovery-attempt-review-card"
          aria-labelledby="recovery-review-heading"
        >
          <div className="recovery-review-heading">
            <p className="eyebrow">Final check</p>
            <h2 id="recovery-review-heading">Review your Recovery Set</h2>
            <p>
              Check your answers before submitting. You can still return to any
              question using the navigator above.
            </p>
          </div>

          <dl className="assessment-review-metrics recovery-review-metrics">
            <div className="assessment-review-metric assessment-review-metric--answered">
              <dt>Answered</dt>
              <dd>{answeredCount}</dd>
            </div>
            <div className="assessment-review-metric assessment-review-metric--unanswered">
              <dt>Unanswered</dt>
              <dd>{unansweredCount}</dd>
            </div>
            <div className="assessment-review-metric assessment-review-metric--total">
              <dt>Total</dt>
              <dd>{attempt.totalCount}</dd>
            </div>
          </dl>

          {unansweredCount > 0 ? (
            <p className="assessment-review-warning recovery-review-warning">
              {unansweredCount}{' '}
              {unansweredCount === 1 ? 'question is' : 'questions are'}
              {' '}unanswered. Unanswered questions count as zero.
            </p>
          ) : (
            <p className="recovery-review-ready">
              All questions are answered and ready for your final check.
            </p>
          )}

          <p className="recovery-review-return-hint">
            Select an answered or unanswered question in the navigator to review
            or change that answer before submission.
          </p>

          <div className="quiz-submit-row assessment-submit-row smart-recovery-review-submit">
            <div>
              <h3>Ready to submit?</h3>
              <p>
                Submission is final. Once submitted, your answers cannot be
                changed.
              </p>
            </div>
            <button
              className="recovery-submit-button"
              type="button"
              disabled={submitting || saveState === 'saving'}
              onClick={onSubmit}
            >
              {submitting ? 'Submitting...' : 'Submit Recovery Set'}
            </button>
          </div>
        </section>
      ) : (
        <section className="quiz-attempt-card recovery-attempt-question-card">
          <fieldset
            className="quiz-question recovery-question-fieldset"
            disabled={saveState === 'saving' || submitting}
          >
            <legend>
              <span className="recovery-question-kicker">
                Question {question.position} of {attempt.totalCount} ·{' '}
                {question.skill.title}
              </span>
              <span className="recovery-question-prompt">{question.prompt}</span>
            </legend>
            <div className="quiz-choice-list">
              {question.choices.map((choice, choiceIndex) => (
                <label className="quiz-choice" key={choice.publicId}>
                  <input
                    type="radio"
                    name={`recovery-${question.publicId}`}
                    value={choice.publicId}
                    checked={
                      question.selectedChoicePublicId === choice.publicId
                    }
                    onChange={() => onChoose(choice.publicId)}
                  />
                  <span className="assessment-choice-label" aria-hidden="true">
                    {String.fromCharCode(65 + choiceIndex)}
                  </span>
                  <span className="assessment-choice-text">{choice.text}</span>
                  <span
                    className="assessment-choice-selected"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="quiz-step-row assessment-step-row recovery-attempt-step-row">
            <button
              className="button-secondary"
              type="button"
              disabled={currentIndex === 0 || submitting || saveState === 'saving'}
              onClick={onPrevious}
            >
              Previous
            </button>
            {currentIndex < attempt.questions.length - 1 ? (
              <button
                type="button"
                disabled={submitting || saveState === 'saving'}
                onClick={onNext}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || saveState === 'saving'}
                onClick={onReview}
              >
                Review &amp; Submit
              </button>
            )}
            <p
              className="assessment-step-status recovery-attempt-step-status"
              aria-live="polite"
            >
              {saveText}
            </p>
          </div>
        </section>
      )}

      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}

export function SmartRecoveryAttemptPage() {
  const { attemptPublicId = '' } = useParams()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState<RecoveryAttempt | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewing, setReviewing] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const submitInFlight = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    void fetchSmartRecoveryAttempt(attemptPublicId, controller.signal)
      .then((response) => {
        if ('resultAvailable' in response) {
          void navigate(
            `/smart-recovery/attempts/${response.attempt.publicId}/results`,
            { replace: true },
          )
          return
        }
        setAttempt(response)
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'The recovery set could not be loaded.',
          )
        }
      })
    return () => controller.abort()
  }, [attemptPublicId, navigate])

  const question = attempt?.questions[currentIndex]

  async function choose(choicePublicId: string): Promise<void> {
    const question = attempt?.questions[currentIndex]
    if (attempt === null || question === undefined || saveState === 'saving') {
      return
    }

    const previous = question.selectedChoicePublicId
    setAttempt({
      ...attempt,
      questions: attempt.questions.map((item, index) =>
        index === currentIndex
          ? { ...item, selectedChoicePublicId: choicePublicId }
          : item,
      ),
    })
    setSaveState('saving')
    setError(null)

    try {
      await saveSmartRecoveryAnswer(
        attempt.attempt.publicId,
        question.publicId,
        choicePublicId,
      )
      setSaveState('saved')
    } catch (saveError: unknown) {
      setAttempt((current) =>
        current === null
          ? current
          : {
              ...current,
              questions: current.questions.map((item, index) =>
                index === currentIndex
                  ? { ...item, selectedChoicePublicId: previous }
                  : item,
              ),
            },
      )
      setSaveState('error')
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Your answer could not be saved.',
      )
    }
  }

  async function submit(): Promise<void> {
    if (attempt === null || submitInFlight.current) return
    submitInFlight.current = true
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitSmartRecoveryAttempt(attempt.attempt.publicId)
      await navigate(
        `/smart-recovery/attempts/${result.attempt.publicId}/results`,
        { replace: true },
      )
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'The recovery set could not be submitted.',
      )
      submitInFlight.current = false
      setSubmitting(false)
    }
  }

  if (error !== null && attempt === null) {
    return (
      <main className="page-shell">
        <RecoveryAttemptTopbar />
        <section className="recovery-state-card" role="alert">
          <h1>Recovery set could not be loaded</h1>
          <p>{error}</p>
          <Link className="button-link" to="/smart-recovery">
            Back to Smart Recovery
          </Link>
        </section>
      </main>
    )
  }

  if (attempt === null) {
    return <PasaWisePageLoader label="Restoring your Recovery Set…" />
  }

  if (question === undefined) {
    return (
      <main className="page-shell">
        <RecoveryAttemptTopbar />
        <section className="recovery-state-card" aria-live="polite">
          <h1>No questions in this recovery set</h1>
          <p>Start a new recovery set to continue.</p>
          <Link className="button-link" to="/smart-recovery">
            Back to Smart Recovery
          </Link>
        </section>
      </main>
    )
  }

  return (
    <SmartRecoveryAttemptView
      attempt={attempt}
      currentIndex={currentIndex}
      reviewing={reviewing}
      saveState={saveState}
      error={error}
      submitting={submitting}
      onChoose={(choicePublicId) => void choose(choicePublicId)}
      onSelectQuestion={(index) => {
        setCurrentIndex(index)
        setReviewing(false)
      }}
      onPrevious={() =>
        setCurrentIndex((index) => Math.max(0, index - 1))
      }
      onNext={() =>
        setCurrentIndex((index) =>
          Math.min(attempt.questions.length - 1, index + 1),
        )
      }
      onReview={() => setReviewing(true)}
      onSubmit={() => void submit()}
    />
  )
}

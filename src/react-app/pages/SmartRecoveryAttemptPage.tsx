import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import {
  fetchSmartRecoveryAttempt,
  saveSmartRecoveryAnswer,
  submitSmartRecoveryAttempt,
  type RecoveryAttempt,
} from '../lib/smart-recovery-api'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

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

  const answeredCount = useMemo(
    () =>
      attempt?.questions.filter(
        (question) => question.selectedChoicePublicId !== null,
      ).length ?? 0,
    [attempt],
  )
  const unansweredCount = attempt === null ? 0 : attempt.totalCount - answeredCount

  const question = attempt?.questions[currentIndex]
  const currentPosition = question?.position ?? currentIndex + 1

  const saveStateText =
    saveState === 'saving'
      ? 'Saving...'
      : saveState === 'saved'
        ? 'Saved'
        : saveState === 'error'
          ? 'Save failed'
          : 'Autosave active'

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
        <section className="recovery-state-card" role="alert">
          <h1>Recovery set could not be loaded</h1>
          <p>{error}</p>
          <Link to="/smart-recovery">Back to Smart Recovery</Link>
        </section>
      </main>
    )
  }
  if (attempt === null) {
    return (
      <main className="page-shell">
        <section className="recovery-state-card" aria-busy="true" aria-live="polite">
          <h1>Preparing your recovery set</h1>
          <p>Loading your saved progress.</p>
        </section>
      </main>
    )
  }
  if (question === undefined) {
    return (
      <main className="page-shell">
        <section className="recovery-state-card" aria-live="polite">
          <h1>No questions in this recovery set</h1>
          <p>Start a new recovery set to continue.</p>
          <Link to="/smart-recovery">Back to Smart Recovery</Link>
        </section>
      </main>
    )
  }

  return (
    <main
      className="page-shell quiz-page assessment-attempt-page smart-recovery-attempt-page"
      data-testid="recovery-attempt-page"
    >
      <header className="assessment-header">
        <p className="eyebrow">SMART RECOVERY</p>
        <h1 className="assessment-title">Recovery Set</h1>
        <div className="assessment-meta">
          <p aria-live="polite">
            Question {currentPosition} of {attempt.totalCount} {'\u00B7'} {answeredCount} answered {'\u00B7'} {saveStateText}
          </p>
        </div>
      </header>

      <nav className="quiz-question-nav" aria-label="Recovery questions">
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
              onClick={() => {
                setCurrentIndex(index)
                setReviewing(false)
              }}
            >
              <span>{item.position}</span>
              <small>{isAnswered ? 'Answered' : 'Unanswered'}</small>
            </button>
          )
        })}
      </nav>

      {reviewing ? (
        <section className="quiz-attempt-card">
          <p className="eyebrow">Review</p>
          <h1 id="recovery-review-heading">Review &amp; Submit Recovery Set</h1>
          <div className="question-status-chips smart-recovery-review-summary">
            <span className="question-status-chip">Answered {answeredCount}</span>
            <span className="question-status-chip">
              Unanswered {unansweredCount}
            </span>
          </div>
          <p className="meta-copy">
            You can review any question, then return to answer again before
            submitting. Unanswered questions score zero.
          </p>
          <div className="recovery-review-list">
            {attempt.questions.map((item, index) => (
              <button
                type="button"
                key={item.publicId}
                className={`recovery-review-question ${item.selectedChoicePublicId === null ? 'is-unanswered' : 'is-answered'}`}
                aria-label={`Question ${item.position}, ${item.selectedChoicePublicId === null ? 'unanswered' : 'answered'}`}
                onClick={() => {
                  setCurrentIndex(index)
                  setReviewing(false)
                }}
              >
                <span>Question {item.position}</span>
                <span className="recovery-review-question__meta">{item.skill.title}</span>
                <span className="recovery-review-question__status">
                  {item.selectedChoicePublicId === null ? 'Unanswered' : 'Answered'}
                </span>
              </button>
            ))}
          </div>
          <div className="quiz-submit-row smart-recovery-review-submit">
            <button
              type="button"
              disabled={submitting || saveState === 'saving'}
              onClick={() => void submit()}
            >
              {submitting ? 'Submitting...' : 'Submit Recovery Set'}
            </button>
            <p className="meta-copy">
              You can submit now. Any unanswered questions count as zero.
            </p>
          </div>
        </section>
      ) : (
        <section className="quiz-attempt-card">
          <fieldset className="quiz-question" disabled={saveState === 'saving' || submitting}>
            <legend>
              <span>Question {question.position} {'\u00B7'} {question.skill.title}</span>
              {question.prompt}
            </legend>
            <div className="quiz-choice-list">
              {question.choices.map((choice) => (
                <label className="quiz-choice" key={choice.publicId}>
                  <input
                    type="radio"
                    name={`recovery-${question.publicId}`}
                    value={choice.publicId}
                    checked={
                      question.selectedChoicePublicId === choice.publicId
                    }
                    onChange={() => void choose(choice.publicId)}
                  />
                  <span>{choice.text}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="quiz-step-row">
            <button
              className="button-secondary"
              type="button"
              disabled={currentIndex === 0 || submitting || saveState === 'saving'}
              onClick={() =>
                setCurrentIndex((index) => Math.max(0, index - 1))
              }
            >
              Previous
            </button>
            {currentIndex < attempt.questions.length - 1 ? (
              <button
                className="button-secondary"
                type="button"
                disabled={submitting || saveState === 'saving'}
                onClick={() =>
                  setCurrentIndex((index) =>
                    Math.min(attempt.questions.length - 1, index + 1),
                  )
                }
              >
                Next
              </button>
            ) : (
              <button
                className="button-secondary"
                type="button"
                disabled={submitting || saveState === 'saving'}
                onClick={() => setReviewing(true)}
              >
                Review &amp; Submit
              </button>
            )}
          </div>
          <div className="quiz-submit-row">
            {saveState === 'saving' && (
              <p className="meta-copy" aria-live="polite">
                Saving answer...
              </p>
            )}

          </div>
        </section>
      )}

      {error !== null && <p className="form-error" role="alert">{error}</p>}
    </main>
  )
}


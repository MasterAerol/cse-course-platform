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
    return <main className="page-shell"><section className="recovery-state-card" role="alert"><h1>Recovery set could not be loaded</h1><p>{error}</p><Link to="/smart-recovery">Back to Smart Recovery</Link></section></main>
  }
  if (attempt === null) {
    return <main className="page-shell"><section className="recovery-state-card" aria-busy="true" aria-live="polite"><h1>Preparing your recovery set</h1><p>Loading your saved progress.</p></section></main>
  }

  const question = attempt.questions[currentIndex]
  return (
    <main className="page-shell recovery-attempt-page" data-testid="recovery-attempt-page">
      <header className="recovery-attempt-header">
        <Link to="/smart-recovery">Smart Recovery</Link>
        <div>
          <strong>{answeredCount} of {attempt.totalCount} answered</strong>
          <span className={`recovery-save-state recovery-save-state--${saveState}`} role="status" aria-live="polite">
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : 'Answers autosave'}
          </span>
        </div>
      </header>

      <nav className="recovery-question-navigator" aria-label="Recovery questions">
        {attempt.questions.map((item, index) => (
          <button
            type="button"
            key={item.publicId}
            className={index === currentIndex ? 'is-current' : item.selectedChoicePublicId === null ? '' : 'is-answered'}
            aria-current={index === currentIndex ? 'step' : undefined}
            aria-label={`Question ${item.position}, ${item.selectedChoicePublicId === null ? 'unanswered' : 'answered'}`}
            onClick={() => { setCurrentIndex(index); setReviewing(false) }}
          >
            {item.position}
          </button>
        ))}
      </nav>

      {reviewing ? (
        <section className="recovery-question-card" aria-labelledby="recovery-review-heading">
          <p className="eyebrow">Review</p>
          <h1 id="recovery-review-heading">Review &amp; Submit Recovery Set</h1>
          <p>{answeredCount} answered and {attempt.totalCount - answeredCount} unanswered. Unanswered questions score zero.</p>
          <div className="recovery-review-list">
            {attempt.questions.map((item, index) => <button type="button" key={item.publicId} onClick={() => { setCurrentIndex(index); setReviewing(false) }}>Question {item.position}: {item.selectedChoicePublicId === null ? 'Unanswered' : 'Answered'}</button>)}
          </div>
          <button type="button" disabled={submitting || saveState === 'saving'} onClick={() => void submit()}>{submitting ? 'Submitting...' : 'Submit Recovery Set'}</button>
        </section>
      ) : question === undefined ? null : (
        <section className="recovery-question-card" aria-labelledby="recovery-question-heading">
          <p className="eyebrow">Question {question.position} of {attempt.totalCount} · {question.skill.title}</p>
          <h1 id="recovery-question-heading">{question.prompt}</h1>
          <fieldset className="recovery-choice-list" disabled={saveState === 'saving' || submitting}>
            <legend className="visually-hidden">Choose one answer</legend>
            {question.choices.map((choice) => (
              <label key={choice.publicId}>
                <input type="radio" name={`recovery-${question.publicId}`} value={choice.publicId} checked={question.selectedChoicePublicId === choice.publicId} onChange={() => void choose(choice.publicId)} />
                <span>{choice.text}</span>
              </label>
            ))}
          </fieldset>
          <div className="recovery-attempt-actions">
            <button type="button" className="button-secondary" disabled={currentIndex === 0 || saveState === 'saving'} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}>Previous</button>
            {currentIndex < attempt.questions.length - 1 ? <button type="button" disabled={saveState === 'saving'} onClick={() => setCurrentIndex((index) => Math.min(attempt.questions.length - 1, index + 1))}>Next</button> : <button type="button" disabled={saveState === 'saving'} onClick={() => setReviewing(true)}>Review &amp; Submit</button>}
          </div>
        </section>
      )}

      {error !== null && <p className="form-error" role="alert">{error}</p>}
    </main>
  )
}

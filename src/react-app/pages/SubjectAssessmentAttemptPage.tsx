import { useEffect, useRef, useState } from 'react'
import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import { Link, useNavigate, useParams } from 'react-router'

import {
  fetchSubjectAssessmentAttempt,
  saveSubjectAssessmentChoice,
  submitSubjectAssessment,
  type SubjectAssessmentAttempt,
} from '../lib/api'
import {
  getSubjectAssessmentResultUrl,
  getSubjectAssessmentSubmitError,
} from '../lib/subject-assessment-submit'

export function SubjectAssessmentAttemptPage() {
  const { attemptPublicId = '' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<SubjectAssessmentAttempt | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const submitInFlight = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchSubjectAssessmentAttempt(attemptPublicId, controller.signal)
      .then((attempt) => {
        if ('resultAvailable' in attempt) {
          void navigate(`/assessment-attempts/${attempt.attempt.publicId}/results`, {
            replace: true,
          })
          return
        }
        setData(attempt)
        setSavedMessage(
          `Saved ${attempt.answeredCount} of ${attempt.totalCount} answers.`,
        )
      })
      .catch((value: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            value instanceof Error
              ? value.message
              : 'Attempt could not be loaded.',
          )
        }
      })

    return () => controller.abort()
  }, [attemptPublicId, navigate])

  async function choose(questionId: string, choiceId: string): Promise<void> {
    if (data === null) return

    const previous = data
    const nextQuestions = data.questions.map((question) =>
      question.publicId === questionId
        ? { ...question, selectedChoicePublicId: choiceId }
        : question,
    )
    const nextAnsweredCount = nextQuestions.filter(
      (question) => question.selectedChoicePublicId !== null,
    ).length

    setData({
      ...data,
      questions: nextQuestions,
      answeredCount: nextAnsweredCount,
    })
    setSavingQuestionId(questionId)
    setSavedMessage(null)
    setError(null)

    try {
      await saveSubjectAssessmentChoice(attemptPublicId, questionId, choiceId)
      setSavedMessage(
        `Saved ${nextAnsweredCount} of ${data.totalCount} answers.`,
      )
    } catch (value: unknown) {
      setData(previous)
      setError(
        value instanceof Error ? value.message : 'Answer could not be saved.',
      )
    } finally {
      setSavingQuestionId(null)
    }
  }

  async function submit(): Promise<void> {
    if (data === null || submitInFlight.current) return

    const unanswered = data.totalCount - data.answeredCount
    const confirmed = window.confirm(
      `${data.assessment.title}\n\nAnswered: ${data.answeredCount}\nUnanswered: ${unanswered}\nTotal: ${data.totalCount}\n\n${
        unanswered > 0
          ? 'Unanswered questions will count as zero. '
          : 'All questions are answered. '
      }Submit this assessment? Answers cannot be changed afterward. Select Cancel to continue reviewing.`,
    )
    if (!confirmed) return

    setSubmitting(true)
    submitInFlight.current = true
    setError(null)
    try {
      const result = await submitSubjectAssessment(attemptPublicId)
      await navigate(getSubjectAssessmentResultUrl(result), { replace: true })
    } catch (value: unknown) {
      setSubmitting(false)
      submitInFlight.current = false
      setError(getSubjectAssessmentSubmitError(value))
    }
  }

  if (data === null && error === null) {
    return <PasaWisePageLoader label="Restoring your assessment attempt…" />
  }

  return (
    <main className="page-shell quiz-page assessment-attempt-page">
      <LearnerTopbar as="header">
        <Link className="button-link button-link--secondary" to="/dashboard">
          Dashboard
        </Link>
      </LearnerTopbar>

      {error !== null && data === null && (
        <section className="message-card" role="alert">
          <h1>Assessment unavailable</h1>
          <p>{error}</p>
          <Link className="button-link" to="/dashboard">
            Return to dashboard
          </Link>
        </section>
      )}

      {data !== null && (() => {
        const question = data.questions[currentQuestionIndex] ?? null
        const unansweredCount = data.totalCount - data.answeredCount
        const currentQuestionNumber = question?.position ?? currentQuestionIndex + 1
        const progressPercent = Math.round(
          (currentQuestionNumber / data.totalCount) * 100,
        )

        return (
          <section className="quiz-attempt-card subject-assessment-workspace">
            <header className="assessment-header">
              <div className="assessment-header__identity">
                <p className="eyebrow">
                  Subject assessment {'\u00B7'} Attempt {data.attempt.attemptNumber}
                </p>
                <h1 className="assessment-title">{data.assessment.title}</h1>
                <p className="assessment-header__details">
                  {data.assessment.questionCount} questions {'\u00B7'} Passing score{' '}
                  {data.assessment.passingScore}%
                </p>
              </div>
              <div className="assessment-progress" aria-live="polite">
                <div className="assessment-progress__label">
                  <strong>Question {currentQuestionNumber} of {data.totalCount}</strong>
                  <span>{progressPercent}%</span>
                </div>
                <progress
                  aria-label={`Assessment progress: question ${currentQuestionNumber} of ${data.totalCount}`}
                  max={data.totalCount}
                  value={currentQuestionNumber}
                />
                <p>Answered {data.answeredCount} of {data.totalCount}</p>
              </div>
            </header>

            <nav
              className="quiz-question-nav assessment-question-nav"
              aria-label="Assessment question navigation"
            >
              {data.questions.map((item, position) => {
                const isAnswered = item.selectedChoicePublicId !== null
                const isCurrent = position === currentQuestionIndex
                return (
                  <button
                    className={`quiz-question-nav__item${
                      isCurrent ? ' quiz-question-nav__item--current' : ''
                    }${isAnswered ? ' quiz-question-nav__item--answered' : ''}`}
                    type="button"
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={`Question ${item.position}, ${isCurrent ? 'current, ' : ''}${isAnswered ? 'answered' : 'unanswered'}`}
                    key={item.publicId}
                    onClick={() => setCurrentQuestionIndex(position)}
                  >
                    <span>{position + 1}</span>
                    <small>{isAnswered ? 'Answered' : 'Unanswered'}</small>
                  </button>
                )
              })}
            </nav>

            <form
              className="quiz-question-list"
              onSubmit={(event) => {
                event.preventDefault()
                void submit()
              }}
            >
              {question !== null && (
                <fieldset className="quiz-question assessment-question-card">
                  <legend>
                    <span className="assessment-question-kicker">
                      Question {question.position} of {data.totalCount}
                    </span>
                    <span className="assessment-question-prompt">
                      {question.prompt}
                    </span>
                  </legend>
                  <div className="quiz-choice-list">
                    {question.choices.map((choice, choiceIndex) => (
                      <label className="quiz-choice" key={choice.publicId}>
                        <input
                          type="radio"
                          name={question.publicId}
                          checked={
                            question.selectedChoicePublicId === choice.publicId
                          }
                          disabled={submitting}
                          onChange={() =>
                            void choose(question.publicId, choice.publicId)
                          }
                        />
                        <span className="assessment-choice-label" aria-hidden="true">
                          {String.fromCharCode(65 + choiceIndex)}
                        </span>
                        <span className="assessment-choice-text">{choice.text}</span>
                        <span className="assessment-choice-selected" aria-hidden="true">
                          ✓
                        </span>
                      </label>
                    ))}
                  </div>
                  {savingQuestionId === question.publicId && (
                    <p className="meta-copy">Saving answer...</p>
                  )}
                </fieldset>
              )}

              <div className="quiz-step-row assessment-step-row">
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
                    currentQuestionIndex >= data.questions.length - 1 ||
                    submitting
                  }
                  onClick={() =>
                    setCurrentQuestionIndex((index) =>
                      Math.min(data.questions.length - 1, index + 1),
                    )
                  }
                >
                  Next
                </button>
                <p className="assessment-step-status" aria-live="polite">
                  Question {currentQuestionNumber} of {data.totalCount}
                </p>
              </div>

              <section
                className="assessment-review-summary"
                aria-labelledby="assessment-review-summary-title"
              >
                <div>
                  <p className="eyebrow">Final check</p>
                  <h2 id="assessment-review-summary-title">Review before submitting</h2>
                  <p>
                    Use the question navigator above to return to any question
                    and change an answer before final submission.
                  </p>
                </div>
                <dl className="assessment-review-metrics" aria-label="Answer summary">
                  <div className="assessment-review-metric assessment-review-metric--answered">
                    <dt>Answered</dt>
                    <dd>{data.answeredCount}</dd>
                  </div>
                  <div className="assessment-review-metric assessment-review-metric--unanswered">
                    <dt>Unanswered</dt>
                    <dd>{unansweredCount}</dd>
                  </div>
                  <div className="assessment-review-metric assessment-review-metric--total">
                    <dt>Total</dt>
                    <dd>{data.totalCount}</dd>
                  </div>
                </dl>
                <p className="assessment-review-warning">
                  {unansweredCount > 0
                    ? `${unansweredCount} unanswered ${unansweredCount === 1 ? 'question' : 'questions'} will count as zero.`
                    : 'All questions have an answer. You can still review them before submitting.'}
                </p>
              </section>

              <div className="quiz-submit-row assessment-submit-row">
                <button className="assessment-submit-button" type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Assessment'}
                </button>
                <p className="meta-copy">
                  Submission is final. Answers cannot be changed afterward.
                </p>
              </div>
            </form>

            {savedMessage !== null && (
              <p className="form-success" aria-live="polite">
                {savedMessage}
              </p>
            )}
            {error !== null && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </section>
        )
      })()}
    </main>
  )
}
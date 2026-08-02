import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import {
  fetchSubjectAssessmentAttempt,
  saveSubjectAssessmentChoice,
  submitSubjectAssessment,
  type SubjectAssessmentAttempt,
} from '../lib/api'

export function SubjectAssessmentAttemptPage() {
  const { attemptPublicId = '' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<SubjectAssessmentAttempt | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchSubjectAssessmentAttempt(attemptPublicId, controller.signal)
      .then((attempt) => {
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
  }, [attemptPublicId])

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
    if (data === null) return

    const unanswered = data.totalCount - data.answeredCount
    const confirmed = window.confirm(
      `${unanswered > 0 ? `${unanswered} questions are unanswered. ` : ''}Submit this assessment? Answers cannot be changed afterward.`,
    )
    if (!confirmed) return

    setSubmitting(true)
    setError(null)
    try {
      await submitSubjectAssessment(attemptPublicId)
      await navigate(`/assessment-attempts/${attemptPublicId}/results`)
    } catch (value: unknown) {
      setSubmitting(false)
      setError(
        value instanceof Error
          ? value.message
          : 'Assessment could not be submitted.',
      )
    }
  }

  return (
    <main className="page-shell quiz-page">
      <header className="topbar">
        <Link className="brand-link" to="/">
          CSE Course Platform
        </Link>
        <div className="topbar-actions">
          <Link className="button-link button-link--secondary" to="/dashboard">
            Dashboard
          </Link>
        </div>
      </header>

      {error !== null && data === null && (
        <section className="message-card" role="alert">
          <h1>Assessment unavailable</h1>
          <p>{error}</p>
          <Link className="button-link" to="/dashboard">
            Return to dashboard
          </Link>
        </section>
      )}

      {data === null && error === null && (
        <section className="message-card" aria-live="polite">
          <p>Restoring your assessment attempt...</p>
        </section>
      )}

      {data !== null && (() => {
        const question = data.questions[currentQuestionIndex] ?? null
        const unansweredCount = data.totalCount - data.answeredCount

        return (
          <section className="quiz-attempt-card">
            <p className="eyebrow">Attempt {data.attempt.attemptNumber}</p>
            <h1>{data.assessment.title}</h1>
            <p>
              Passing score: {data.assessment.passingScore}% · Questions:{' '}
              {data.assessment.questionCount}
            </p>
            <p className="meta-copy" aria-live="polite">
              Answered {data.answeredCount} of {data.totalCount}
            </p>

            <nav className="quiz-question-nav" aria-label="Question navigation">
              {data.questions.map((item, position) => {
                const isAnswered = item.selectedChoicePublicId !== null
                return (
                  <button
                    className={
                      position === currentQuestionIndex
                        ? 'quiz-question-nav__item quiz-question-nav__item--current'
                        : isAnswered
                          ? 'quiz-question-nav__item quiz-question-nav__item--answered'
                          : 'quiz-question-nav__item'
                    }
                    type="button"
                    aria-current={
                      position === currentQuestionIndex ? 'step' : undefined
                    }
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
                <fieldset className="quiz-question">
                  <legend>
                    <span>Question {question.position}</span>
                    {question.prompt}
                  </legend>
                  <div className="quiz-choice-list">
                    {question.choices.map((choice) => (
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
                        <span>{choice.text}</span>
                      </label>
                    ))}
                  </div>
                  {savingQuestionId === question.publicId && (
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
              </div>

              <div className="quiz-submit-row">
                <button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Assessment'}
                </button>
                <p className="meta-copy">
                  {unansweredCount} unanswered. You can submit with unanswered
                  questions, but they count as zero.
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

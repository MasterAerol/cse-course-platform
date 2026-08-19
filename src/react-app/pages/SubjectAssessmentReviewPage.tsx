import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import { fetchSubjectAssessmentReview, type SubjectAssessmentReview } from '../lib/api'

export function SubjectAssessmentReviewPage() {
  const { attemptPublicId = '' } = useParams()
  const [review, setReview] = useState<SubjectAssessmentReview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchSubjectAssessmentReview(attemptPublicId, controller.signal)
      .then(setReview)
      .catch((value: unknown) => {
        if (!controller.signal.aborted) {
          setError(value instanceof Error ? value.message : 'Review could not be loaded.')
        }
      })
    return () => controller.abort()
  }, [attemptPublicId])

  if (error !== null) {
    return (
      <main className="dashboard-page">
        <LearnerTopbar showSignOut>
          <Link className="button-link button-link--secondary" to={`/assessment-attempts/${attemptPublicId}/results`}>
            Back to results
          </Link>
          <Link className="button-link button-link--secondary" to="/dashboard">
            Dashboard
          </Link>
        </LearnerTopbar>
        <p className="form-error" role="alert">{error}</p>
      </main>
    )
  }

  if (review === null) {
    return <PasaWisePageLoader label="Opening your answer review…" />
  }

  return (
    <main className="page-shell subject-assessment-review-page">
      <LearnerTopbar as="header" showSignOut>
        <Link className="button-link button-link--secondary" to={`/assessment-attempts/${attemptPublicId}/results`}>
          Back to results
        </Link>
        <Link className="button-link button-link--secondary" to="/dashboard">
          Dashboard
        </Link>
      </LearnerTopbar>

      <header className="assessment-review-header">
        <div>
          <p className="eyebrow">Attempt {review.attempt.attemptNumber}</p>
          <h1>Answer Review</h1>
          <p>Compare your answers with the correct choices and explanations.</p>
        </div>
        <dl className="assessment-review-result-metrics" aria-label="Answer review summary">
          <div className="assessment-result-metric assessment-result-metric--correct">
            <dt>Correct</dt>
            <dd>{review.breakdown.correctCount}</dd>
          </div>
          <div className="assessment-result-metric assessment-result-metric--incorrect">
            <dt>Incorrect</dt>
            <dd>{review.breakdown.incorrectCount}</dd>
          </div>
          <div className="assessment-result-metric assessment-result-metric--unanswered">
            <dt>Unanswered</dt>
            <dd>{review.breakdown.unansweredCount}</dd>
          </div>
        </dl>
      </header>

      <section className="assessment-answer-review" aria-labelledby="assessment-answer-review-title">
        <div className="assessment-answer-review__heading">
          <p className="eyebrow">Question details</p>
          <h2 id="assessment-answer-review-title">Your answers, explained</h2>
        </div>
        <div className="assessment-answer-review-list">
          {review.questions.map((question) => {
            const reviewState = question.unanswered
              ? 'unanswered'
              : question.isCorrect
                ? 'correct'
                : 'incorrect'
            const reviewLabel = question.unanswered
              ? 'Unanswered'
              : question.isCorrect
                ? 'Correct'
                : 'Incorrect'

            return (
              <article
                className={`assessment-answer-card assessment-answer-card--${reviewState}`}
                key={question.publicId}
              >
                <header className="assessment-answer-card__header">
                  <div>
                    <p className="eyebrow">
                      Question {question.position}{' \u00B7 '}{question.topic.title}{' \u00B7 '}{question.difficulty}
                    </p>
                    <h3>{question.prompt}</h3>
                  </div>
                  <span className={`assessment-answer-status assessment-answer-status--${reviewState}`}>
                    {reviewLabel}
                  </span>
                </header>

                <dl className="assessment-answer-comparison">
                  <div className="assessment-answer-comparison__learner">
                    <dt>Your answer</dt>
                    <dd>{question.selectedChoice?.text ?? 'No answer selected'}</dd>
                  </div>
                  <div className="assessment-answer-comparison__correct">
                    <dt>Correct answer</dt>
                    <dd>{question.correctChoice.text}</dd>
                  </div>
                </dl>

                {question.explanation !== null && (
                  <div className="assessment-answer-explanation">
                    <h4>Explanation</h4>
                    <p>{question.explanation}</p>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <nav className="assessment-review-actions" aria-label="Answer review actions">
        <Link className="button-link" to={`/assessment-attempts/${attemptPublicId}/results`}>
          Back to Results
        </Link>
        <Link
          className="button-link button-link--secondary"
          to={`/assessments/${review.assessment.slug}`}
        >
          Assessment History
        </Link>
      </nav>
    </main>
  )
}

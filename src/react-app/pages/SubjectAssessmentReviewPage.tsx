import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
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
        <p>Loading review…</p>
      </main>
    )
  }

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
      <h1>Answer review</h1>
      <div className="review-list">
        {review.questions.map((question) => (
          <article
            className={`dashboard-card ${question.isCorrect ? 'review-correct' : 'review-incorrect'}`}
            key={question.publicId}
          >
            <p className="eyebrow">
              Question {question.position} · {question.topic.title} · {question.difficulty}
            </p>
            <h2>{question.prompt}</h2>
            <p>
              Your answer: <strong>{question.selectedChoice?.text ?? 'Unanswered'}</strong>
            </p>
            <p>
              Correct answer: <strong>{question.correctChoice.text}</strong>
            </p>
            {question.explanation !== null && <p>{question.explanation}</p>}
          </article>
        ))}
      </div>
    </main>
  )
}

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import { fetchSubjectAssessmentResult, type SubjectAssessmentResult } from '../lib/api'

export function SubjectAssessmentResultPage() {
  const { attemptPublicId = '' } = useParams()
  const [result, setResult] = useState<SubjectAssessmentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchSubjectAssessmentResult(attemptPublicId, controller.signal)
      .then(setResult)
      .catch((value: unknown) => {
        if (!controller.signal.aborted) {
          setError(value instanceof Error ? value.message : 'Results could not be loaded.')
        }
      })
    return () => controller.abort()
  }, [attemptPublicId])

  if (error !== null) {
    return (
      <main className="dashboard-page">
        <LearnerTopbar showSignOut>
          <Link className="button-link button-link--secondary" to="/dashboard">
            Dashboard
          </Link>
        </LearnerTopbar>
        <p className="form-error" role="alert">{error}</p>
      </main>
    )
  }

  if (result === null) {
    return <PasaWisePageLoader label="Checking your assessment results…" />
  }

  const statusLabel = result.passed ? 'Passed' : 'Needs Improvement'

  return (
    <main className="page-shell subject-assessment-result-page">
      <LearnerTopbar as="header" showSignOut>
        <Link className="button-link button-link--secondary" to="/dashboard">
          Dashboard
        </Link>
      </LearnerTopbar>

      <section
        className={`assessment-result-hero ${
          result.passed
            ? 'assessment-result-hero--passed'
            : 'assessment-result-hero--needs-improvement'
        }`}
        aria-labelledby="assessment-result-title"
      >
        <div className="assessment-result-hero__summary">
          <p className="eyebrow">Attempt {result.attempt.attemptNumber}</p>
          <p className="assessment-result-status" aria-label={`Status: ${statusLabel}`}>
            {statusLabel}
          </p>
          <h1 id="assessment-result-title">{result.assessment.title}</h1>
          <p
            className="assessment-result-score"
            aria-label={`${result.earnedPoints} out of ${result.totalPoints}, ${result.scorePercent} percent`}
          >
            <strong>{result.earnedPoints} / {result.totalPoints}</strong>
            <span>{result.scorePercent}%</span>
          </p>
          <p className="assessment-result-passing">
            Passing score: {result.assessment.passingScore}% ({result.assessment.passingTarget} correct)
          </p>
          <p className="assessment-result-feedback">{result.feedback}</p>
        </div>

        <dl className="assessment-result-metrics" aria-label="Assessment result summary">
          <div className="assessment-result-metric assessment-result-metric--correct">
            <dt>Correct</dt>
            <dd>{result.breakdown.correctCount}</dd>
          </div>
          <div className="assessment-result-metric assessment-result-metric--incorrect">
            <dt>Incorrect</dt>
            <dd>{result.breakdown.incorrectCount}</dd>
          </div>
          <div className="assessment-result-metric assessment-result-metric--unanswered">
            <dt>Unanswered</dt>
            <dd>{result.breakdown.unansweredCount}</dd>
          </div>
          <div className="assessment-result-metric assessment-result-metric--total">
            <dt>Total</dt>
            <dd>{result.totalPoints}</dd>
          </div>
        </dl>
      </section>

      <section className="assessment-result-section" aria-labelledby="assessment-topic-results-title">
        <div className="assessment-result-section__heading">
          <div>
            <p className="eyebrow">Performance by topic</p>
            <h2 id="assessment-topic-results-title">Where to focus next</h2>
          </div>
          <p>
            Strongest: <strong>{result.breakdown.strongestTopic.topicTitle}</strong>
            {' \u00B7 '}Needs focus: <strong>{result.breakdown.weakestTopic.topicTitle}</strong>
          </p>
        </div>
        <div className="assessment-topic-results">
          {result.breakdown.topics.map((topic) => (
            <article className="assessment-topic-result" key={topic.topicSlug}>
              <div>
                <h3>{topic.topicTitle}</h3>
                <p>{topic.correctCount} of {topic.totalQuestions} correct</p>
              </div>
              <div className="assessment-topic-result__score">
                <strong>{topic.percentage}%</strong>
                <span>{topic.status}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="assessment-result-actions" aria-labelledby="assessment-next-actions-title">
        <div>
          <p className="eyebrow">Next step</p>
          <h2 id="assessment-next-actions-title">Turn your result into progress</h2>
          <p>Review each answer, then use your assessment history or readiness plan to continue.</p>
        </div>
        <div className="assessment-actions">
          <Link className="button-link" to={`/assessment-attempts/${attemptPublicId}/review`}>
            Review Answers
          </Link>
          <Link
            className="button-link button-link--secondary"
            to={`/assessments/${result.assessment.slug}`}
          >
            Assessment History
          </Link>
          <Link className="button-link button-link--secondary" to="/readiness">
            View Readiness
          </Link>
        </div>
      </section>
    </main>
  )
}

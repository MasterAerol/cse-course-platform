import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import { fetchMockReview } from '../lib/mock-exam-api'

type Review = Awaited<ReturnType<typeof fetchMockReview>>

function MockReviewTopbar({ attemptPublicId }: { attemptPublicId: string }) {
  return (
    <LearnerTopbar
      as="header"
      mobileCollapsible
      showSignOut
      ariaLabel="Main navigation"
    >
      <Link
        className="button-link button-link--secondary"
        to={`/mock-exam-attempts/${attemptPublicId}/results`}
      >
        Back to Results
      </Link>
      <Link className="button-link button-link--secondary" to="/dashboard">
        Dashboard
      </Link>
    </LearnerTopbar>
  )
}

export function MockExamReviewView({
  data,
  attemptPublicId,
  subject,
  state,
  onSubjectChange,
  onStateChange,
}: {
  data: Review
  attemptPublicId: string
  subject: string
  state: string
  onSubjectChange: (value: string) => void
  onStateChange: (value: string) => void
}) {
  const filtered = useMemo(
    () =>
      data.questions.filter(
        (question) =>
          (subject === 'all' || question.subject.slug === subject) &&
          (state === 'all' ||
            (state === 'correct' && question.isCorrect) ||
            (state === 'incorrect' &&
              !question.isCorrect &&
              !question.unanswered) ||
            (state === 'unanswered' && question.unanswered) ||
            (state === 'marked' && question.markedForReview)),
      ),
    [data.questions, subject, state],
  )

  return (
    <main className="page-shell mock-review-page">
      <MockReviewTopbar attemptPublicId={attemptPublicId} />

      <header className="mock-review-header">
        <div>
          <p className="eyebrow">Full Mock · Attempt {data.attempt.attemptNumber}</p>
          <h1>Answer Review</h1>
          <p>
            Compare your submitted answers with the stored correct choices and
            explanations.
          </p>
        </div>
        <dl className="mock-review-metrics" aria-label="Answer review summary">
          <div className="mock-result-metric mock-result-metric--correct">
            <dt>Correct</dt>
            <dd>{data.correctCount}</dd>
          </div>
          <div className="mock-result-metric mock-result-metric--incorrect">
            <dt>Incorrect</dt>
            <dd>{data.incorrectCount}</dd>
          </div>
          <div className="mock-result-metric mock-result-metric--unanswered">
            <dt>Unanswered</dt>
            <dd>{data.unansweredCount}</dd>
          </div>
          <div className="mock-result-metric mock-result-metric--total">
            <dt>Total</dt>
            <dd>{data.totalPoints}</dd>
          </div>
        </dl>
      </header>

      <section
        className="mock-review-workspace"
        aria-labelledby="mock-answer-review-heading"
      >
        <div className="mock-review-workspace__heading">
          <div>
            <p className="eyebrow">Question details</p>
            <h2 id="mock-answer-review-heading">Your answers, explained</h2>
          </div>
          <div className="mock-review-filters" aria-label="Answer review filters">
            <label>
              Subject
              <select
                value={subject}
                onChange={(event) => onSubjectChange(event.target.value)}
              >
                <option value="all">All subjects</option>
                {data.subjects.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Result
              <select
                value={state}
                onChange={(event) => onStateChange(event.target.value)}
              >
                <option value="all">All</option>
                <option value="correct">Correct</option>
                <option value="incorrect">Incorrect</option>
                <option value="unanswered">Unanswered</option>
                <option value="marked">Marked for review</option>
              </select>
            </label>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mock-review-empty">
            <h3>No questions match these filters</h3>
            <p>Choose a different subject or result state.</p>
          </div>
        ) : (
          <div className="mock-answer-review-list">
            {filtered.map((question) => {
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
                  className={`mock-answer-card mock-answer-card--${reviewState}`}
                  key={question.publicId}
                >
                  <header className="mock-answer-card__header">
                    <div>
                      <p className="eyebrow">
                        Question {question.position} · {question.subject.title} ·{' '}
                        {question.topic.title} · {question.difficulty}
                      </p>
                      <h3>{question.prompt}</h3>
                    </div>
                    <div className="mock-answer-card__states">
                      {question.markedForReview ? (
                        <span className="mock-answer-marked">Marked for review</span>
                      ) : null}
                      <span
                        className={`mock-answer-status mock-answer-status--${reviewState}`}
                      >
                        {reviewLabel}
                      </span>
                    </div>
                  </header>

                  <ul className="mock-answer-choice-list" aria-label="Answer choices">
                    {question.choices.map((choice, choiceIndex) => {
                      const correct =
                        choice.publicId === question.correctChoice.publicId
                      const selected =
                        choice.publicId === question.selectedChoice?.publicId

                      return (
                        <li
                          className={`${correct ? 'is-correct' : ''}${
                            selected ? ' is-selected' : ''
                          }`}
                          key={choice.publicId}
                        >
                          <span className="mock-answer-choice-label">
                            {String.fromCharCode(65 + choiceIndex)}
                          </span>
                          <span>{choice.text}</span>
                          <span className="mock-answer-choice-states">
                            {selected ? <small>Your answer</small> : null}
                            {correct ? <small>Correct answer</small> : null}
                          </span>
                        </li>
                      )
                    })}
                  </ul>

                  {question.unanswered ? (
                    <p className="mock-answer-unanswered">
                      No answer was selected for this question.
                    </p>
                  ) : null}

                  {question.explanation !== null ? (
                    <div className="mock-answer-explanation">
                      <h4>Explanation</h4>
                      <p>{question.explanation}</p>
                    </div>
                  ) : null}

                  {question.source != null ? (
                    <p className="meta-copy mock-answer-source">
                      Source:{' '}
                      {typeof question.source === 'string'
                        ? question.source
                        : JSON.stringify(question.source)}
                    </p>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <nav className="mock-review-actions" aria-label="Answer review actions">
        <Link
          className="button-link"
          to={`/mock-exam-attempts/${attemptPublicId}/results`}
        >
          Back to Results
        </Link>
        <Link
          className="button-link button-link--secondary"
          to={`/mock-examinations/${data.examination.slug}`}
        >
          Full Mock History
        </Link>
      </nav>
    </main>
  )
}

export function MockExamReviewPage() {
  const { attemptPublicId = '' } = useParams()
  const [data, setData] = useState<Review | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [subject, setSubject] = useState('all')
  const [state, setState] = useState('all')

  useEffect(() => {
    const controller = new AbortController()
    fetchMockReview(attemptPublicId, controller.signal)
      .then(setData)
      .catch((value: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            value instanceof Error ? value.message : 'Review unavailable.',
          )
        }
      })
    return () => controller.abort()
  }, [attemptPublicId])

  if (error !== null) {
    return (
      <main className="page-shell mock-review-page">
        <MockReviewTopbar attemptPublicId={attemptPublicId} />
        <p className="form-error" role="alert">
          {error}
        </p>
      </main>
    )
  }

  if (data === null) {
    return <PasaWisePageLoader label="Opening your Full Mock review…" />
  }

  return (
    <MockExamReviewView
      data={data}
      attemptPublicId={attemptPublicId}
      subject={subject}
      state={state}
      onSubjectChange={setSubject}
      onStateChange={setState}
    />
  )
}

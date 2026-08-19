import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import {
  fetchSmartRecoveryResult,
  type RecoveryResult,
} from '../lib/smart-recovery-api'
import {
  formatSmartRecoveryDate,
  formatSmartRecoveryLabel,
} from '../lib/smart-recovery-format'

type RecoveryAnswerState = 'correct' | 'incorrect' | 'unanswered'

function RecoveryResultTopbar() {
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
      <Link className="button-link button-link--secondary" to="/smart-recovery">
        Smart Recovery
      </Link>
      <Link className="button-link button-link--secondary" to="/courses">
        Courses
      </Link>
    </LearnerTopbar>
  )
}

function answerState(
  question: RecoveryResult['questions'][number],
): RecoveryAnswerState {
  if (question.selectedChoice === null) return 'unanswered'
  return question.isCorrect ? 'correct' : 'incorrect'
}

function signalAccuracy(value: number | null): string {
  return value === null ? 'Not available' : `${value}% weighted accuracy`
}

export function SmartRecoveryResultView({ result }: { result: RecoveryResult }) {
  const unansweredCount = result.questions.filter(
    (question) => question.selectedChoice === null,
  ).length
  const incorrectCount = result.questions.filter(
    (question) => question.selectedChoice !== null && !question.isCorrect,
  ).length
  const firstSkill = result.skillBreakdown[0]
  const resultHeading =
    result.skillBreakdown.length === 1 && firstSkill !== undefined
      ? firstSkill.skill.title
      : `${result.skillsTrained} skills practiced`

  return (
    <main
      className="page-shell recovery-page smart-recovery-result-page"
      data-testid="recovery-result-page"
    >
      <RecoveryResultTopbar />

      <section
        className={`recovery-result-hero recovery-result-hero--${result.interpretation.code}`}
        aria-labelledby="recovery-result-heading"
      >
        <div className="recovery-result-hero__summary">
          <p className="eyebrow">Smart Recovery · Result</p>
          <h1 id="recovery-result-heading">{resultHeading}</h1>
          <p className="recovery-result-status">{result.interpretation.title}</p>
          <div className="recovery-result-score">
            <strong
              aria-label={`${result.correctCount} out of ${result.questionCount} correct`}
            >
              {result.correctCount} / {result.questionCount}
            </strong>
            <span>{result.scorePercent}%</span>
          </div>
          <p className="recovery-result-completed">
            Recovery Set completed{' '}
            {formatSmartRecoveryDate(result.attempt.submittedAt)}
          </p>
          {result.strongestRecoverySkill !== null &&
            result.skillsTrained > 1 && (
              <p className="recovery-result-strongest">
                Strongest result in this set: {result.strongestRecoverySkill}
              </p>
            )}
        </div>

        <dl className="recovery-result-metrics">
          <div className="recovery-result-metric recovery-result-metric--correct">
            <dt>Correct</dt>
            <dd>{result.correctCount}</dd>
          </div>
          <div className="recovery-result-metric recovery-result-metric--incorrect">
            <dt>Incorrect</dt>
            <dd>{incorrectCount}</dd>
          </div>
          <div className="recovery-result-metric recovery-result-metric--unanswered">
            <dt>Unanswered</dt>
            <dd>{unansweredCount}</dd>
          </div>
          <div className="recovery-result-metric recovery-result-metric--total">
            <dt>Total</dt>
            <dd>{result.questionCount}</dd>
          </div>
        </dl>
      </section>

      <section
        className="recovery-result-guidance"
        aria-labelledby="recovery-result-guidance-heading"
      >
        <div>
          <p className="eyebrow">What this result means</p>
          <h2 id="recovery-result-guidance-heading">
            {result.interpretation.title}
          </h2>
          <p>{result.interpretation.message}</p>
          <p className="recovery-result-signal-note">
            This Recovery Set is one practice signal, not a promise of mastery.
            Current skill signals change only as eligible evidence accumulates.
          </p>
        </div>
        <nav className="recovery-result-actions" aria-label="Recovery result actions">
          {firstSkill !== undefined ? (
            <Link
              className="button-link"
              to={`/smart-recovery/skills/${encodeURIComponent(firstSkill.skill.slug)}`}
            >
              View Skill Details
            </Link>
          ) : (
            <Link className="button-link" to="/smart-recovery">
              View Smart Recovery
            </Link>
          )}
          <a className="button-link button-link--secondary" href="#recovery-answer-review">
            Review Answers
          </a>
          <Link
            className="button-link button-link--secondary"
            to="/smart-recovery#recovery-history"
          >
            Recovery History
          </Link>
        </nav>
      </section>

      <section
        className="recovery-result-section"
        aria-labelledby="recovery-breakdown-heading"
      >
        <div className="recovery-result-section__heading">
          <p className="eyebrow">Skill signals</p>
          <h2 id="recovery-breakdown-heading">Skills practiced</h2>
          <p>
            Recovery performance and the evidence-based skill signal are shown
            separately below.
          </p>
        </div>
        <div className="recovery-result-skill-grid">
          {result.skillBreakdown.map((item) => (
            <article className="recovery-result-skill-card" key={item.skill.slug}>
              <div className="recovery-result-skill-card__heading">
                <h3>{item.skill.title}</h3>
                <span className={`recovery-status recovery-status--${item.currentStatus}`}>
                  {formatSmartRecoveryLabel(item.currentStatus)}
                </span>
              </div>
              <p className="recovery-result-skill-score">
                <strong>{item.correct} / {item.questions}</strong>
                <span>{item.accuracyPercent}% recovery performance</span>
              </p>
              <dl className="recovery-progress-comparison">
                <div>
                  <dt>Before</dt>
                  <dd>
                    {formatSmartRecoveryLabel(item.statusBefore)} ·{' '}
                    {signalAccuracy(item.weightedAccuracyBefore)} ·{' '}
                    {item.evidenceCountBefore} evidence
                  </dd>
                </div>
                <div>
                  <dt>After</dt>
                  <dd>
                    {formatSmartRecoveryLabel(item.statusAfter)} ·{' '}
                    {signalAccuracy(item.weightedAccuracyAfter)} ·{' '}
                    {item.evidenceCountAfter} evidence
                  </dd>
                </div>
                <div>
                  <dt>Change</dt>
                  <dd>
                    {item.percentagePointChange === null
                      ? 'Not enough data'
                      : `${item.percentagePointChange > 0 ? '+' : ''}${item.percentagePointChange} points`}{' '}
                    · {formatSmartRecoveryLabel(item.trend)}
                  </dd>
                </div>
                <div>
                  <dt>Current signal</dt>
                  <dd>{formatSmartRecoveryLabel(item.currentStatus)}</dd>
                </div>
              </dl>
              <p className="recovery-result-skill-note">
                The signal reflects eligible evidence; this Recovery Set score
                alone does not establish mastery.
              </p>
              {item.relatedLesson !== null && (
                <Link
                  className="button-link button-link--secondary"
                  to={`/courses/${item.relatedLesson.courseSlug}/lessons/${item.relatedLesson.publicId}`}
                >
                  Review {item.relatedLesson.title}
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>

      <section
        className="recovery-result-section recovery-answer-review"
        aria-labelledby="recovery-review-heading"
        id="recovery-answer-review"
      >
        <div className="recovery-result-section__heading">
          <p className="eyebrow">Answer review</p>
          <h2 id="recovery-review-heading">Review each recovery question</h2>
          <p>
            Compare your submitted answer with the stored correct answer and
            explanation.
          </p>
        </div>
        <div className="recovery-result-review">
          {result.questions.map((question) => {
            const state = answerState(question)
            return (
              <article
                className={`recovery-answer-card recovery-answer-card--${state}`}
                key={question.publicId}
              >
                <div className="recovery-answer-card__heading">
                  <p className="eyebrow">
                    Question {question.position} · {question.skillTitle}
                  </p>
                  <span className={`recovery-answer-status recovery-answer-status--${state}`}>
                    {formatSmartRecoveryLabel(state)}
                  </span>
                </div>
                <h3>{question.prompt}</h3>
                <dl className="recovery-answer-comparison">
                  <div className={`recovery-answer-comparison__learner recovery-answer-comparison__learner--${state}`}>
                    <dt>Your answer</dt>
                    <dd>{question.selectedChoice?.text ?? 'Unanswered'}</dd>
                  </div>
                  <div className="recovery-answer-comparison__correct">
                    <dt>Correct answer</dt>
                    <dd>{question.correctChoice.text}</dd>
                  </div>
                </dl>
                <div className="recovery-answer-explanation">
                  <h4>Explanation</h4>
                  <p>{question.explanation}</p>
                </div>
                {question.mistakePattern !== null && (
                  <p className="recovery-answer-mistake">
                    <strong>Mistake pattern:</strong>{' '}
                    {formatSmartRecoveryLabel(question.mistakePattern)}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export function SmartRecoveryResultPage() {
  const { attemptPublicId = '' } = useParams()
  const [result, setResult] = useState<RecoveryResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void fetchSmartRecoveryResult(attemptPublicId, controller.signal)
      .then(setResult)
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Recovery results could not be loaded.',
          )
        }
      })
    return () => controller.abort()
  }, [attemptPublicId])

  if (error !== null) {
    return (
      <main className="page-shell">
        <RecoveryResultTopbar />
        <section className="recovery-state-card" role="alert">
          <h1>Recovery results unavailable</h1>
          <p>{error}</p>
          <Link className="button-link" to="/smart-recovery">
            Back to Smart Recovery
          </Link>
        </section>
      </main>
    )
  }

  if (result === null) {
    return <PasaWisePageLoader label="Checking your Recovery Set results…" />
  }

  return <SmartRecoveryResultView result={result} />
}

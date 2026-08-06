import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { formatSmartRecoveryLabel } from '../lib/smart-recovery-format'
import {
  fetchSmartRecoveryResult,
  type RecoveryResult,
} from '../lib/smart-recovery-api'


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
          setError(loadError instanceof Error ? loadError.message : 'Recovery results could not be loaded.')
        }
      })
    return () => controller.abort()
  }, [attemptPublicId])

  if (error !== null) return <main className="page-shell"><section className="recovery-state-card" role="alert"><h1>Recovery results unavailable</h1><p>{error}</p><Link to="/smart-recovery">Back to Smart Recovery</Link></section></main>
  if (result === null) return <main className="page-shell"><section className="recovery-state-card" aria-busy="true" aria-live="polite"><h1>Loading recovery results</h1></section></main>

  return (
    <main className="page-shell recovery-page" data-testid="recovery-result-page">
      <Link to="/smart-recovery">Back to Smart Recovery</Link>
      <section className="recovery-summary-card">
        <p className="eyebrow">Recovery Set Complete</p>
        <h1>{result.interpretation.title}</h1>
        <p className="assessment-score">{result.correctCount}/{result.questionCount} · {result.scorePercent}%</p>
        <p>{result.interpretation.message}</p>
        <p>This result is one practice signal, not a promise of mastery.</p>
      </section>

      <section className="recovery-section" aria-labelledby="recovery-breakdown-heading">
        <div><h2 id="recovery-breakdown-heading">Skills trained</h2><p>Review each skill and continue practicing where needed.</p></div>
        <div className="recovery-skill-grid">
          {result.skillBreakdown.map((item) => (
            <article className="recovery-skill-card" key={item.skill.slug}>
              <h3>{item.skill.title}</h3>
              <p>{item.correct}/{item.questions} correct · {item.accuracyPercent}%</p>
              <dl className="recovery-progress-comparison">
                <div><dt>Before</dt><dd>{formatSmartRecoveryLabel(item.statusBefore)} · {item.weightedAccuracyBefore ?? 'No'}% · {item.evidenceCountBefore} evidence</dd></div>
                <div><dt>After</dt><dd>{formatSmartRecoveryLabel(item.statusAfter)} · {item.weightedAccuracyAfter ?? 'No'}% · {item.evidenceCountAfter} evidence</dd></div>
                <div><dt>Change</dt><dd>{item.percentagePointChange === null ? 'Not enough data' : `${item.percentagePointChange > 0 ? '+' : ''}${item.percentagePointChange} points`} · {formatSmartRecoveryLabel(item.trend)}</dd></div>
                <div><dt>Current signal</dt><dd>{formatSmartRecoveryLabel(item.currentStatus)}</dd></div>
              </dl>
              {item.relatedLesson !== null && <Link to={`/courses/${item.relatedLesson.courseSlug}/lessons/${item.relatedLesson.publicId}`}>Review {item.relatedLesson.title}</Link>}
            </article>
          ))}
        </div>
      </section>

      <section className="recovery-section" aria-labelledby="recovery-review-heading">
        <div><h2 id="recovery-review-heading">Question review</h2><p>Compare your answer with the stored correct answer and explanation.</p></div>
        <div className="recovery-result-review">
          {result.questions.map((question) => (
            <article className={`recovery-review-question ${question.isCorrect ? 'is-correct' : 'is-incorrect'}`} key={question.publicId}>
              <p className="eyebrow">Question {question.position} · {question.skillTitle}</p>
              <h3>{question.prompt}</h3>
              <p>Your answer: <strong>{question.selectedChoice?.text ?? 'Unanswered'}</strong></p>
              <p>Correct answer: <strong>{question.correctChoice.text}</strong></p>
              <p>{question.explanation}</p>
              {question.mistakePattern !== null && <p className="meta-copy">Mistake pattern: {formatSmartRecoveryLabel(question.mistakePattern)}</p>}
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

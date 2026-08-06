import { Link } from 'react-router'

import type { SmartRecoveryViewState } from '../hooks/use-smart-recovery'
import type {
  RecoveryHistory,
  SmartRecoveryDashboard,
  SmartRecoveryDetails,
  SmartRecoverySkillSummary,
} from '../lib/smart-recovery-api'
import {
  formatSmartRecoveryDate,
  formatSmartRecoveryLabel,
} from '../lib/smart-recovery-format'

function accuracyLabel(value: number | null): string {
  return value === null ? 'Not available' : `${value}%`
}

export function SmartRecoveryStatusBadge({
  status,
}: Pick<SmartRecoverySkillSummary, 'status'>) {
  return (
    <span className={`recovery-status recovery-status--${status}`}>
      {formatSmartRecoveryLabel(status)}
    </span>
  )
}

export function SmartRecoverySkillCard({
  summary,
}: {
  summary: SmartRecoverySkillSummary
}) {
  return (
    <article className="recovery-skill-card">
      <div className="card-heading-row">
        <p className="eyebrow">{summary.skill.subjectTitle}</p>
        <SmartRecoveryStatusBadge status={summary.status} />
      </div>
      <h3>{summary.skill.title}</h3>
      {summary.skill.topicTitle !== null && (
        <p className="meta-copy">Topic: {summary.skill.topicTitle}</p>
      )}
      <dl className="recovery-metrics recovery-metrics--compact">
        <div>
          <dt>Weighted accuracy</dt>
          <dd>{accuracyLabel(summary.accuracyPercent)}</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>{summary.evidenceCount}</dd>
        </div>
        <div>
          <dt>Trend</dt>
          <dd>{formatSmartRecoveryLabel(summary.trend)}</dd>
        </div>
      </dl>
      <Link
        className="recovery-detail-link"
        to={`/smart-recovery/skills/${encodeURIComponent(summary.skill.slug)}`}
        aria-label={`View details for ${summary.skill.title}`}
      >
        View skill details
      </Link>
    </article>
  )
}

function SkillSection({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: SmartRecoverySkillSummary[]
}) {
  if (items.length === 0) return null
  return (
    <section className="recovery-section" aria-labelledby={`${title.toLowerCase().replaceAll(' ', '-')}-heading`}>
      <div>
        <h2 id={`${title.toLowerCase().replaceAll(' ', '-')}-heading`}>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="recovery-skill-grid">
        {items.map((item) => (
          <SmartRecoverySkillCard key={item.skill.slug} summary={item} />
        ))}
      </div>
    </section>
  )
}

function RecoveryHistorySection({
  state,
}: {
  state: SmartRecoveryViewState<RecoveryHistory>
}) {
  return (
    <section className="recovery-section" aria-labelledby="recovery-history-heading" data-testid="recovery-history">
      <div>
        <h2 id="recovery-history-heading">Recovery history</h2>
        <p>Submitted recovery sets are compared using evidence available at each submission boundary.</p>
      </div>
      {state.status === 'loading' && <p aria-busy="true" aria-live="polite">Loading recovery history...</p>}
      {state.status === 'error' && <div role="alert"><p>{state.error}</p><button type="button" className="button-secondary" onClick={state.reload}>Try again</button></div>}
      {state.status === 'loaded' && state.data.attempts.length === 0 && <p className="recovery-empty">No submitted recovery sets yet.</p>}
      {state.status === 'loaded' && state.data.attempts.length > 0 && (
        <div className="recovery-history-list">
          {state.data.attempts.map((item) => (
            <article key={item.attempt.publicId}>
              <div>
                <p className="eyebrow">{formatSmartRecoveryDate(item.attempt.submittedAt)}</p>
                <h3>{item.interpretation.title}</h3>
                <p>{item.correctCount}/{item.questionCount} correct ({item.scorePercent}%) across {item.skillsTrained} {item.skillsTrained === 1 ? 'skill' : 'skills'}.</p>
              </div>
              <Link to={`/smart-recovery/attempts/${item.attempt.publicId}/results`}>View result</Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export function SmartRecoveryOverview({
  summary,
  historyState,
  onStartRecovery,
  starting = false,
  startError = null,
}: {
  summary: SmartRecoveryDashboard
  historyState?: SmartRecoveryViewState<RecoveryHistory>
  onStartRecovery?: () => void
  starting?: boolean
  startError?: string | null
}) {
  const hasListedSkills =
    summary.needsMorePractice.length +
      summary.improving.length +
      summary.strong.length >
    0

  return (
    <div data-testid="smart-recovery-overview">
      <section className="recovery-summary-card" aria-labelledby="recovery-summary-heading">
        <p className="eyebrow">Your learning signal</p>
        <h2 id="recovery-summary-heading">
          {summary.state === 'has_priorities'
            ? 'Skills to revisit'
            : summary.state === 'no_current_weakness'
              ? 'No current weak skills'
              : 'More practice is needed for a signal'}
        </h2>
        <p>
          {summary.state === 'has_priorities'
            ? 'These priorities come from submitted generated questions, including completed recovery sets.'
            : summary.state === 'no_current_weakness'
              ? 'Your current submitted evidence does not identify a weak skill.'
              : `Complete more generated questions so each skill can reach at least ${summary.evidenceWindow.minimumEvidenceItems} evidence items.`}
        </p>
        <dl className="recovery-metrics">
          <div><dt>Eligible evidence</dt><dd>{summary.eligibleEvidenceCount}</dd></div>
          <div><dt>Skills observed</dt><dd>{summary.skillsWithEvidence}</dd></div>
          <div><dt>Evidence window</dt><dd>{summary.evidenceWindow.lookbackDays} days</dd></div>
        </dl>
      </section>

      <section className="recovery-action-card" aria-labelledby="recovery-action-heading">
        <div>
          <p className="eyebrow">Targeted practice</p>
          <h2 id="recovery-action-heading">Recovery set</h2>
          <p>{summary.recommendedRecoveryQuestionCount > 0 ? `${summary.recommendedRecoveryQuestionCount} questions across ${summary.eligibleRecoverySkillCount} priority ${summary.eligibleRecoverySkillCount === 1 ? 'skill' : 'skills'}.` : 'A targeted set will appear when enough eligible weakness evidence is available.'}</p>
        </div>
        {summary.activeRecoveryAttemptPublicId !== null ? (
          <Link className="button-link" to={`/smart-recovery/attempts/${summary.activeRecoveryAttemptPublicId}`}>Continue Recovery Set</Link>
        ) : summary.recoveryAvailable && onStartRecovery !== undefined ? (
          <button type="button" disabled={starting} onClick={onStartRecovery}>{starting ? 'Preparing Recovery Set...' : 'Start Recovery Set'}</button>
        ) : (
          <p className="meta-copy">{summary.recoveryUnavailableReason === 'not_enough_evidence' ? 'Complete more generated questions to unlock a targeted set.' : summary.recoveryUnavailableReason === 'no_current_weakness' ? 'No current weak skill needs a targeted set.' : summary.recoveryUnavailableReason === 'no_generatable_skills' ? 'Your current priority skills do not have an eligible targeted generator.' : summary.recoveryUnavailableReason === 'configuration_unavailable' ? 'Targeted recovery is temporarily unavailable.' : 'Targeted recovery is not available yet.'}</p>
        )}
        {summary.latestRecoveryResult !== null && <Link to={`/smart-recovery/attempts/${summary.latestRecoveryResult.attemptPublicId}/results`}>Latest result: {summary.latestRecoveryResult.correctCount}/{summary.latestRecoveryResult.questionCount} ({summary.latestRecoveryResult.scorePercent}%)</Link>}
        {startError !== null && <p className="form-error" role="alert">{startError}</p>}
      </section>
      {!hasListedSkills && (
        <section className="recovery-empty" aria-labelledby="recovery-empty-heading">
          <h2 id="recovery-empty-heading">No skill results to show yet</h2>
          <p>
            Only submitted generated practice, subject assessment, and mock
            examination answers are included. Fixed practice and quiz questions
            are not included yet.
          </p>
        </section>
      )}

      {historyState !== undefined && <RecoveryHistorySection state={historyState} />}

      <SkillSection title="Needs more practice" description="Start by reviewing the lowest current weighted accuracy signals." items={summary.needsMorePractice} />
      <SkillSection title="Improving" description="Recent evidence is moving in a positive direction." items={summary.improving} />
      <SkillSection title="Strong" description="Current submitted evidence meets the strong-skill threshold." items={summary.strong} />
    </div>
  )
}

export function SmartRecoverySkillDetails({
  details,
}: {
  details: SmartRecoveryDetails
}) {
  const { summary } = details
  return (
    <div className="recovery-details" data-testid="smart-recovery-skill-details">
      <section className="recovery-summary-card" aria-labelledby="skill-signal-heading">
        <div className="card-heading-row">
          <p className="eyebrow">{summary.skill.subjectTitle}</p>
          <SmartRecoveryStatusBadge status={summary.status} />
        </div>
        <h2 id="skill-signal-heading">Current signal</h2>
        <dl className="recovery-metrics">
          <div><dt>Weighted accuracy</dt><dd>{accuracyLabel(summary.accuracyPercent)}</dd></div>
          <div><dt>Evidence</dt><dd>{summary.evidenceCount}</dd></div>
          <div><dt>Answered</dt><dd>{summary.answeredCount}</dd></div>
          <div><dt>Correct</dt><dd>{summary.correctCount}</dd></div>
          <div><dt>Incorrect</dt><dd>{summary.incorrectCount}</dd></div>
          <div><dt>Unanswered</dt><dd>{summary.unansweredCount}</dd></div>
          <div><dt>Recent accuracy</dt><dd>{accuracyLabel(summary.recentAccuracyPercent)}</dd></div>
          <div><dt>Previous accuracy</dt><dd>{accuracyLabel(summary.previousAccuracyPercent)}</dd></div>
          <div><dt>Trend</dt><dd>{formatSmartRecoveryLabel(summary.trend)}</dd></div>
          <div><dt>Last practiced</dt><dd>{formatSmartRecoveryDate(summary.lastPracticedAt)}</dd></div>
        </dl>
      </section>

      <section className="recovery-section" aria-labelledby="skill-context-heading">
        <div>
          <h2 id="skill-context-heading">Skill context</h2>
          {summary.skill.description !== null && <p>{summary.skill.description}</p>}
          <dl className="recovery-context-list">
            {summary.skill.topicTitle !== null && <div><dt>Topic</dt><dd>{summary.skill.topicTitle}</dd></div>}
            {summary.skill.relatedLessonTitle !== null && <div><dt>Related lesson</dt><dd>{summary.skill.relatedLessonTitle}</dd></div>}
          </dl>
        </div>
      </section>

      <section className="recovery-section" aria-labelledby="source-breakdown-heading">
        <div><h2 id="source-breakdown-heading">Evidence sources</h2><p>Only submitted answers inside the current evidence window are counted.</p></div>
        {details.sourceBreakdown.length === 0 ? (
          <p className="recovery-empty">No submitted evidence is available for this skill yet.</p>
        ) : (
          <div className="recovery-table-wrap">
            <table className="recovery-table">
              <caption className="visually-hidden">Evidence source breakdown for {summary.skill.title}</caption>
              <thead><tr><th scope="col">Source</th><th scope="col">Evidence</th><th scope="col">Answered</th><th scope="col">Correct</th><th scope="col">Accuracy</th></tr></thead>
              <tbody>{details.sourceBreakdown.map((source) => <tr key={source.sourceType}><th scope="row">{formatSmartRecoveryLabel(source.sourceType)}</th><td>{source.evidenceCount}</td><td>{source.answeredCount}</td><td>{source.correctCount}</td><td>{accuracyLabel(source.accuracyPercent)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="recovery-section" aria-labelledby="mistake-patterns-heading">
        <div><h2 id="mistake-patterns-heading">Repeated mistake patterns</h2><p>Patterns are shown only when submitted incorrect answers include a classification.</p></div>
        {summary.mistakePatterns.length === 0 ? <p className="recovery-empty">No repeated classified mistake pattern is available.</p> : <ul className="recovery-pattern-list">{summary.mistakePatterns.map((pattern) => <li key={pattern.distractorType}><strong>{formatSmartRecoveryLabel(pattern.distractorType)}</strong><span>{pattern.count} {pattern.count === 1 ? 'mistake' : 'mistakes'} · {pattern.percentOfClassifiedMistakes}% of classified mistakes</span></li>)}</ul>}
      </section>
    </div>
  )
}

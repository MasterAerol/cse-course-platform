import { Link } from 'react-router'
import { PasaWiseLoader } from './PasaWiseLoader'

import type { SmartRecoveryViewState } from '../hooks/use-smart-recovery'
import { smartRecoveryUnavailableMessage } from '../lib/smart-recovery-copy'
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

function recoveryStatusLabel(
  status: SmartRecoverySkillSummary['status'],
): string {
  switch (status) {
    case 'needs_more_practice':
      return 'Weak'
    case 'not_enough_data':
      return 'Building signal'
    default:
      return formatSmartRecoveryLabel(status)
  }
}

export function SmartRecoveryStatusBadge({
  status,
}: Pick<SmartRecoverySkillSummary, 'status'>) {
  return (
    <span className={`recovery-status recovery-status--${status}`}>
      {recoveryStatusLabel(status)}
    </span>
  )
}

export function SmartRecoverySkillCard({
  summary,
}: {
  summary: SmartRecoverySkillSummary
}) {
  return (
    <article
      className={`recovery-skill-card recovery-skill-card--${summary.status}`}
    >
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
      <p className="recovery-skill-card__signal">
        {summary.status === 'needs_more_practice'
          ? 'Recent evidence suggests this skill needs more practice.'
          : summary.status === 'improving'
            ? 'Recent evidence is moving in a positive direction.'
            : summary.status === 'strong'
              ? 'Current submitted evidence shows a strong skill signal.'
              : 'More submitted evidence is needed for a reliable signal.'}
      </p>
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

type RecoveryHistoryItem = RecoveryHistory['attempts'][number]

function RecoveryHistoryCard({ item }: { item: RecoveryHistoryItem }) {
  const skillTitles = item.skillProgress.map((progress) => progress.skill.title)
  const primarySkill = skillTitles[0] ?? 'Recovery Set'
  const additionalSkillCount = Math.max(0, skillTitles.length - 1)

  return (
    <article className="recovery-history-card">
      <div className="recovery-history-card__body">
        <div className="recovery-history-card__heading">
          <div>
            <p className="eyebrow">
              {formatSmartRecoveryDate(item.attempt.submittedAt)}
            </p>
            <h3>{primarySkill}</h3>
            {additionalSkillCount > 0 && (
              <p className="recovery-history-card__skills">
                + {additionalSkillCount} more{' '}
                {additionalSkillCount === 1 ? 'skill' : 'skills'} practiced
              </p>
            )}
          </div>
          <span
            className={`recovery-history-status recovery-history-status--${item.interpretation.code}`}
          >
            {item.interpretation.title}
          </span>
        </div>
        <dl className="recovery-history-card__metrics">
          <div>
            <dt>Score</dt>
            <dd>
              {item.correctCount} / {item.questionCount}
            </dd>
          </div>
          <div>
            <dt>Recovery result</dt>
            <dd>{item.scorePercent}%</dd>
          </div>
          <div>
            <dt>Questions</dt>
            <dd>{item.questionCount}</dd>
          </div>
        </dl>
      </div>
      <Link
        className="button-link button-link--secondary"
        to={`/smart-recovery/attempts/${item.attempt.publicId}/results`}
        aria-label={`View result for ${primarySkill}`}
      >
        View Result
      </Link>
    </article>
  )
}

function RecoveryHistoryList({ history }: { history: RecoveryHistory }) {
  const recentAttempts = history.attempts.slice(0, 3)
  const earlierAttempts = history.attempts.slice(3)

  return (
    <>
      <div className="recovery-history-list">
        {recentAttempts.map((item) => (
          <RecoveryHistoryCard key={item.attempt.publicId} item={item} />
        ))}
      </div>
      {earlierAttempts.length > 0 && (
        <details className="recovery-history-more">
          <summary>Show earlier recovery results</summary>
          <div className="recovery-history-list">
            {earlierAttempts.map((item) => (
              <RecoveryHistoryCard key={item.attempt.publicId} item={item} />
            ))}
          </div>
        </details>
      )}
    </>
  )
}

function RecoveryHistorySummary({ history }: { history: RecoveryHistory }) {
  const latest = history.attempts[0]
  if (latest === undefined) return null

  const skillsPracticed = new Set(
    history.attempts.flatMap((item) =>
      item.skillProgress.map((progress) => progress.skill.slug),
    ),
  ).size

  return (
    <dl className="recovery-history-metrics">
      <div>
        <dt>Total Recovery Sets</dt>
        <dd>{history.totalSubmittedAttempts}</dd>
      </div>
      <div>
        <dt>Latest Result</dt>
        <dd>{latest.scorePercent}%</dd>
      </div>
      <div>
        <dt>Skills Practiced</dt>
        <dd>{skillsPracticed}</dd>
      </div>
    </dl>
  )
}

export function RecoveryHistorySection({
  state,
}: {
  state: SmartRecoveryViewState<RecoveryHistory>
}) {
  return (
    <section
      className="recovery-section recovery-history-section"
      aria-labelledby="recovery-history-heading"
      data-testid="recovery-history"
      id="recovery-history"
    >
      <div className="recovery-history-section__heading">
        <p className="eyebrow">Smart Recovery</p>
        <h2 id="recovery-history-heading">Recovery history</h2>
        <p>
          See your completed targeted Recovery Sets and revisit their results.
        </p>
      </div>

      {state.status === 'loading' && (
        <PasaWiseLoader compact label="Loading recovery history…" />
      )}

      {state.status === 'error' && (
        <div className="recovery-history-error" role="alert">
          <p>{state.error}</p>
          <button
            type="button"
            className="button-secondary"
            onClick={state.reload}
          >
            Try again
          </button>
        </div>
      )}

      {state.status === 'loaded' && state.data.attempts.length === 0 && (
        <div className="recovery-empty recovery-history-empty">
          <h3>No recovery history yet</h3>
          <p>
            Complete a targeted Recovery Set and your submitted results will
            appear here.
          </p>
        </div>
      )}

      {state.status === 'loaded' && state.data.attempts.length > 0 && (
        <>
          <RecoveryHistorySummary history={state.data} />
          <RecoveryHistoryList history={state.data} />
        </>
      )}
    </section>
  )
}

function RecoveryRecommendation({
  summary,
  onStartRecovery,
  starting,
  startError,
  hasHistory,
}: {
  summary: SmartRecoveryDashboard
  onStartRecovery?: () => void
  starting: boolean
  startError: string | null
  hasHistory: boolean
}) {
  const priority = summary.needsMorePractice[0]
  const hasActiveRecovery = summary.activeRecoveryAttemptPublicId !== null
  const hasWeakSignal = priority !== undefined
  const hasStrongSignals = summary.state === 'no_current_weakness'

  const heading = hasActiveRecovery
    ? priority?.skill.title ?? 'Continue your recovery set'
    : hasWeakSignal
      ? priority.skill.title
      : summary.recoveryAvailable
        ? 'Your recovery set is ready'
        : hasStrongSignals
          ? 'Your skill signals look strong'
          : 'Build a clearer skill signal'

  const explanation = hasActiveRecovery
    ? 'Your saved Recovery Set is ready when you are.'
    : hasWeakSignal
      ? 'Recommended because this skill has the weakest current weighted accuracy in your submitted evidence.'
      : summary.recoveryAvailable
        ? 'PasaWise has prepared targeted practice from your current submitted evidence.'
        : hasStrongSignals
          ? 'No current weak skill needs a targeted recovery set.'
          : `Complete more generated questions so each skill can reach at least ${summary.evidenceWindow.minimumEvidenceItems} evidence items.`

  return (
    <section
      className={`recovery-recommendation${hasStrongSignals ? ' recovery-recommendation--positive' : ''}`}
      aria-labelledby="recovery-recommendation-heading"
      data-testid="smart-recovery-recommendation"
    >
      <div className="recovery-recommendation__content">
        <div className="recovery-recommendation__label-row">
          <span className="recovery-recommendation__mark" aria-hidden="true">✦</span>
          <p className="eyebrow">
            {hasActiveRecovery
              ? 'Continue your recovery'
              : hasWeakSignal
                ? 'Your next recovery focus'
                : 'Current recovery signal'}
          </p>
        </div>
        <div className="recovery-recommendation__heading-row">
          <h2 id="recovery-recommendation-heading">{heading}</h2>
          {priority !== undefined && (
            <SmartRecoveryStatusBadge status={priority.status} />
          )}
        </div>
        {priority?.skill.topicTitle !== null &&
          priority?.skill.topicTitle !== undefined && (
            <p className="recovery-recommendation__topic">
              {priority.skill.subjectTitle} · {priority.skill.topicTitle}
            </p>
          )}
        {priority !== undefined && (
          <dl className="recovery-recommendation__metrics">
            <div>
              <dt>Weighted accuracy</dt>
              <dd>{accuracyLabel(priority.accuracyPercent)}</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>
                {priority.evidenceCount}{' '}
                {priority.evidenceCount === 1 ? 'evidence item' : 'evidence items'}
              </dd>
            </div>
          </dl>
        )}
        <p className="recovery-recommendation__reason">{explanation}</p>
      </div>

      <div className="recovery-recommendation__action">
        {summary.activeRecoveryAttemptPublicId !== null ? (
          <Link
            className="button-link recovery-recommendation__primary"
            to={`/smart-recovery/attempts/${summary.activeRecoveryAttemptPublicId}`}
          >
            Continue Recovery Set
          </Link>
        ) : summary.recoveryAvailable && onStartRecovery !== undefined ? (
          <button
            className="recovery-recommendation__primary"
            type="button"
            disabled={starting}
            onClick={onStartRecovery}
          >
            {starting ? 'Preparing Recovery Set...' : 'Start Recovery Set'}
          </button>
        ) : priority !== undefined ? (
          <Link
            className="button-link button-link--secondary"
            to={`/smart-recovery/skills/${encodeURIComponent(priority.skill.slug)}`}
          >
            View skill details
          </Link>
        ) : hasHistory ? (
          <a className="button-link button-link--secondary" href="#recovery-history">
            View recovery history
          </a>
        ) : null}

        {summary.recommendedRecoveryQuestionCount > 0 && (
          <p className="recovery-recommendation__set-meta">
            {priority === undefined ? 'Targeted' : recoveryStatusLabel(priority.status)} ·{' '}
            {summary.recommendedRecoveryQuestionCount} questions
          </p>
        )}
        {!hasActiveRecovery && !summary.recoveryAvailable && priority !== undefined && (
          <p className="recovery-recommendation__availability">
            {smartRecoveryUnavailableMessage(summary.recoveryUnavailableReason)}
          </p>
        )}
        {startError !== null && (
          <p className="form-error" role="alert">{startError}</p>
        )}
      </div>
    </section>
  )
}

function LatestRecoveryResult({ summary }: { summary: SmartRecoveryDashboard }) {
  const latest = summary.latestRecoveryResult
  if (latest === null) return null

  return (
    <section
      className="recovery-latest-card"
      aria-labelledby="latest-recovery-heading"
      id="latest-recovery"
      data-testid="latest-recovery-result"
    >
      <div>
        <p className="eyebrow">Latest recovery</p>
        <h2 id="latest-recovery-heading">Your most recent result</h2>
        <p>Submitted {formatSmartRecoveryDate(latest.submittedAt)}</p>
      </div>
      <div className="recovery-latest-card__score">
        <strong aria-label={`${latest.correctCount} out of ${latest.questionCount} correct`}>
          {latest.correctCount} / {latest.questionCount}
        </strong>
        <span>{latest.scorePercent}%</span>
      </div>
      <Link
        className="button-link button-link--secondary"
        to={`/smart-recovery/attempts/${latest.attemptPublicId}/results`}
      >
        View result
      </Link>
    </section>
  )
}

function EvidenceSnapshot({ summary }: { summary: SmartRecoveryDashboard }) {
  return (
    <section className="recovery-evidence-card" aria-labelledby="recovery-evidence-heading">
      <div>
        <p className="eyebrow">Evidence snapshot</p>
        <h2 id="recovery-evidence-heading">What this guidance is based on</h2>
        <p>Only eligible submitted answers inside the current evidence window are included.</p>
      </div>
      <dl className="recovery-metrics">
        <div><dt>Eligible evidence</dt><dd>{summary.eligibleEvidenceCount}</dd></div>
        <div><dt>Skills observed</dt><dd>{summary.skillsWithEvidence}</dd></div>
        <div><dt>Evidence window</dt><dd>{summary.evidenceWindow.lookbackDays} days</dd></div>
      </dl>
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
  const hasHistory =
    historyState?.status === 'loaded' && historyState.data.attempts.length > 0

  return (
    <div className="smart-recovery-overview-layout" data-testid="smart-recovery-overview">
      <RecoveryRecommendation
        summary={summary}
        hasHistory={hasHistory}
        onStartRecovery={onStartRecovery}
        starting={starting}
        startError={startError}
      />

      <section className="recovery-signals-section" aria-labelledby="recovery-signals-heading">
        <div className="recovery-signals-section__header">
          <div>
            <p className="eyebrow">Skill signals</p>
            <h2 id="recovery-signals-heading">See where to focus</h2>
            <p>Scan your current signals, then open a skill for the supporting evidence.</p>
          </div>
          <div className="recovery-signal-counts" aria-label="Current skill signal counts">
            <span><strong>{summary.needsMorePractice.length}</strong> Weak</span>
            <span><strong>{summary.improving.length}</strong> Improving</span>
            <span><strong>{summary.strong.length}</strong> Strong</span>
          </div>
        </div>

        {!hasListedSkills && (
          <div className="recovery-empty" aria-labelledby="recovery-empty-heading">
            <h3 id="recovery-empty-heading">No skill results to show yet</h3>
            <p>
              Only submitted generated practice, subject assessment, and mock
              examination answers are included. Fixed practice and quiz questions
              are not included yet.
            </p>
          </div>
        )}

        <div className="recovery-signal-groups">
          <SkillSection title="Weak" description="Start with the lowest current weighted accuracy signals." items={summary.needsMorePractice} />
          <SkillSection title="Improving" description="Recent evidence is moving in a positive direction." items={summary.improving} />
          <SkillSection title="Strong" description="Current submitted evidence shows a strong skill signal." items={summary.strong} />
        </div>
      </section>

      <LatestRecoveryResult summary={summary} />
      {historyState !== undefined && <RecoveryHistorySection state={historyState} />}
      <EvidenceSnapshot summary={summary} />
    </div>
  )
}

type EvidenceSourceType =
  SmartRecoveryDetails['sourceBreakdown'][number]['sourceType']

function evidenceSourceLabel(sourceType: EvidenceSourceType): string {
  switch (sourceType) {
    case 'generated_practice':
      return 'Generated practice'
    case 'subject_assessment':
      return 'Subject assessment'
    case 'mock_exam':
      return 'Full Mock'
    case 'recovery':
      return 'Recovery Set'
  }
}

function evidenceCountLabel(count: number): string {
  return `${count} eligible ${count === 1 ? 'evidence item' : 'evidence items'}`
}

function skillStatusPresentation(
  summary: SmartRecoverySkillSummary,
  minimumEvidenceItems: number,
): { heading: string; explanation: string } {
  const evidence = evidenceCountLabel(summary.evidenceCount)
  const accuracy = accuracyLabel(summary.accuracyPercent)

  switch (summary.status) {
    case 'needs_more_practice':
      return {
        heading: 'Why this skill needs attention',
        explanation: `Recent eligible answers currently produce a weighted accuracy of ${accuracy}. ${evidence} contribute to this weak skill signal.`,
      }
    case 'improving':
      return {
        heading: 'Why this skill is improving',
        explanation: `Recent eligible answers are moving in a better direction. The current weighted accuracy is ${accuracy} across ${evidence}.`,
      }
    case 'strong':
      return {
        heading: 'Why this skill is strong',
        explanation: `Current submitted evidence shows a strong skill signal: ${accuracy} weighted accuracy across ${evidence}.`,
      }
    case 'not_enough_data':
      return {
        heading: 'Why more evidence is needed',
        explanation: `This skill currently has ${evidence}. At least ${minimumEvidenceItems} are needed before PasaWise can establish a reliable skill signal.`,
      }
  }
}

function skillNextStep(
  summary: SmartRecoverySkillSummary,
  dashboard: SmartRecoveryDashboard | null,
  isCurrentPriority: boolean,
  minimumEvidenceItems: number,
): string {
  switch (summary.status) {
    case 'needs_more_practice':
      if (
        isCurrentPriority &&
        dashboard?.activeRecoveryAttemptPublicId !== null
      ) {
        return 'Continue your saved Recovery Set, then submit it so the new answers can contribute to your skill signals.'
      }
      if (isCurrentPriority && dashboard?.recoveryAvailable === true) {
        return 'Start the targeted Recovery Set prepared from your current weak-skill priorities.'
      }
      return 'Review this skill and keep building eligible evidence. Smart Recovery will offer a targeted set when the current rules support one.'
    case 'improving':
      return 'Continue practicing this skill and build more recent eligible evidence.'
    case 'strong':
      return 'Keep progressing through your course. No targeted recovery is indicated for this skill right now.'
    case 'not_enough_data':
      return `Complete more eligible questions until this signal reaches at least ${minimumEvidenceItems} evidence items.`
  }
}

type RecoverySkillProgress = RecoveryHistoryItem['skillProgress'][number]

function recoveryProgressCopy(
  progress: RecoverySkillProgress['progress'],
): string {
  if (
    progress.weightedAccuracyBefore !== null &&
    progress.weightedAccuracyAfter !== null
  ) {
    return `The recorded weighted signal moved from ${progress.weightedAccuracyBefore}% to ${progress.weightedAccuracyAfter}% after this submitted result.`
  }
  return `The recorded skill signal after this result is ${recoveryStatusLabel(progress.statusAfter)}.`
}

function LatestSkillRecovery({
  history,
  skillSlug,
  skillTitle,
}: {
  history: RecoveryHistory
  skillSlug: string
  skillTitle: string
}) {
  let latestAttempt: RecoveryHistoryItem | null = null
  let latestProgress: RecoverySkillProgress | null = null

  for (const item of history.attempts) {
    const progress = item.skillProgress.find(
      (skillProgress) => skillProgress.skill.slug === skillSlug,
    )
    if (progress === undefined) continue
    if (
      latestAttempt === null ||
      Date.parse(item.attempt.submittedAt) >
        Date.parse(latestAttempt.attempt.submittedAt)
    ) {
      latestAttempt = item
      latestProgress = progress
    }
  }

  return (
    <section
      className="recovery-detail-card recovery-latest-skill"
      aria-labelledby="latest-skill-recovery-heading"
      data-testid="latest-skill-recovery"
    >
      <div>
        <p className="eyebrow">Recovery progress</p>
        <h2 id="latest-skill-recovery-heading">Latest recovery for this skill</h2>
      </div>
      {latestAttempt === null || latestProgress === null ? (
        <div className="recovery-empty">
          <h3>No recovery result for this skill yet</h3>
          <p>
            No submitted Recovery Set in the available history includes{' '}
            {skillTitle}.
          </p>
        </div>
      ) : (
        <div className="recovery-latest-skill__result">
          <div className="recovery-latest-skill__score">
            <strong
              aria-label={`${latestProgress.correct} out of ${latestProgress.questions} correct`}
            >
              {latestProgress.correct} / {latestProgress.questions}
            </strong>
            <span>{latestProgress.accuracyPercent}%</span>
          </div>
          <div className="recovery-latest-skill__context">
            <p>
              Completed{' '}
              {formatSmartRecoveryDate(latestAttempt.attempt.submittedAt)}
            </p>
            <p>{recoveryProgressCopy(latestProgress.progress)}</p>
          </div>
          <Link
            className="button-link button-link--secondary"
            to={`/smart-recovery/attempts/${latestAttempt.attempt.publicId}/results`}
          >
            View Result
          </Link>
        </div>
      )}
    </section>
  )
}

export function SmartRecoverySkillDetails({
  details,
  dashboardState,
  historyState,
  onStartRecovery,
  starting = false,
  startError = null,
}: {
  details: SmartRecoveryDetails
  dashboardState?: SmartRecoveryViewState<SmartRecoveryDashboard>
  historyState?: SmartRecoveryViewState<RecoveryHistory>
  onStartRecovery?: () => void
  starting?: boolean
  startError?: string | null
}) {
  const { summary } = details
  const dashboard =
    dashboardState?.status === 'loaded' ? dashboardState.data : null
  const isCurrentPriority =
    summary.status === 'needs_more_practice' &&
    dashboard?.needsMorePractice.some(
      (item) => item.skill.slug === summary.skill.slug,
    ) === true
  const activeRecoveryAttemptPublicId = isCurrentPriority
    ? dashboard?.activeRecoveryAttemptPublicId ?? null
    : null
  const canStartRecovery =
    isCurrentPriority &&
    dashboard?.recoveryAvailable === true &&
    onStartRecovery !== undefined
  const statusPresentation = skillStatusPresentation(
    summary,
    details.evidenceWindow.minimumEvidenceItems,
  )
  const nextStep = skillNextStep(
    summary,
    dashboard,
    isCurrentPriority,
    details.evidenceWindow.minimumEvidenceItems,
  )

  return (
    <div
      className={`recovery-details recovery-details--${summary.status}`}
      data-testid="smart-recovery-skill-details"
    >
      <section
        className="recovery-skill-hero"
        aria-labelledby="skill-details-heading"
      >
        <div className="recovery-skill-hero__content">
          <p className="eyebrow">Smart Recovery · Skill details</p>
          <div className="recovery-skill-hero__heading-row">
            <h1 id="skill-details-heading">{summary.skill.title}</h1>
            <SmartRecoveryStatusBadge status={summary.status} />
          </div>
          <p className="recovery-skill-hero__context">
            {summary.skill.subjectTitle}
            {summary.skill.topicTitle !== null &&
              ` · ${summary.skill.topicTitle}`}
          </p>
          {summary.skill.description !== null && (
            <p className="recovery-skill-hero__description">
              {summary.skill.description}
            </p>
          )}
          {summary.skill.relatedLessonTitle !== null && (
            <p className="recovery-skill-hero__lesson">
              <span>Related lesson</span>
              <strong>{summary.skill.relatedLessonTitle}</strong>
            </p>
          )}
        </div>

        <dl className="recovery-skill-hero__metrics">
          <div>
            <dd>{accuracyLabel(summary.accuracyPercent)}</dd>
            <dt>Weighted accuracy</dt>
          </div>
          <div>
            <dd>{summary.evidenceCount}</dd>
            <dt>
              {summary.evidenceCount === 1
                ? 'Eligible evidence item'
                : 'Eligible evidence items'}
            </dt>
          </div>
          <div
            className={
              summary.trend === 'not_available' ? 'is-muted' : undefined
            }
          >
            <dd>
              {summary.trend === 'not_available'
                ? 'Not enough evidence'
                : formatSmartRecoveryLabel(summary.trend)}
            </dd>
            <dt>Trend</dt>
          </div>
        </dl>

        {(activeRecoveryAttemptPublicId !== null || canStartRecovery) && (
          <div className="recovery-skill-hero__action">
            {activeRecoveryAttemptPublicId !== null ? (
              <Link
                className="button-link"
                to={`/smart-recovery/attempts/${activeRecoveryAttemptPublicId}`}
              >
                Continue Recovery Set
              </Link>
            ) : (
              <button
                type="button"
                disabled={starting}
                onClick={onStartRecovery}
              >
                {starting
                  ? 'Preparing Recovery Set...'
                  : 'Start Recovery Set'}
              </button>
            )}
            {startError !== null && (
              <p className="form-error" role="alert">
                {startError}
              </p>
            )}
          </div>
        )}
      </section>

      <div className="recovery-details__insight-grid">
        <section
          className="recovery-detail-card recovery-status-explanation"
          aria-labelledby="skill-signal-heading"
        >
          <div>
            <p className="eyebrow">Current signal</p>
            <h2 id="skill-signal-heading">{statusPresentation.heading}</h2>
            <p>{statusPresentation.explanation}</p>
          </div>
          <dl className="recovery-status-comparison">
            <div>
              <dt>Recent accuracy</dt>
              <dd>{accuracyLabel(summary.recentAccuracyPercent)}</dd>
            </div>
            <div>
              <dt>Previous accuracy</dt>
              <dd>{accuracyLabel(summary.previousAccuracyPercent)}</dd>
            </div>
          </dl>
        </section>

        <section
          className="recovery-detail-card"
          aria-labelledby="evidence-summary-heading"
        >
          <div>
            <p className="eyebrow">Evidence summary</p>
            <h2 id="evidence-summary-heading">
              What contributes to this signal
            </h2>
          </div>
          <dl className="recovery-evidence-metrics">
            <div><dt>Answered</dt><dd>{summary.answeredCount}</dd></div>
            <div><dt>Correct</dt><dd>{summary.correctCount}</dd></div>
            <div><dt>Incorrect</dt><dd>{summary.incorrectCount}</dd></div>
            <div><dt>Unanswered</dt><dd>{summary.unansweredCount}</dd></div>
            <div>
              <dt>Evidence window</dt>
              <dd>{details.evidenceWindow.lookbackDays} days</dd>
            </div>
            <div>
              <dt>Last practiced</dt>
              <dd>{formatSmartRecoveryDate(summary.lastPracticedAt)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section
        className="recovery-detail-card"
        aria-labelledby="source-breakdown-heading"
      >
        <div>
          <p className="eyebrow">Evidence transparency</p>
          <h2 id="source-breakdown-heading">Evidence sources</h2>
          <p>
            Only eligible submitted answers inside the current{' '}
            {details.evidenceWindow.lookbackDays}-day evidence window are counted.
          </p>
          <p className="recovery-detail-note">
            Fixed practice and quiz questions are not included in this signal.
          </p>
        </div>
        {details.sourceBreakdown.length === 0 ? (
          <p className="recovery-empty">
            No submitted evidence is available for this skill yet.
          </p>
        ) : (
          <div className="recovery-table-wrap">
            <table className="recovery-table">
              <caption className="visually-hidden">
                Evidence source breakdown for {summary.skill.title}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">Evidence</th>
                  <th scope="col">Answered</th>
                  <th scope="col">Correct</th>
                  <th scope="col">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {details.sourceBreakdown.map((source) => (
                  <tr key={source.sourceType}>
                    <th scope="row">
                      {evidenceSourceLabel(source.sourceType)}
                    </th>
                    <td>{source.evidenceCount}</td>
                    <td>{source.answeredCount}</td>
                    <td>{source.correctCount}</td>
                    <td>{accuracyLabel(source.accuracyPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {summary.mistakePatterns.length > 0 && (
        <section
          className="recovery-detail-card"
          aria-labelledby="mistake-patterns-heading"
        >
          <div>
            <p className="eyebrow">Learning pattern</p>
            <h2 id="mistake-patterns-heading">Repeated mistake patterns</h2>
            <p>
              Patterns are shown only when submitted incorrect answers include a
              classification.
            </p>
          </div>
          <ul className="recovery-pattern-list">
            {summary.mistakePatterns.map((pattern) => (
              <li key={pattern.distractorType}>
                <strong>
                  {formatSmartRecoveryLabel(pattern.distractorType)}
                </strong>
                <span>
                  {pattern.count}{' '}
                  {pattern.count === 1 ? 'mistake' : 'mistakes'} ·{' '}
                  {pattern.percentOfClassifiedMistakes}% of classified mistakes
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {historyState?.status === 'loaded' && (
        <LatestSkillRecovery
          history={historyState.data}
          skillSlug={summary.skill.slug}
          skillTitle={summary.skill.title}
        />
      )}

      <section
        className="recovery-next-step"
        aria-labelledby="recovery-next-step-heading"
      >
        <div>
          <p className="eyebrow">What to do next</p>
          <h2 id="recovery-next-step-heading">Recommended next step</h2>
          <p>{nextStep}</p>
          {isCurrentPriority &&
            dashboard !== null &&
            !dashboard.recoveryAvailable &&
            activeRecoveryAttemptPublicId === null && (
              <p className="recovery-next-step__availability">
                {smartRecoveryUnavailableMessage(
                  dashboard.recoveryUnavailableReason,
                )}
              </p>
            )}
        </div>
        <Link
          className="button-link button-link--secondary"
          to="/smart-recovery"
        >
          Back to Smart Recovery
        </Link>
      </section>
    </div>
  )
}

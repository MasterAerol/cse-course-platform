import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useSmartRecoverySummary } from '../hooks/use-smart-recovery'
import type { SmartRecoveryViewState } from '../hooks/use-smart-recovery'
import { smartRecoveryUnavailableMessage } from '../lib/smart-recovery-copy'
import {
  createSmartRecoveryAttempt,
  type SmartRecoveryDashboard,
} from '../lib/smart-recovery-api'

export function SmartRecoveryCardView({
  summary,
  onStartRecovery,
  starting = false,
  startError = null,
}: {
  summary: SmartRecoveryDashboard
  onStartRecovery?: () => void
  starting?: boolean
  startError?: string | null
}) {
  const priority = summary.needsMorePractice[0]
  return (
    <section className="continue-card smart-recovery-card" data-testid="smart-recovery-card" aria-labelledby="smart-recovery-card-title">
      <p className="eyebrow">Smart Recovery</p>
      <h3 id="smart-recovery-card-title">
        {priority === undefined ? 'Your skill signals' : priority.skill.title}
      </h3>
      <p>
        {priority === undefined
          ? summary.state === 'not_enough_data'
            ? 'Complete more generated questions to reveal reliable skill priorities.'
            : 'No current weak skill appears in your submitted evidence.'
          : `${priority.accuracyPercent ?? 'No'}% weighted accuracy across ${priority.evidenceCount} evidence items.`}
      </p>
      {summary.activeRecoveryAttemptPublicId === null &&
        !summary.recoveryAvailable && (
          <p className="meta-copy">
            {smartRecoveryUnavailableMessage(summary.recoveryUnavailableReason)}
          </p>
        )}
      {summary.latestRecoveryResult !== null && (
        <p className="meta-copy">
          Latest recovery: {summary.latestRecoveryResult.correctCount}/{summary.latestRecoveryResult.questionCount} ({summary.latestRecoveryResult.scorePercent}%).{' '}
          <Link to={`/smart-recovery/attempts/${summary.latestRecoveryResult.attemptPublicId}/results`}>View result</Link>
        </p>
      )}
      {summary.activeRecoveryAttemptPublicId !== null ? (
        <Link className="button-link" to={`/smart-recovery/attempts/${summary.activeRecoveryAttemptPublicId}`}>Continue Recovery Set</Link>
      ) : summary.recoveryAvailable && onStartRecovery !== undefined ? (
        <button type="button" disabled={starting} onClick={onStartRecovery}>{starting ? 'Preparing...' : 'Start Recovery Set'}</button>
      ) : (
        <Link className="button-link" to="/smart-recovery">View Smart Recovery</Link>
      )}
      {startError !== null && <p className="form-error" role="alert">{startError}</p>}
    </section>
  )
}

export function SmartRecoveryCardContent({
  state,
  onStartRecovery,
  starting,
  startError,
}: {
  state: SmartRecoveryViewState<SmartRecoveryDashboard>
  onStartRecovery?: () => void
  starting?: boolean
  startError?: string | null
}) {
  if (state.status === 'loading') {
    return <section className="continue-card smart-recovery-card" aria-busy="true" aria-live="polite"><p>Loading Smart Recovery...</p></section>
  }
  if (state.status === 'error') {
    return <section className="continue-card smart-recovery-card" role="alert"><h3>Smart Recovery is unavailable</h3><p>{state.error}</p><button className="button-secondary" type="button" onClick={state.reload}>Try again</button></section>
  }
  return <SmartRecoveryCardView summary={state.data} onStartRecovery={onStartRecovery} starting={starting} startError={startError} />
}

export function SmartRecoveryCard() {
  const state = useSmartRecoverySummary()
  const navigate = useNavigate()
  const idempotencyKey = useRef(crypto.randomUUID())
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  async function startRecovery(): Promise<void> {
    if (starting) return
    setStarting(true)
    setStartError(null)
    try {
      const response = await createSmartRecoveryAttempt(idempotencyKey.current)
      const path = '/smart-recovery/attempts/' + response.attempt.publicId
      await navigate('resultAvailable' in response ? path + '/results' : path)
    } catch (error: unknown) {
      setStartError(error instanceof Error ? error.message : 'The recovery set could not be prepared.')
      setStarting(false)
    }
  }

  return <SmartRecoveryCardContent state={state} onStartRecovery={() => void startRecovery()} starting={starting} startError={startError} />
}
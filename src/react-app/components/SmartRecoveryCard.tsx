import { Link } from 'react-router'

import { useSmartRecoverySummary } from '../hooks/use-smart-recovery'
import type { SmartRecoveryViewState } from '../hooks/use-smart-recovery'
import type { SmartRecoveryDashboard } from '../lib/smart-recovery-api'

export function SmartRecoveryCardView({
  summary,
}: {
  summary: SmartRecoveryDashboard
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
      <Link className="button-link" to="/smart-recovery">View Smart Recovery</Link>
    </section>
  )
}

export function SmartRecoveryCardContent({
  state,
}: {
  state: SmartRecoveryViewState<SmartRecoveryDashboard>
}) {
  if (state.status === 'loading') {
    return <section className="continue-card smart-recovery-card" aria-busy="true" aria-live="polite"><p>Loading Smart Recovery…</p></section>
  }
  if (state.status === 'error') {
    return <section className="continue-card smart-recovery-card" role="alert"><h3>Smart Recovery is unavailable</h3><p>{state.error}</p><button className="button-secondary" type="button" onClick={state.reload}>Try again</button></section>
  }
  return <SmartRecoveryCardView summary={state.data} />
}

export function SmartRecoveryCard() {
  return <SmartRecoveryCardContent state={useSmartRecoverySummary()} />
}

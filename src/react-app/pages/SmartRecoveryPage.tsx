import { Link } from 'react-router'

import { SmartRecoveryOverview } from '../components/SmartRecoveryUi'
import { useSmartRecoverySummary } from '../hooks/use-smart-recovery'
import type { SmartRecoveryViewState } from '../hooks/use-smart-recovery'
import type { SmartRecoveryDashboard } from '../lib/smart-recovery-api'

export function SmartRecoveryPageView({
  state,
}: {
  state: SmartRecoveryViewState<SmartRecoveryDashboard>
}) {
  return (
    <main className="page-shell recovery-page">
      <Link to="/dashboard">← Dashboard</Link>
      <header className="recovery-page-header">
        <p className="eyebrow">Smart Recovery</p>
        <h1>Your skill signals</h1>
        <p>Review patterns calculated from your submitted generated-question evidence. This page does not create a recovery attempt.</p>
      </header>
      {state.status === 'loading' && <section className="recovery-state-card" aria-busy="true" aria-live="polite"><h2>Loading your skill signals</h2><p>This may take a moment.</p></section>}
      {state.status === 'error' && <section className="recovery-state-card" role="alert"><h2>Smart Recovery could not be loaded</h2><p>{state.error}</p><button type="button" onClick={state.reload}>Try again</button></section>}
      {state.status === 'loaded' && <SmartRecoveryOverview summary={state.data} />}
    </main>
  )
}

export function SmartRecoveryPage() {
  return <SmartRecoveryPageView state={useSmartRecoverySummary()} />
}

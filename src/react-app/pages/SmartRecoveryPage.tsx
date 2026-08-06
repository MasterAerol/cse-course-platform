import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { SmartRecoveryOverview } from '../components/SmartRecoveryUi'
import { useSmartRecoverySummary } from '../hooks/use-smart-recovery'
import type { SmartRecoveryViewState } from '../hooks/use-smart-recovery'
import {
  createSmartRecoveryAttempt,
  type SmartRecoveryDashboard,
} from '../lib/smart-recovery-api'

export function SmartRecoveryPageView({
  state,
  onStartRecovery,
  starting = false,
  startError = null,
}: {
  state: SmartRecoveryViewState<SmartRecoveryDashboard>
  onStartRecovery?: () => void
  starting?: boolean
  startError?: string | null
}) {
  return (
    <main className="page-shell recovery-page">
      <Link to="/dashboard">← Dashboard</Link>
      <header className="recovery-page-header">
        <p className="eyebrow">Smart Recovery</p>
        <h1>Your skill signals</h1>
        <p>Review skill patterns, start a targeted recovery set, or continue saved work.</p>
      </header>
      {state.status === 'loading' && <section className="recovery-state-card" aria-busy="true" aria-live="polite"><h2>Loading your skill signals</h2><p>This may take a moment.</p></section>}
      {state.status === 'error' && <section className="recovery-state-card" role="alert"><h2>Smart Recovery could not be loaded</h2><p>{state.error}</p><button type="button" onClick={state.reload}>Try again</button></section>}
      {state.status === 'loaded' && <SmartRecoveryOverview summary={state.data} onStartRecovery={onStartRecovery} starting={starting} startError={startError} />}
    </main>
  )
}

export function SmartRecoveryPage() {
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
      const destination = 'resultAvailable' in response
        ? '/smart-recovery/attempts/' + response.attempt.publicId + '/results'
        : '/smart-recovery/attempts/' + response.attempt.publicId
      await navigate(destination)
    } catch (error: unknown) {
      setStartError(error instanceof Error ? error.message : 'The recovery set could not be prepared.')
      setStarting(false)
    }
  }

  return <SmartRecoveryPageView state={state} onStartRecovery={() => void startRecovery()} starting={starting} startError={startError} />
}

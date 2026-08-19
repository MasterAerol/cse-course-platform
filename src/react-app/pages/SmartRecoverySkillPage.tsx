import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import { SmartRecoverySkillDetails } from '../components/SmartRecoveryUi'
import {
  useSmartRecoveryHistory,
  useSmartRecoverySkillDetails,
  useSmartRecoverySummary,
} from '../hooks/use-smart-recovery'
import type { SmartRecoveryViewState } from '../hooks/use-smart-recovery'
import {
  createSmartRecoveryAttempt,
  type RecoveryHistory,
  type SmartRecoveryDashboard,
  type SmartRecoveryDetails,
} from '../lib/smart-recovery-api'

export function SmartRecoverySkillPageView({
  state,
  dashboardState,
  historyState,
  onStartRecovery,
  starting = false,
  startError = null,
}: {
  state: SmartRecoveryViewState<SmartRecoveryDetails>
  dashboardState?: SmartRecoveryViewState<SmartRecoveryDashboard>
  historyState?: SmartRecoveryViewState<RecoveryHistory>
  onStartRecovery?: () => void
  starting?: boolean
  startError?: string | null
}) {
  const auxiliaryDataIsLoading =
    dashboardState?.status === 'loading' || historyState?.status === 'loading'

  if (
    state.status === 'loading' ||
    (state.status === 'loaded' && auxiliaryDataIsLoading)
  ) {
    return <PasaWisePageLoader label="Loading skill details…" />
  }

  return (
    <main className="page-shell recovery-page">
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

      <Link className="recovery-back-link" to="/smart-recovery">
        &larr; Smart Recovery
      </Link>

      {state.status === 'error' && (
        <section className="recovery-state-card" role="alert">
          <h1>Skill details could not be loaded</h1>
          <p>{state.error}</p>
          <button type="button" onClick={state.reload}>
            Try again
          </button>
        </section>
      )}

      {state.status === 'loaded' && (
        <SmartRecoverySkillDetails
          details={state.data}
          dashboardState={dashboardState}
          historyState={historyState}
          onStartRecovery={onStartRecovery}
          starting={starting}
          startError={startError}
        />
      )}
    </main>
  )
}

export function SmartRecoverySkillPage() {
  const { skillSlug = '' } = useParams()
  const state = useSmartRecoverySkillDetails(skillSlug)
  const dashboardState = useSmartRecoverySummary()
  const historyState = useSmartRecoveryHistory()
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
      const destination =
        'resultAvailable' in response
          ? `/smart-recovery/attempts/${response.attempt.publicId}/results`
          : `/smart-recovery/attempts/${response.attempt.publicId}`
      await navigate(destination)
    } catch (error: unknown) {
      setStartError(
        error instanceof Error
          ? error.message
          : 'The recovery set could not be prepared.',
      )
      setStarting(false)
    }
  }

  return (
    <SmartRecoverySkillPageView
      state={state}
      dashboardState={dashboardState}
      historyState={historyState}
      onStartRecovery={() => void startRecovery()}
      starting={starting}
      startError={startError}
    />
  )
}

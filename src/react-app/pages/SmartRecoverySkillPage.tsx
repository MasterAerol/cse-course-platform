import { Link, useParams } from 'react-router'

import { SmartRecoverySkillDetails } from '../components/SmartRecoveryUi'
import { useSmartRecoverySkillDetails } from '../hooks/use-smart-recovery'
import type { SmartRecoveryViewState } from '../hooks/use-smart-recovery'
import type { SmartRecoveryDetails } from '../lib/smart-recovery-api'
import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'

export function SmartRecoverySkillPageView({
  state,
}: {
  state: SmartRecoveryViewState<SmartRecoveryDetails>
}) {
  if (state.status === 'loading') {
    return <PasaWisePageLoader label="Loading skill details…" />
  }

  const topbar = (
    <LearnerTopbar showSignOut>
      <Link className="button-link button-link--secondary" to="/dashboard">
        Dashboard
      </Link>
      <Link className="button-link button-link--secondary" to="/smart-recovery">
        Smart Recovery
      </Link>
      <Link className="button-link button-link--secondary" to="/catalog">
        Catalog
      </Link>
    </LearnerTopbar>
  )

  return (
    <main className="page-shell recovery-page">
      {topbar}
      <Link to="/smart-recovery">&larr; Smart Recovery</Link>
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
        <>
          <header className="recovery-page-header">
            <p className="eyebrow">Smart Recovery skill</p>
            <h1>{state.data.summary.skill.title}</h1>
            {state.data.summary.skill.topicTitle !== null && <p>{state.data.summary.skill.topicTitle}</p>}
          </header>
          <SmartRecoverySkillDetails details={state.data} />
        </>
      )}
    </main>
  )
}

export function SmartRecoverySkillPage() {
  const { skillSlug = '' } = useParams()
  return <SmartRecoverySkillPageView state={useSmartRecoverySkillDetails(skillSlug)} />
}
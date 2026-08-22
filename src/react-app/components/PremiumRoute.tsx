import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import {
  fetchCommercialAccess,
  fetchLearnerPlans,
  type CommercialFeature,
} from '../lib/commercial-api'
import { LearnerTopbar } from './LearnerTopbar'
import { PasaWisePageLoader } from './PasaWiseLoader'

type AccessState =
  | { status: 'loading' }
  | { status: 'allowed' }
  | { status: 'locked'; showPlans: boolean }
  | { status: 'error'; message: string }

export function PremiumRoute({
  feature,
  children,
}: {
  feature: CommercialFeature
  children: ReactNode
}) {
  const [state, setState] = useState<AccessState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    async function checkAccess(): Promise<void> {
      try {
        const access = await fetchCommercialAccess(controller.signal)
        if (controller.signal.aborted) return
        if (access.features[feature]) {
          setState({ status: 'allowed' })
          return
        }
        const plans = await fetchLearnerPlans(controller.signal)
        if (!controller.signal.aborted) {
          setState({ status: 'locked', showPlans: plans.showPricing })
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Commercial access could not be checked.',
          })
        }
      }
    }
    void checkAccess()
    return () => controller.abort()
  }, [feature])

  if (state.status === 'loading') {
    return <PasaWisePageLoader label="Checking PasaWise access…" />
  }
  if (state.status === 'allowed') return <>{children}</>

  return (
    <main className="page-shell premium-lock-page">
      <LearnerTopbar as="header" mobileCollapsible showSignOut>
        <Link className="dashboard-nav-link" to="/dashboard">Dashboard</Link>
        <Link className="dashboard-nav-link" to="/courses">Courses</Link>
        <Link className="dashboard-nav-link" to="/account">Account</Link>
      </LearnerTopbar>
      <section className="premium-upsell" role={state.status === 'error' ? 'alert' : undefined}>
        {state.status === 'locked' ? (
          <>
            <span className="curriculum-lock-badge">Premium</span>
            <p className="eyebrow">PasaWise Premium</p>
            <h1>Unlock the complete PasaWise experience.</h1>
            <p>Get complete lessons and practice, Subject Assessments, Smart Recovery, Mistake Notebook, Readiness Score, and Full Mock Examination.</p>
            {state.showPlans && (
              <Link className="button-link" to="/account#plans">View plans</Link>
            )}
          </>
        ) : (
          <>
            <h1>Access check unavailable</h1>
            <p>{state.message}</p>
            <Link className="button-link button-link--secondary" to="/dashboard">Return to Dashboard</Link>
          </>
        )}
      </section>
    </main>
  )
}

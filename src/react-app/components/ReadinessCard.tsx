import { Link } from 'react-router'
import { useCseReadiness, type ReadinessViewState } from '../hooks/use-readiness'
import { confidenceLabel, readinessBandLabel } from '../lib/readiness-copy'
import type { CseReadiness } from '../lib/readiness-api'

export function ReadinessCardView({ readiness }: { readiness: CseReadiness }) {
  const strongest = [...readiness.subjects].filter((item) => item.readinessPercent !== null).sort((a, b) => (b.readinessPercent ?? 0) - (a.readinessPercent ?? 0))[0]
  const weakest = [...readiness.subjects].filter((item) => item.readinessPercent !== null).sort((a, b) => (a.readinessPercent ?? 101) - (b.readinessPercent ?? 101))[0]
  return <section className="continue-card readiness-card" data-testid="readiness-card" aria-labelledby="readiness-card-title">
    <p className="eyebrow">CSE Readiness</p><h3 id="readiness-card-title">{readiness.hasSufficientEvidence ? `${readiness.score} / 100` : 'Build your readiness estimate'}</h3>
    <p><strong>{readinessBandLabel(readiness.readinessBand)}</strong> · {confidenceLabel(readiness.confidence)}</p>
    {strongest !== undefined && <p className="meta-copy">Strongest: {strongest.title}</p>}{weakest !== undefined && <p className="meta-copy">Needs attention: {weakest.title}</p>}
    <div className="readiness-card__actions"><Link className="button-link" to="/readiness">View readiness</Link><Link className="button-link button-link--secondary" to={readiness.recommendation.route}>{readiness.recommendation.actionLabel}</Link></div>
  </section>
}
export function ReadinessCardContent({ state }: { state: ReadinessViewState }) {
  if (state.status === 'loading') return <section className="continue-card readiness-card" aria-live="polite" aria-busy="true"><p>Loading CSE Readiness...</p></section>
  if (state.status === 'error') return <section className="continue-card readiness-card" role="status"><p className="eyebrow">CSE Readiness</p><p>Readiness is temporarily unavailable.</p><button type="button" onClick={state.reload}>Try again</button></section>
  return <ReadinessCardView readiness={state.data} />
}
export function ReadinessCard() { return <ReadinessCardContent state={useCseReadiness()} /> }

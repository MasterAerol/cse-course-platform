import { Link } from 'react-router'

import { useMistakeNotebookSummary, type MistakeNotebookViewState } from '../hooks/use-mistake-notebook'
import type { MistakeNotebookSummary } from '../lib/mistake-notebook-api'

export function MistakeNotebookCardView({ summary }: { summary: MistakeNotebookSummary }) {
  const common = summary.topMistakeSkills[0]
  return (
    <section className="continue-card mistake-notebook-card" data-testid="mistake-notebook-card" aria-labelledby="mistake-notebook-card-title">
      <p className="eyebrow">Mistake Notebook</p>
      <h3 id="mistake-notebook-card-title">
        {summary.totalMistakes === 0 ? 'No mistakes recorded yet' : `${summary.totalMistakes} mistakes to review`}
      </h3>
      <p>{common === undefined ? 'Submitted incorrect answers will appear here for review.' : <>Most common: <strong>{common.title}</strong> ({common.count})</>}</p>
      <Link className="button-link" to="/mistake-notebook">Review mistakes</Link>
    </section>
  )
}
export function MistakeNotebookCardContent({ state }: { state: MistakeNotebookViewState<MistakeNotebookSummary> }) {
  if (state.status === 'loading') return <section className="continue-card mistake-notebook-card" aria-busy="true" aria-live="polite"><p>Loading Mistake Notebook...</p></section>
  if (state.status === 'error') return <section className="continue-card mistake-notebook-card" role="alert"><h3>Mistake Notebook is unavailable</h3><p>{state.error}</p><button className="button-secondary" type="button" onClick={state.reload}>Try again</button></section>
  return <MistakeNotebookCardView summary={state.data} />
}
export function MistakeNotebookCard() {
  return <MistakeNotebookCardContent state={useMistakeNotebookSummary()} />
}
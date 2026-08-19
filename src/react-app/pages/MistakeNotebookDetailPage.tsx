import { Link, useParams } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import { useMistakeNotebookEntry, type MistakeNotebookViewState } from '../hooks/use-mistake-notebook'
import { formatNotebookDate, mistakeSourceLabel, skillStatusLabel } from '../lib/mistake-notebook-copy'
import type { MistakeNotebookEntry } from '../lib/mistake-notebook-api'

export function MistakeNotebookDetailPageView({ state }: { state: MistakeNotebookViewState<MistakeNotebookEntry> }) {
  if (state.status === 'loading') {
    return <PasaWisePageLoader label="Opening your mistake review…" />
  }

  return (
    <main className="page-shell mistake-notebook-page mistake-detail-page" data-testid="mistake-notebook-detail">
      <LearnerTopbar as="header" showSignOut><Link className="button-link button-link--secondary" to="/mistake-notebook">Back to Mistake Notebook</Link><Link className="button-link button-link--secondary" to="/dashboard">Dashboard</Link></LearnerTopbar>
      {state.status === 'error' && <section className="notebook-state" role="alert"><h1>Mistake review unavailable</h1><p>{state.error}</p><button type="button" onClick={state.reload}>Try again</button></section>}
      {state.status === 'loaded' && <article className="mistake-detail-card">
        <header><p className="eyebrow">Mistake review</p><h1>{state.data.skill?.title ?? state.data.topic?.title ?? 'Submitted question'}</h1><p>{mistakeSourceLabel(state.data.sourceType)} · <time dateTime={state.data.submittedAt}>{formatNotebookDate(state.data.submittedAt)}</time></p></header>
        <section aria-labelledby="mistake-question-title"><h2 id="mistake-question-title">Question</h2><p className="mistake-prompt">{state.data.prompt}</p></section>
        <div className="mistake-answer-grid">
          <section className={state.data.wasUnanswered ? 'mistake-answer is-unanswered' : 'mistake-answer is-incorrect'} aria-labelledby="your-answer-title"><h2 id="your-answer-title">Your answer</h2><p>{state.data.wasUnanswered ? 'Unanswered' : state.data.selectedAnswer}</p><strong>{state.data.wasUnanswered ? 'No answer was submitted; this counted as incorrect.' : 'Incorrect answer'}</strong></section>
          <section className="mistake-answer is-correct" aria-labelledby="correct-answer-title"><h2 id="correct-answer-title">Correct answer</h2><p>{state.data.correctAnswer}</p><strong>Correct answer</strong></section>
        </div>
        <section aria-labelledby="mistake-why-title"><h2 id="mistake-why-title">Why</h2><p>{state.data.explanation ?? 'An explanation was not preserved for this historical question.'}</p></section>
        {state.data.mistakePattern !== null && <section className="mistake-pattern-detail" aria-labelledby="mistake-pattern-title"><h2 id="mistake-pattern-title">Common mistake pattern</h2><p>{state.data.mistakePattern}</p><p className="meta-copy">This label comes from the persisted distractor classification for the selected answer.</p></section>}
        <dl className="mistake-context">
          <div><dt>Subject</dt><dd>{state.data.subject?.title ?? 'Not available'}</dd></div>
          <div><dt>Topic</dt><dd>{state.data.topic?.title ?? 'Not available'}</dd></div>
          <div><dt>Skill</dt><dd>{state.data.skill?.title ?? 'Not mapped'}</dd></div>
          <div><dt>Current status</dt><dd>{skillStatusLabel(state.data.currentSkillStatus) ?? 'Not enough mapped evidence'}</dd></div>
        </dl>
        {state.data.relatedLesson !== null && <section><h2>Related lesson</h2><p>{state.data.relatedLesson.title}</p></section>}
        <div className="notebook-actions notebook-actions--detail">{state.data.relatedLesson !== null && <Link className="button-link" to={state.data.relatedLesson.route}>Review related lesson</Link>}{state.data.practiceRoute !== null && <Link className="button-link button-link--secondary" to={state.data.practiceRoute}>Practice this skill</Link>}{state.data.skill !== null && <Link className="button-link button-link--secondary" to="/smart-recovery">Open Smart Recovery</Link>}<Link className="button-link button-link--secondary" to="/mistake-notebook">Back to Mistake Notebook</Link></div>
      </article>}
    </main>
  )
}
export function MistakeNotebookDetailPage() {
  const { entryId = '' } = useParams()
  return <MistakeNotebookDetailPageView state={useMistakeNotebookEntry(entryId)} />
}
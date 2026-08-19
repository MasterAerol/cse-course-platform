import { useState } from 'react'
import { Link } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWiseLoader, PasaWisePageLoader } from '../components/PasaWiseLoader'
import { useMistakeNotebookList, useMistakeNotebookSummary, type MistakeNotebookViewState } from '../hooks/use-mistake-notebook'
import { formatNotebookDate, mistakeSourceLabel, skillStatusLabel } from '../lib/mistake-notebook-copy'
import type { MistakeNotebookFilters, MistakeNotebookList, MistakeNotebookSummary } from '../lib/mistake-notebook-api'

function preview(prompt: string): string { return prompt.length <= 180 ? prompt : `${prompt.slice(0, 177)}...` }

export function MistakeNotebookPageView({
  summaryState, listState, filters, onFiltersChange,
}: {
  summaryState: MistakeNotebookViewState<MistakeNotebookSummary>
  listState: MistakeNotebookViewState<MistakeNotebookList>
  filters: MistakeNotebookFilters
  onFiltersChange: (filters: MistakeNotebookFilters) => void
}) {
  const clearFilters = () => onFiltersChange({ page: 1, limit: filters.limit ?? 20 })
  const hasFilters = Boolean(filters.subject || filters.source || filters.skill || filters.unansweredOnly || filters.repeatedPatternOnly)

  if (summaryState.status === 'loading' && listState.status === 'loading') {
    return <PasaWisePageLoader label="Loading your Mistake Notebook…" />
  }

  return (
    <main className="page-shell mistake-notebook-page" data-testid="mistake-notebook-page">
      <LearnerTopbar as="header" showSignOut>
        <Link className="button-link button-link--secondary" to="/dashboard">Dashboard</Link>
        <Link className="button-link button-link--secondary" to="/smart-recovery">Smart Recovery</Link>
      </LearnerTopbar>
      <header className="mistake-notebook-header">
        <p className="eyebrow">Mistake Notebook</p>
        <h1>Turn every mistake into a review plan.</h1>
        <p>Review submitted incorrect answers, reliable mistake patterns, and the lessons connected to them.</p>
      </header>
      {summaryState.status === 'loading' && <section className="notebook-state" aria-busy="true" aria-live="polite"><PasaWiseLoader compact label="Loading your notebook summary…" /></section>}
      {summaryState.status === 'error' && <section className="notebook-state" role="alert"><h2>Summary unavailable</h2><p>{summaryState.error}</p><button type="button" onClick={summaryState.reload}>Try again</button></section>}
      {summaryState.status === 'loaded' && (
        <dl className="notebook-summary" aria-label="Mistake Notebook summary">
          <div><dt>Total mistakes</dt><dd>{summaryState.data.totalMistakes}</dd></div>
          <div><dt>Recent mistakes</dt><dd>{summaryState.data.recentMistakes}</dd></div>
          <div><dt>Top weak subject</dt><dd>{summaryState.data.mistakesBySubject[0]?.title ?? 'Not available'}</dd></div>
          <div><dt>Most repeated skill</dt><dd>{summaryState.data.topMistakeSkills[0]?.title ?? 'Not available'}</dd></div>
        </dl>
      )}
      <section className="notebook-filter-card" aria-labelledby="notebook-filters-title">
        <div className="notebook-filter-heading"><h2 id="notebook-filters-title">Filter mistakes</h2>{hasFilters && <button className="button-secondary" type="button" onClick={clearFilters}>Clear filters</button>}</div>
        <div className="notebook-filters">
          <label>Subject<select value={filters.subject ?? ''} onChange={(event) => onFiltersChange({ ...filters, subject: event.target.value || undefined, page: 1 })}><option value="">All subjects</option>{summaryState.status === 'loaded' && summaryState.data.mistakesBySubject.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label>
          <label>Source<select value={filters.source ?? ''} onChange={(event) => onFiltersChange({ ...filters, source: (event.target.value || undefined) as MistakeNotebookFilters['source'], page: 1 })}><option value="">All sources</option><option value="practice">Generated Practice</option><option value="subject_assessment">Subject Assessment</option><option value="mock_exam">Full Mock Examination</option><option value="smart_recovery">Smart Recovery</option></select></label>
          <label>Skill<select value={filters.skill ?? ''} onChange={(event) => onFiltersChange({ ...filters, skill: event.target.value || undefined, page: 1 })}><option value="">All listed skills</option>{summaryState.status === 'loaded' && summaryState.data.topMistakeSkills.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label>
          <label className="notebook-check"><input type="checkbox" checked={filters.unansweredOnly ?? false} onChange={(event) => onFiltersChange({ ...filters, unansweredOnly: event.target.checked, page: 1 })} />Unanswered only</label>
          <label className="notebook-check"><input type="checkbox" checked={filters.repeatedPatternOnly ?? false} onChange={(event) => onFiltersChange({ ...filters, repeatedPatternOnly: event.target.checked, page: 1 })} />Repeated patterns only</label>
        </div>
      </section>
      {listState.status === 'loading' && <section className="notebook-state" aria-busy="true" aria-live="polite"><PasaWiseLoader label="Loading your saved mistakes…" /></section>}
      {listState.status === 'error' && <section className="notebook-state" role="alert"><h2>Mistakes could not be loaded</h2><p>{listState.error}</p><button type="button" onClick={listState.reload}>Try again</button></section>}
      {listState.status === 'loaded' && listState.data.entries.length === 0 && (
        <section className="notebook-empty"><h2>{hasFilters ? 'No mistakes match these filters.' : 'No mistakes recorded yet'}</h2><p>{hasFilters ? 'Try clearing one or more filters.' : 'Submitted incorrect answers will appear here so you can review and improve them.'}</p>{hasFilters && <button type="button" onClick={clearFilters}>Clear filters</button>}</section>
      )}
      {listState.status === 'loaded' && listState.data.entries.length > 0 && (
        <section aria-labelledby="mistake-list-title"><h2 id="mistake-list-title" className="visually-hidden">Submitted mistakes</h2><div className="mistake-card-list">{listState.data.entries.map((entry) => {
          const status = skillStatusLabel(entry.currentSkillStatus)
          return <article className="mistake-card" key={entry.id}>
            <div className="mistake-card__meta"><span>{entry.subject?.title ?? 'General review'}</span><span>{mistakeSourceLabel(entry.sourceType)}</span><time dateTime={entry.submittedAt}>{formatNotebookDate(entry.submittedAt)}</time></div>
            <h3>{entry.skill?.title ?? entry.topic?.title ?? 'Submitted question'}</h3><p>{preview(entry.prompt)}</p>
            <p className={entry.wasUnanswered ? 'mistake-answer-state is-unanswered' : 'mistake-answer-state is-incorrect'}>{entry.wasUnanswered ? 'Unanswered — counted as incorrect' : 'Your submitted answer was incorrect'}</p>
            {entry.mistakePattern !== null && <p className="notebook-pattern"><strong>Pattern:</strong> {entry.mistakePattern}</p>}
            {status !== null && <p className="meta-copy">Current skill status: {status}</p>}
            <div className="notebook-actions"><Link className="button-link" to={`/mistake-notebook/${encodeURIComponent(entry.id)}`}>View mistake</Link>{entry.relatedLesson !== null && <Link className="button-link button-link--secondary" to={entry.relatedLesson.route}>Review lesson</Link>}{entry.practiceRoute !== null && <Link className="button-link button-link--secondary" to={entry.practiceRoute}>Practice skill</Link>}</div>
          </article>
        })}</div>
        <nav className="notebook-pagination" aria-label="Mistake Notebook pages"><button className="button-secondary" type="button" disabled={!listState.data.pagination.hasPreviousPage} onClick={() => onFiltersChange({ ...filters, page: Math.max(1, (filters.page ?? 1) - 1) })}>Previous page</button><span>Page {listState.data.pagination.page} of {listState.data.pagination.totalPages}</span><button className="button-secondary" type="button" disabled={!listState.data.pagination.hasNextPage} onClick={() => onFiltersChange({ ...filters, page: (filters.page ?? 1) + 1 })}>Next page</button></nav>
        </section>
      )}
    </main>
  )
}
export function MistakeNotebookPage() {
  const [filters, setFilters] = useState<MistakeNotebookFilters>({ page: 1, limit: 20 })
  return <MistakeNotebookPageView summaryState={useMistakeNotebookSummary()} listState={useMistakeNotebookList(filters)} filters={filters} onFiltersChange={setFilters} />
}
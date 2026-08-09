import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { MistakeNotebookCardView } from '../src/react-app/components/MistakeNotebookCard'
import { MistakeNotebookDetailPageView } from '../src/react-app/pages/MistakeNotebookDetailPage'
import { MistakeNotebookPageView } from '../src/react-app/pages/MistakeNotebookPage'
import type { MistakeNotebookEntry, MistakeNotebookList, MistakeNotebookSummary } from '../src/react-app/lib/mistake-notebook-api'

const summary: MistakeNotebookSummary = {
  totalMistakes: 34, recentMistakes: 6, latestMistakeAt: '2026-08-10T00:00:00.000Z', reviewedSourceCount: 5,
  mistakesBySubject: [{ slug: 'numerical-ability', title: 'Numerical Ability', count: 20 }],
  topMistakeSkills: [{ slug: 'combined-work-rate', title: 'Combined Work Rate', count: 8 }],
  repeatedMistakePatterns: [{ pattern: 'Inverted Work Rate', count: 4 }],
}
const entry: MistakeNotebookEntry = {
  id: 'practice:attempt-one:snapshot-one', sourceType: 'practice', attemptPublicId: 'attempt-one', snapshotPublicId: 'snapshot-one',
  submittedAt: '2026-08-10T00:00:00.000Z', prompt: 'If two workers finish a task at different rates, what is their combined rate?',
  selectedAnswer: 'Add their completion times.', correctAnswer: 'Add their work rates.',
  explanation: 'Convert each completion time to a rate, then add the rates.', wasUnanswered: false,
  subject: { slug: 'numerical-ability', title: 'Numerical Ability' }, topic: { slug: 'work-rate', title: 'Work and Rate' },
  skill: { slug: 'combined-work-rate', title: 'Combined Work Rate' }, currentSkillStatus: 'improving',
  mistakePattern: 'Inverted Work Rate', relatedLesson: { title: 'Combined Work', route: '/courses/cse-professional/lessons/lesson-combined-work' },
  practiceRoute: '/courses/cse-professional/lessons/lesson-work-rate-practice',
}
const list: MistakeNotebookList = {
  entries: [entry], pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
  appliedFilters: { unansweredOnly: false, repeatedPatternOnly: false },
}
const reload = vi.fn()
function render(node: React.ReactNode) { return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>) }

describe('Mistake Notebook learner UI', () => {
  it('renders the compact dashboard shortcut', () => {
    const markup = render(<MistakeNotebookCardView summary={summary} />)
    expect(markup).toContain('data-testid="mistake-notebook-card"')
    expect(markup).toContain('34 mistakes to review')
    expect(markup).toContain('Combined Work Rate')
    expect(markup).toContain('href="/mistake-notebook"')
  })

  it('renders summary, accessible filters, cards, pattern, status, and actions', () => {
    const markup = render(<MistakeNotebookPageView
      summaryState={{ status: 'loaded', data: summary, error: null, reload }}
      listState={{ status: 'loaded', data: list, error: null, reload }}
      filters={{ page: 1, limit: 20 }} onFiltersChange={vi.fn()}
    />)
    expect(markup).toContain('data-testid="mistake-notebook-page"')
    expect(markup).toContain('Turn every mistake into a review plan.')
    expect(markup).toContain('Mistake Notebook summary')
    expect(markup).toContain('Filter mistakes')
    expect(markup).toContain('Generated Practice')
    expect(markup).toContain('Inverted Work Rate')
    expect(markup).toContain('href="/mistake-notebook/practice%3Aattempt-one%3Asnapshot-one"')
    expect(markup).toContain('Review lesson')
    expect(markup).toContain('Practice skill')
    expect(markup).toContain('aria-label="Mistake Notebook pages"')
  })

  it('renders selected and correct answers with text labels and improvement context', () => {
    const markup = render(<MistakeNotebookDetailPageView state={{ status: 'loaded', data: entry, error: null, reload }} />)
    expect(markup).toContain('data-testid="mistake-notebook-detail"')
    expect(markup).toContain('Your answer')
    expect(markup).toContain('Incorrect answer')
    expect(markup).toContain('Correct answer')
    expect(markup).toContain('Add their work rates.')
    expect(markup).toContain('Current status')
    expect(markup).toContain('Improving')
    expect(markup).toContain('Open Smart Recovery')
  })

  it('handles unanswered and missing optional metadata without inventing a pattern', () => {
    const historical = { ...entry, selectedAnswer: null, wasUnanswered: true, mistakePattern: null, skill: null, currentSkillStatus: null, relatedLesson: null, practiceRoute: null }
    const markup = render(<MistakeNotebookDetailPageView state={{ status: 'loaded', data: historical, error: null, reload }} />)
    expect(markup).toContain('Unanswered')
    expect(markup).toContain('counted as incorrect')
    expect(markup).toContain('Not mapped')
    expect(markup).not.toContain('Common mistake pattern')
  })

  it('renders base and filtered empty states plus retry states', () => {
    const emptyList = { ...list, entries: [], pagination: { ...list.pagination, total: 0 } }
    const empty = render(<MistakeNotebookPageView summaryState={{ status: 'loaded', data: { ...summary, totalMistakes: 0 }, error: null, reload }} listState={{ status: 'loaded', data: emptyList, error: null, reload }} filters={{}} onFiltersChange={vi.fn()} />)
    const filtered = render(<MistakeNotebookPageView summaryState={{ status: 'loaded', data: summary, error: null, reload }} listState={{ status: 'loaded', data: emptyList, error: null, reload }} filters={{ source: 'mock_exam' }} onFiltersChange={vi.fn()} />)
    const error = render(<MistakeNotebookDetailPageView state={{ status: 'error', data: null, error: 'Request failed.', reload }} />)
    expect(empty).toContain('No mistakes recorded yet')
    expect(empty).toContain('Submitted incorrect answers will appear here')
    expect(filtered).toContain('No mistakes match these filters.')
    expect(filtered).toContain('Clear filters')
    expect(error).toContain('role="alert"')
    expect(error).toContain('Try again')
  })
})
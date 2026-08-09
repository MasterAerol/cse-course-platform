import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ReadinessCardView } from '../src/react-app/components/ReadinessCard'
import { ReadinessPageView } from '../src/react-app/pages/ReadinessPage'
import type { CseReadiness } from '../src/react-app/lib/readiness-api'

const readiness: CseReadiness = {
  formulaVersion: 1, score: 72, hasSufficientEvidence: true, readinessBand: 'getting_closer', confidence: 'moderate', confidenceExplanation: 'Your estimate includes meaningful submitted evidence.',
  evidence: { mockAttemptCount: 1, subjectAssessmentCount: 4, subjectsAssessed: 4, observedSkillCount: 80, classifiedSkillCount: 60, skillEvidenceCount: 400, recentPracticeQuestionCount: 50 },
  components: [
    { key: 'fullMock', title: 'Full Mock', contribution: 25, maximum: 35, evidenceAvailable: true, explanation: 'Latest performance matters most.' },
    { key: 'subjectAssessments', title: 'Subject Assessments', contribution: 21, maximum: 30, evidenceAvailable: true, explanation: 'Uses the mock distribution.' },
    { key: 'skillStrength', title: 'Skill Strength', contribution: 14, maximum: 20, evidenceAvailable: true, explanation: 'Uses observed skills.' },
    { key: 'recentPractice', title: 'Recent Practice', contribution: 8, maximum: 10, evidenceAvailable: true, explanation: 'Uses 50 questions.' },
    { key: 'improvementConsistency', title: 'Improvement and Consistency', contribution: 4, maximum: 5, evidenceAvailable: true, explanation: 'Uses bounded comparisons.' },
  ],
  subjects: [
    { slug: 'verbal-ability', title: 'Verbal Ability', readinessPercent: 81, readinessLabel: 'Strong', latestAssessmentScorePercent: 82, assessmentAttemptCount: 2, skillStatusCounts: { not_enough_data: 2, needs_more_practice: 1, improving: 4, strong: 8 } },
    { slug: 'numerical-ability', title: 'Numerical Ability', readinessPercent: 62, readinessLabel: 'Developing', latestAssessmentScorePercent: 60, assessmentAttemptCount: 1, skillStatusCounts: { not_enough_data: 4, needs_more_practice: 8, improving: 3, strong: 2 } },
    { slug: 'analytical-ability', title: 'Analytical Ability', readinessPercent: 74, readinessLabel: 'Developing', latestAssessmentScorePercent: 75, assessmentAttemptCount: 1, skillStatusCounts: { not_enough_data: 2, needs_more_practice: 3, improving: 6, strong: 5 } },
    { slug: 'general-information', title: 'General Information', readinessPercent: 70, readinessLabel: 'Developing', latestAssessmentScorePercent: 70, assessmentAttemptCount: 1, skillStatusCounts: { not_enough_data: 1, needs_more_practice: 2, improving: 3, strong: 2 } },
  ],
  limiters: [{ title: 'Combined Work Rate needs more practice', detail: 'Based on recent evidence.' }], positiveSignals: [{ title: 'Verbal Ability: 82%', detail: 'Strongest assessment.' }],
  recommendation: { title: 'Start Smart Recovery', detail: 'Target your current weak skills.', actionLabel: 'Open Smart Recovery', route: '/smart-recovery' }, generatedAt: '2026-08-10T00:00:00.000Z', disclaimer: 'This readiness estimate does not guarantee a passing CSE result.',
}
function render(node: React.ReactNode) { return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>) }
describe('CSE Readiness UI', () => {
  it('renders a compact dashboard card with score, confidence, subjects, and actions', () => { const markup = render(<ReadinessCardView readiness={readiness} />); expect(markup).toContain('data-testid="readiness-card"'); expect(markup).toContain('72 / 100'); expect(markup).toContain('Moderate evidence'); expect(markup).toContain('Strongest: Verbal Ability'); expect(markup).toContain('Needs attention: Numerical Ability'); expect(markup).toContain('href="/readiness"') })
  it('renders an accessible score, component bars, four subjects, signals, and recommendation', () => { const markup = render(<ReadinessPageView state={{ status: 'loaded', data: readiness, error: null, reload: vi.fn() }} />); expect(markup).toContain('data-testid="readiness-page"'); expect(markup).toContain('aria-label="CSE Readiness Score: 72 out of 100"'); expect(markup).toContain('Component breakdown'); expect(markup.match(/role="progressbar"/gu)).toHaveLength(9); expect(markup).toContain('What&#x27;s helping'); expect(markup).toContain('What&#x27;s holding you back'); expect(markup).toContain('Open Smart Recovery'); expect(markup).toContain('does not guarantee') })
  it('renders a truthful low-evidence state without claiming mastery', () => { const low = { ...readiness, score: 0, hasSufficientEvidence: false, confidence: 'low' as const, readinessBand: 'building_foundations' as const, subjects: readiness.subjects.map((subject) => ({ ...subject, readinessPercent: null, readinessLabel: 'Not enough evidence' as const, latestAssessmentScorePercent: null })) }; const markup = render(<ReadinessPageView state={{ status: 'loaded', data: low, error: null, reload: vi.fn() }} />); expect(markup).toContain('Not enough evidence for a reliable readiness estimate yet.'); expect(markup).toContain('No reliable percentage yet.'); expect(markup).not.toContain('guaranteed pass') })
  it('renders safe loading and retry states', () => { const loading = render(<ReadinessPageView state={{ status: 'loading', data: null, error: null, reload: vi.fn() }} />); const error = render(<ReadinessPageView state={{ status: 'error', data: null, error: 'Request failed.', reload: vi.fn() }} />); expect(loading).toContain('aria-busy="true"'); expect(error).toContain('role="alert"'); expect(error).toContain('Try again') })
})

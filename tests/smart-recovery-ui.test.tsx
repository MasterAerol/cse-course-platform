import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import {
  SmartRecoveryCardContent,
  SmartRecoveryCardView,
} from '../src/react-app/components/SmartRecoveryCard'
import {
  SmartRecoveryPageView,
} from '../src/react-app/pages/SmartRecoveryPage'
import {
  SmartRecoverySkillPageView,
} from '../src/react-app/pages/SmartRecoverySkillPage'
import type {
  SmartRecoveryDashboard,
  SmartRecoveryDetails,
  SmartRecoverySkillSummary,
} from '../src/react-app/lib/smart-recovery-api'

const evidenceWindow = {
  lookbackDays: 180,
  maximumItemsPerSkill: 20,
  minimumEvidenceItems: 5,
  recentItemCount: 5,
  recentWeightMultiplier: 1.5,
  sourceWeights: {
    generated_practice: 1,
    subject_assessment: 1.25,
    mock_exam: 1.5,
  },
  needsMorePracticeBelowPercent: 60,
  strongAtOrAbovePercent: 80,
  meaningfulTrendPercent: 15,
  maximumMistakePatterns: 3,
} as const

const evidenceScope = {
  submittedGeneratedAttemptsOnly: true,
  fixedQuestionEvidenceIncluded: false,
  ambiguousGeneratorMappingsIncluded: false,
} as const

const weakSkill: SmartRecoverySkillSummary = {
  skill: {
    slug: 'context-clues.definition',
    title: 'Definition context clues',
    description: 'Use explicit definitions in nearby text.',
    taxonomyVersion: 1,
    subjectSlug: 'verbal-ability',
    subjectTitle: 'Verbal Ability',
    topicSlug: 'context-clues',
    topicTitle: 'Context Clues',
    relatedLessonSlug: 'definition-context-clues',
    relatedLessonTitle: 'Definition Context Clues',
  },
  status: 'needs_more_practice',
  trend: 'declining',
  evidenceCount: 8,
  answeredCount: 8,
  correctCount: 3,
  incorrectCount: 5,
  unansweredCount: 0,
  accuracyPercent: 37.5,
  recentAccuracyPercent: 20,
  previousAccuracyPercent: 66.67,
  lastPracticedAt: '2026-08-05T10:00:00.000Z',
  mistakePatterns: [
    {
      distractorType: 'near_synonym',
      count: 3,
      percentOfClassifiedMistakes: 60,
    },
  ],
}

const dashboard: SmartRecoveryDashboard = {
  taxonomyVersion: 1,
  formulaVersion: 1,
  calculatedAt: '2026-08-06T10:00:00.000Z',
  evidenceWindow,
  evidenceScope,
  state: 'has_priorities',
  eligibleEvidenceCount: 8,
  excludedEvidenceCount: 2,
  skillsWithEvidence: 1,
  needsMorePractice: [weakSkill],
  improving: [],
  strong: [],
}

const details: SmartRecoveryDetails = {
  taxonomyVersion: 1,
  formulaVersion: 1,
  calculatedAt: dashboard.calculatedAt,
  evidenceWindow,
  evidenceScope,
  summary: weakSkill,
  sourceBreakdown: [
    {
      sourceType: 'generated_practice',
      evidenceCount: 5,
      answeredCount: 5,
      correctCount: 2,
      accuracyPercent: 40,
    },
    {
      sourceType: 'mock_exam',
      evidenceCount: 3,
      answeredCount: 3,
      correctCount: 1,
      accuracyPercent: 33.33,
    },
  ],
}

function render(node: React.ReactNode): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
}

describe('Smart Recovery Phase C UI', () => {
  it('renders the dashboard priority card without a recovery-attempt action', () => {
    const markup = render(<SmartRecoveryCardView summary={dashboard} />)
    expect(markup).toContain('data-testid="smart-recovery-card"')
    expect(markup).toContain('Definition context clues')
    expect(markup).toContain('37.5% weighted accuracy')
    expect(markup).toContain('href="/smart-recovery"')
    expect(markup).not.toContain('Start Recovery')
  })

  it('renders accessible card loading and error states with retry', () => {
    const loading = render(
      <SmartRecoveryCardContent
        state={{ status: 'loading', data: null, error: null, reload: vi.fn() }}
      />,
    )
    const error = render(
      <SmartRecoveryCardContent
        state={{ status: 'error', data: null, error: 'Request failed.', reload: vi.fn() }}
      />,
    )
    expect(loading).toContain('aria-busy="true"')
    expect(loading).toContain('aria-live="polite"')
    expect(error).toContain('role="alert"')
    expect(error).toContain('Try again')
  })

  it('renders the overview priority list and stable encoded skill route', () => {
    const markup = render(
      <SmartRecoveryPageView
        state={{ status: 'loaded', data: dashboard, error: null, reload: vi.fn() }}
      />,
    )
    expect(markup).toContain('data-testid="smart-recovery-overview"')
    expect(markup).toContain('Needs more practice')
    expect(markup).toContain('Weighted accuracy')
    expect(markup).toContain(
      'href="/smart-recovery/skills/context-clues.definition"',
    )
    expect(markup).not.toContain('Start Recovery')
  })

  it('explains an empty evidence state and the fixed-question exclusion', () => {
    const emptyDashboard: SmartRecoveryDashboard = {
      ...dashboard,
      state: 'not_enough_data',
      eligibleEvidenceCount: 0,
      skillsWithEvidence: 0,
      needsMorePractice: [],
    }
    const markup = render(
      <SmartRecoveryPageView
        state={{ status: 'loaded', data: emptyDashboard, error: null, reload: vi.fn() }}
      />,
    )
    expect(markup).toContain('No skill results to show yet')
    expect(markup).toContain('Fixed practice and quiz questions are not included yet.')
    expect(markup).toContain('at least 5 evidence items')
  })

  it('renders the exact details contract, semantic table, and mistake patterns', () => {
    const markup = render(
      <SmartRecoverySkillPageView
        state={{ status: 'loaded', data: details, error: null, reload: vi.fn() }}
      />,
    )
    expect(markup).toContain('data-testid="smart-recovery-skill-details"')
    expect(markup).toContain('Current signal')
    expect(markup).toContain('Related lesson')
    expect(markup).toContain('Definition Context Clues')
    expect(markup).toContain('Evidence source breakdown for Definition context clues')
    expect(markup).toContain('scope="col"')
    expect(markup).toContain('scope="row"')
    expect(markup).toContain('Near Synonym')
    expect(markup).toContain('60% of classified mistakes')
    expect(markup).not.toContain('answer key')
    expect(markup).not.toContain('Start Recovery')
  })

  it('renders overview and detail page loading/error states accessibly', () => {
    const overviewLoading = render(
      <SmartRecoveryPageView
        state={{ status: 'loading', data: null, error: null, reload: vi.fn() }}
      />,
    )
    const detailError = render(
      <SmartRecoverySkillPageView
        state={{ status: 'error', data: null, error: 'Skill not found.', reload: vi.fn() }}
      />,
    )
    expect(overviewLoading).toContain('aria-busy="true"')
    expect(detailError).toContain('role="alert"')
    expect(detailError).toContain('Try again')
  })
})

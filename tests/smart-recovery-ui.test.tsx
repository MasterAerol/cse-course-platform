import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import dashboardPageSource from '../src/react-app/pages/DashboardPage.tsx?raw'
import learnerTopbarSource from '../src/react-app/components/LearnerTopbar.tsx?raw'
import recoveryAttemptPageSource from '../src/react-app/pages/SmartRecoveryAttemptPage.tsx?raw'
import recoveryOverviewPageSource from '../src/react-app/pages/SmartRecoveryPage.tsx?raw'
import recoveryResultPageSource from '../src/react-app/pages/SmartRecoveryResultPage.tsx?raw'
import recoverySkillPageSource from '../src/react-app/pages/SmartRecoverySkillPage.tsx?raw'
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
  RecoveryHistory,
  SmartRecoveryDashboard,
  SmartRecoveryDetails,
  SmartRecoverySkillSummary,
} from '../src/react-app/lib/smart-recovery-api'

declare global {
  var __PASAWISE_DESIGN_SYSTEM_SOURCE__: unknown
}

const injectedStyles: unknown = globalThis.__PASAWISE_DESIGN_SYSTEM_SOURCE__
if (typeof injectedStyles !== 'string') {
  throw new Error('Vitest did not inject the PasaWise design-system source.')
}
const stylesSource = injectedStyles

function hasRule(selector: string, declarations: RegExp[]): boolean {
  const sourceWithoutComments = stylesSource.replace(/\/\*[\s\S]*?\*\//g, '')
  return Array.from(sourceWithoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/gs)).some(
    (match) =>
      (match[1] ?? '')
        .split(',')
        .map((value) => value.trim())
        .includes(selector) &&
      declarations.every((declaration) => declaration.test(match[2] ?? '')),
  )
}

const evidenceWindow = {
  lookbackDays: 180,
  maximumItemsPerSkill: 50,
  minimumEvidenceItems: 5,
  recentItemCount: 5,
  recentWeightMultiplier: 1.5,
  sourceWeights: {
    generated_practice: 0.75,
    subject_assessment: 1.25,
    mock_exam: 1.25,
      recovery: 1.25,
  },
  needsMorePracticeBelowPercent: 60,
  strongAtOrAbovePercent: 80,
  meaningfulTrendPercent: 15,
  maximumMistakePatterns: 3,
} as const

const evidenceScope = {
  submittedGeneratedAttemptsOnly: true,
    recoveryEvidenceIncluded: true,
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

const improvingSkill: SmartRecoverySkillSummary = {
  ...weakSkill,
  skill: {
    ...weakSkill.skill,
    slug: 'context-clues.example',
    title: 'Example context clues',
  },
  status: 'improving',
  trend: 'improving',
  accuracyPercent: 68,
  recentAccuracyPercent: 80,
  previousAccuracyPercent: 50,
}

const strongSkill: SmartRecoverySkillSummary = {
  ...weakSkill,
  skill: {
    ...weakSkill.skill,
    slug: 'context-clues.contrast',
    title: 'Contrast context clues',
  },
  status: 'strong',
  trend: 'stable',
  accuracyPercent: 88,
  recentAccuracyPercent: 90,
  previousAccuracyPercent: 86,
}

const dashboard: SmartRecoveryDashboard = {
  taxonomyVersion: 1,
  formulaVersion: 2,
  calculatedAt: '2026-08-06T10:00:00.000Z',
  evidenceWindow,
  evidenceScope,
  state: 'has_priorities',
  eligibleEvidenceCount: 8,
  excludedEvidenceCount: 2,
  skillsWithEvidence: 1,
  prioritySkillCount: 1,
  needsMorePractice: [weakSkill],
  improving: [],
  strong: [],
  recoveryAvailable: false,
  activeRecoveryAttemptPublicId: null,
  recommendedRecoveryQuestionCount: 0,
  eligibleRecoverySkillCount: 0,
  selectedRecoverySkillCount: 0,
  recoveryUnavailableReason: 'not_enough_evidence',
  recoveryDiagnostics: {
    statusCounts: { not_enough_data: 0, needs_more_practice: 1, improving: 0, strong: 0, neutral: 0 },
    generatableSkillCount: 0,
    selectedSkillCount: 0,
    excludedSkillCount: 1,
    ambiguousEvidenceCount: 0,
    missingCanonicalSkillEvidenceCount: 0,
    missingGeneratorEligibilityCount: 1,
    invalidMappingOrContextEvidenceCount: 0,
  },
  latestRecoveryResult: null,
}

const details: SmartRecoveryDetails = {
  taxonomyVersion: 1,
  formulaVersion: 2,
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

const recoveryHistory: RecoveryHistory = {
  formulaVersion: 2,
  activeAttemptPublicId: null,
  totalSubmittedAttempts: 1,
  historyLimit: 10,
  attempts: [
    {
      attempt: {
        publicId: 'recovery-attempt-22222222-2222-4222-8222-222222222222',
        formulaVersion: 2,
        startedAt: '2026-08-04T10:00:00.000Z',
        submittedAt: '2026-08-05T10:00:00.000Z',
      },
      scorePercent: 100,
      correctCount: 8,
      questionCount: 8,
      skillsTrained: 1,
      interpretation: {
        code: 'improved',
        title: 'Recovery improved',
        message: 'Your submitted result improved the recorded signal.',
      },
      skillProgress: [
        {
          skill: weakSkill.skill,
          questions: 2,
          correct: 2,
          accuracyPercent: 100,
          progress: {
            statusBefore: 'needs_more_practice',
            weightedAccuracyBefore: 37.5,
            evidenceCountBefore: 8,
            statusAfter: 'improving',
            weightedAccuracyAfter: 62.5,
            evidenceCountAfter: 10,
            percentagePointChange: 25,
            trend: 'improved',
          },
        },
      ],
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
    expect(markup).toContain('data-testid="smart-recovery-recommendation"')
    expect(markup).toContain('Your next recovery focus')
    expect(markup).toContain('Definition context clues')
    expect(markup).toContain('Weak')
    expect(markup).toContain('Weighted accuracy')
    expect(markup).toContain('37.5%')
    expect(markup).toContain('8 evidence items')
    expect(markup).toContain('weakest current weighted accuracy')
    expect(markup).toContain(
      'href="/smart-recovery/skills/context-clues.definition"',
    )
    expect(markup).not.toContain('Start Recovery')
  })

  it('renders Weak, Improving, and Strong skill signals without color-only meaning', () => {
    const signalDashboard: SmartRecoveryDashboard = {
      ...dashboard,
      needsMorePractice: [weakSkill],
      improving: [improvingSkill],
      strong: [strongSkill],
      skillsWithEvidence: 3,
    }
    const markup = render(
      <SmartRecoveryPageView
        state={{ status: 'loaded', data: signalDashboard, error: null, reload: vi.fn() }}
      />,
    )

    expect(markup).toContain('Current skill signal counts')
    expect(markup).toContain('1</strong> Weak')
    expect(markup).toContain('1</strong> Improving')
    expect(markup).toContain('1</strong> Strong')
    expect(markup).toContain('Example context clues')
    expect(markup).toContain('Contrast context clues')
    expect(markup).toContain('Recent evidence is moving in a positive direction.')
    expect(markup).toContain('Current submitted evidence shows a strong skill signal.')
  })

  it('renders an intentional no-weak-skill state without an empty recovery CTA', () => {
    const noWeakDashboard: SmartRecoveryDashboard = {
      ...dashboard,
      state: 'no_current_weakness',
      prioritySkillCount: 0,
      needsMorePractice: [],
      improving: [],
      strong: [strongSkill],
      recoveryUnavailableReason: 'no_current_weakness',
      latestRecoveryResult: {
        attemptPublicId:
          'recovery-attempt-11111111-1111-4111-8111-111111111111',
        scorePercent: 100,
        correctCount: 8,
        questionCount: 8,
        submittedAt: '2026-08-05T10:00:00.000Z',
      },
    }
    const markup = render(
      <SmartRecoveryPageView
        state={{ status: 'loaded', data: noWeakDashboard, error: null, reload: vi.fn() }}
      />,
    )

    expect(markup).toContain('Your skill signals look strong')
    expect(markup).toContain('No current weak skill needs a targeted recovery set.')
    expect(markup).not.toContain('Start Recovery Set')
    expect(markup).toContain('data-testid="latest-recovery-result"')
    expect(markup).toContain('8 / 8')
    expect(markup).toContain('100%')
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

  it('renders the evidence-based Weak skill hero, source details, and latest result', () => {
    const markup = render(
      <SmartRecoverySkillPageView
        state={{ status: 'loaded', data: details, error: null, reload: vi.fn() }}
        dashboardState={{
          status: 'loaded',
          data: dashboard,
          error: null,
          reload: vi.fn(),
        }}
        historyState={{
          status: 'loaded',
          data: recoveryHistory,
          error: null,
          reload: vi.fn(),
        }}
      />,
    )

    expect(markup).toContain('data-testid="smart-recovery-skill-details"')
    expect(markup).toContain('Smart Recovery · Skill details')
    expect(markup).toContain('Definition context clues')
    expect(markup).toContain('Verbal Ability · Context Clues')
    expect(markup).toContain('Weak')
    expect(markup).toContain('37.5%')
    expect(markup).toContain('Eligible evidence items')
    expect(markup).toContain('Declining')
    expect(markup).toContain('Why this skill needs attention')
    expect(markup).toContain('8 eligible evidence items contribute to this weak skill signal.')
    expect(markup).toContain('Evidence window')
    expect(markup).toContain('180 days')
    expect(markup).toContain('Related lesson')
    expect(markup).toContain('Definition Context Clues')
    expect(markup).toContain(
      'Evidence source breakdown for Definition context clues',
    )
    expect(markup).toContain('scope="col"')
    expect(markup).toContain('scope="row"')
    expect(markup).toContain('Generated practice')
    expect(markup).toContain('Full Mock')
    expect(markup).toContain(
      'Fixed practice and quiz questions are not included in this signal.',
    )
    expect(markup).toContain('Near Synonym')
    expect(markup).toContain('60% of classified mistakes')
    expect(markup).toContain('data-testid="latest-skill-recovery"')
    expect(markup).toContain('2 / 2')
    expect(markup).toContain('100%')
    expect(markup).toContain('moved from 37.5% to 62.5%')
    expect(markup).toContain(
      'href="/smart-recovery/attempts/recovery-attempt-22222222-2222-4222-8222-222222222222/results"',
    )
    expect(markup).not.toContain('answer key')
    expect(markup).not.toContain('Start Recovery Set')
  })

  it('adapts explanations and recovery actions to real skill state', () => {
    const actionableDashboard: SmartRecoveryDashboard = {
      ...dashboard,
      recoveryAvailable: true,
      recommendedRecoveryQuestionCount: 10,
      eligibleRecoverySkillCount: 1,
      selectedRecoverySkillCount: 1,
      recoveryUnavailableReason: null,
    }
    const emptyHistory: RecoveryHistory = {
      ...recoveryHistory,
      totalSubmittedAttempts: 0,
      attempts: [],
    }
    const startMarkup = render(
      <SmartRecoverySkillPageView
        state={{ status: 'loaded', data: details, error: null, reload: vi.fn() }}
        dashboardState={{
          status: 'loaded',
          data: actionableDashboard,
          error: null,
          reload: vi.fn(),
        }}
        historyState={{
          status: 'loaded',
          data: emptyHistory,
          error: null,
          reload: vi.fn(),
        }}
        onStartRecovery={vi.fn()}
      />,
    )
    const activeAttemptPublicId =
      'recovery-attempt-33333333-3333-4333-8333-333333333333'
    const continueMarkup = render(
      <SmartRecoverySkillPageView
        state={{ status: 'loaded', data: details, error: null, reload: vi.fn() }}
        dashboardState={{
          status: 'loaded',
          data: {
            ...actionableDashboard,
            recoveryAvailable: false,
            activeRecoveryAttemptPublicId: activeAttemptPublicId,
            recoveryUnavailableReason: 'active_attempt_exists',
          },
          error: null,
          reload: vi.fn(),
        }}
      />,
    )
    const improvingMarkup = render(
      <SmartRecoverySkillPageView
        state={{
          status: 'loaded',
          data: { ...details, summary: improvingSkill },
          error: null,
          reload: vi.fn(),
        }}
        dashboardState={{
          status: 'loaded',
          data: actionableDashboard,
          error: null,
          reload: vi.fn(),
        }}
      />,
    )
    const strongMarkup = render(
      <SmartRecoverySkillPageView
        state={{
          status: 'loaded',
          data: { ...details, summary: strongSkill },
          error: null,
          reload: vi.fn(),
        }}
        dashboardState={{
          status: 'loaded',
          data: actionableDashboard,
          error: null,
          reload: vi.fn(),
        }}
      />,
    )

    expect(startMarkup).toContain('Start Recovery Set')
    expect(startMarkup).toContain('No recovery result for this skill yet')
    expect(continueMarkup).toContain('Continue Recovery Set')
    expect(continueMarkup).toContain(
      `href="/smart-recovery/attempts/${activeAttemptPublicId}"`,
    )
    expect(improvingMarkup).toContain('Why this skill is improving')
    expect(improvingMarkup).toContain(
      'Continue practicing this skill and build more recent eligible evidence.',
    )
    expect(improvingMarkup).not.toContain('Start Recovery Set')
    expect(improvingMarkup).not.toContain('Continue Recovery Set')
    expect(strongMarkup).toContain('Why this skill is strong')
    expect(strongMarkup).toContain(
      'No targeted recovery is indicated for this skill right now.',
    )
    expect(strongMarkup).not.toContain('Start Recovery Set')
    expect(strongMarkup).not.toContain('Continue Recovery Set')
  })

  it('renders overview and detail page loading/error states accessibly', () => {
    const overviewLoading = render(
      <SmartRecoveryPageView
        state={{ status: 'loading', data: null, error: null, reload: vi.fn() }}
      />,
    )
    const detailLoading = render(
      <SmartRecoverySkillPageView
        state={{ status: 'loading', data: null, error: null, reload: vi.fn() }}
      />,
    )
    const auxiliaryDetailLoading = render(
      <SmartRecoverySkillPageView
        state={{ status: 'loaded', data: details, error: null, reload: vi.fn() }}
        dashboardState={{
          status: 'loading',
          data: null,
          error: null,
          reload: vi.fn(),
        }}
      />,
    )
    const detailError = render(
      <SmartRecoverySkillPageView
        state={{ status: 'error', data: null, error: 'Skill not found.', reload: vi.fn() }}
      />,
    )

    expect(overviewLoading).toContain('aria-busy="true"')
    expect(overviewLoading).toContain('class="pasawise-page-loader"')
    expect(overviewLoading).toContain('Analyzing your skill signals')
    expect(overviewLoading).not.toContain('class="learner-topbar"')
    expect(overviewLoading).not.toContain('Focus where it matters most')
    for (const loadingMarkup of [detailLoading, auxiliaryDetailLoading]) {
      expect(loadingMarkup).toContain('aria-busy="true"')
      expect(loadingMarkup).toContain('class="pasawise-page-loader"')
      expect(loadingMarkup).not.toContain('class="learner-topbar"')
      expect(loadingMarkup).not.toContain('Definition context clues')
    }
    expect(detailError).toContain('role="alert"')
    expect(detailError).toContain('Try again')
  })

  it('uses the shared collapsible learner navigation across Smart Recovery routes', () => {
    const recoveryRouteSources = [
      recoveryOverviewPageSource,
      recoverySkillPageSource,
      recoveryAttemptPageSource,
      recoveryResultPageSource,
    ]

    for (const source of recoveryRouteSources) {
      expect(source).toContain('<LearnerTopbar')
      expect(source).toContain('mobileCollapsible')
      expect(source).toContain('showSignOut')
      expect(source).toContain('ariaLabel="Main navigation"')
      expect(source).toContain('to="/dashboard"')
      expect(source).toContain('to="/courses"')
      expect(source).not.toContain('to="/catalog"')
    }

    expect(learnerTopbarSource).toContain("' topbar--mobile-collapsible'")
    expect(learnerTopbarSource).toContain('aria-expanded={mobileMenuOpen}')
    expect(learnerTopbarSource).toContain("'Open navigation menu'")
    expect(learnerTopbarSource).toContain("event.key === 'Escape'")
    expect(learnerTopbarSource).toContain("event.target.closest('a, button')")
    expect(learnerTopbarSource).toContain("'Sign out'")

    expect(dashboardPageSource).toContain('className="dashboard-topbar"')
    expect(dashboardPageSource).toContain('mobileCollapsible')
    expect(dashboardPageSource).toContain('to="/courses"')
    expect(recoveryOverviewPageSource).toContain('Focus where it matters most')

    const overviewMarkup = render(
      <SmartRecoveryPageView
        state={{ status: 'loaded', data: dashboard, error: null, reload: vi.fn() }}
      />,
    )
    expect(overviewMarkup).toContain('topbar--mobile-collapsible')
    expect(overviewMarkup).toContain('aria-expanded="false"')
    expect(overviewMarkup).toContain('Open navigation menu')
    expect(overviewMarkup).toContain('href="/dashboard"')
    expect(overviewMarkup).toContain('href="/courses"')
    expect(overviewMarkup).toContain('Courses')

    expect(hasRule('.topbar-menu-trigger', [/display:\s*none/])).toBe(true)
    expect(
      hasRule('.topbar.topbar--mobile-collapsible', [
        /flex-direction:\s*row/,
        /flex-wrap:\s*nowrap/,
        /min-height:\s*3\.5rem/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.topbar.topbar--mobile-collapsible .topbar-menu-trigger', [
        /display:\s*inline-flex/,
        /min-height:\s*2\.75rem/,
        /min-width:\s*2\.75rem/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.topbar.topbar--mobile-collapsible .topbar-actions--collapsible', [
        /display:\s*none/,
        /grid-template-columns:\s*minmax\(0,\s*1fr\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.topbar.topbar--mobile-collapsible .topbar-actions--collapsible.is-open', [
        /display:\s*grid/,
      ]),
    ).toBe(true)
    expect(
      hasRule(
        '.topbar.topbar--mobile-collapsible .topbar-actions--collapsible > *',
        [/min-height:\s*2\.75rem/, /width:\s*100%/],
      ),
    ).toBe(true)
    expect(stylesSource).not.toContain('.recovery-page .topbar-menu-trigger')
  })

  it('keeps the overview and skill details bounded and fluid', () => {
    expect(
      hasRule('.recovery-page > [data-testid="smart-recovery-overview"]', [
        /max-width:\s*80rem/,
        /min-width:\s*0/,
        /width:\s*100%/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-recommendation', [
        /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(14rem,\s*20rem\)/,
        /min-width:\s*0/,
        /overflow:\s*hidden/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-recommendation', [
        /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-history-card', [
        /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/,
      ]),
    ).toBe(true)

    expect(
      hasRule('.recovery-page > [data-testid="smart-recovery-skill-details"]', [
        /max-width:\s*var\(--layout-assessment-max\)/,
        /min-width:\s*0/,
        /width:\s*100%/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-skill-hero', [
        /grid-template-columns:\s*minmax\(0,\s*1\.35fr\)\s+minmax\(18rem,\s*0\.65fr\)/,
        /min-width:\s*0/,
        /overflow:\s*hidden/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-details__insight-grid', [
        /grid-template-columns:\s*minmax\(0,\s*1\.08fr\)\s+minmax\(19rem,\s*0\.92fr\)/,
        /min-width:\s*0/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-detail-card .recovery-table-wrap', [
        /max-width:\s*100%/,
        /min-width:\s*0/,
        /overflow-x:\s*auto/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-skill-hero', [
        /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-details__insight-grid', [
        /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-skill-hero__metrics', [
        /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-skill-hero__action .button-link', [
        /min-height:\s*2\.75rem/,
        /width:\s*100%/,
      ]),
    ).toBe(true)
    expect(stylesSource).toContain('@media (max-width: 48rem)')
    expect(stylesSource).not.toContain('.recovery-page { overflow-x: hidden')
  })
})

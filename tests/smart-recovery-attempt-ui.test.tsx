import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { SmartRecoveryCardView } from '../src/react-app/components/SmartRecoveryCard'
import {
  RecoveryHistorySection,
  SmartRecoveryOverview,
} from '../src/react-app/components/SmartRecoveryUi'
import {
  recoveryAttemptResponseSchema,
  recoveryResultResponseSchema,
  type RecoveryAttempt,
  type RecoveryHistory,
  type RecoveryResult,
  type SmartRecoveryDashboard,
} from '../src/react-app/lib/smart-recovery-api'
import {
  SmartRecoveryAttemptPage,
  SmartRecoveryAttemptView,
} from '../src/react-app/pages/SmartRecoveryAttemptPage'
import {
  SmartRecoveryResultPage,
  SmartRecoveryResultView,
} from '../src/react-app/pages/SmartRecoveryResultPage'

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

const dashboard: SmartRecoveryDashboard = {
  taxonomyVersion: 1,
  formulaVersion: 2,
  calculatedAt: '2026-08-06T00:00:00.000Z',
  evidenceWindow: {
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
  },
  evidenceScope: {
    submittedGeneratedAttemptsOnly: true,
    recoveryEvidenceIncluded: true,
    fixedQuestionEvidenceIncluded: false,
    ambiguousGeneratorMappingsIncluded: false,
  },
  state: 'has_priorities',
  eligibleEvidenceCount: 5,
  excludedEvidenceCount: 0,
  skillsWithEvidence: 1,
  prioritySkillCount: 1,
  needsMorePractice: [],
  improving: [],
  strong: [],
  recoveryAvailable: true,
  activeRecoveryAttemptPublicId: null,
  recommendedRecoveryQuestionCount: 8,
  eligibleRecoverySkillCount: 1,
  selectedRecoverySkillCount: 1,
  recoveryUnavailableReason: null,
  recoveryDiagnostics: {
    statusCounts: { not_enough_data: 0, needs_more_practice: 1, improving: 0, strong: 0, neutral: 0 },
    generatableSkillCount: 1,
    selectedSkillCount: 1,
    excludedSkillCount: 0,
    ambiguousEvidenceCount: 0,
    missingCanonicalSkillEvidenceCount: 0,
    missingGeneratorEligibilityCount: 0,
    invalidMappingOrContextEvidenceCount: 0,
  },
  latestRecoveryResult: {
    attemptPublicId: 'recovery-attempt-11111111-1111-4111-8111-111111111111',
    scorePercent: 75,
    correctCount: 6,
    questionCount: 8,
    submittedAt: '2026-08-05T00:00:00.000Z',
  },
}

const history: RecoveryHistory = {
  formulaVersion: 2,
  activeAttemptPublicId: null,
  totalSubmittedAttempts: 1,
  historyLimit: 20,
  attempts: [
    {
      attempt: {
        publicId: 'recovery-attempt-11111111-1111-4111-8111-111111111111',
        formulaVersion: 2,
        startedAt: '2026-08-05T00:00:00.000Z',
        submittedAt: '2026-08-05T00:10:00.000Z',
      },
      scorePercent: 75,
      correctCount: 6,
      questionCount: 8,
      skillsTrained: 1,
      interpretation: {
        code: 'improved',
        title: 'Improved',
        message: 'Your submitted evidence improved.',
      },
      skillProgress: [
        {
          skill: { slug: 'finding-percentage', title: 'Finding Percentage' },
          questions: 8,
          correct: 6,
          accuracyPercent: 75,
          progress: {
            statusBefore: 'needs_more_practice',
            weightedAccuracyBefore: 20,
            evidenceCountBefore: 5,
            statusAfter: 'improving',
            weightedAccuracyAfter: 65,
            evidenceCountAfter: 13,
            percentagePointChange: 45,
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

describe('Smart Recovery Phase D/E UI contracts', () => {
  const attemptFixture: RecoveryAttempt = {
    attempt: {
      publicId: 'recovery-attempt-22222222-2222-4222-8222-222222222222',
      status: 'in_progress',
      questionCount: 2,
      answeredCount: 1,
      startedAt: '2026-08-06T00:00:00.000Z',
    },
    questions: [
      {
        publicId: 'recovery-question-33333333-3333-4333-8333-333333333333',
        position: 1,
        prompt: 'What is 20% of 50?',
        difficulty: 'easy',
        selectedChoicePublicId:
          'recovery-choice-44444444-4444-4444-8444-444444444444',
        skill: { slug: 'finding-percentage', title: 'Finding Percentage' },
        subject: { slug: 'numerical-ability', title: 'Numerical Ability' },
        topic: { slug: 'percentages', title: 'Percentages' },
        choices: [
          {
            publicId: 'recovery-choice-44444444-4444-4444-8444-444444444444',
            text: '10',
            position: 1,
          },
          {
            publicId: 'recovery-choice-55555555-5555-4555-8555-555555555555',
            text: '20',
            position: 2,
          },
        ],
      },
      {
        publicId: 'recovery-question-66666666-6666-4666-8666-666666666666',
        position: 2,
        prompt: 'Convert 0.25 to a percentage.',
        difficulty: 'easy',
        selectedChoicePublicId: null,
        skill: {
          slug: 'converting-percentages',
          title: 'Converting Percentages',
        },
        subject: { slug: 'numerical-ability', title: 'Numerical Ability' },
        topic: { slug: 'percentages', title: 'Percentages' },
        choices: [
          {
            publicId: 'recovery-choice-77777777-7777-4777-8777-777777777777',
            text: '2.5%',
            position: 1,
          },
          {
            publicId: 'recovery-choice-88888888-8888-4888-8888-888888888888',
            text: '25%',
            position: 2,
          },
        ],
      },
    ],
    answeredCount: 1,
    totalCount: 2,
  }

  const attemptViewProps = {
    attempt: attemptFixture,
    reviewing: false,
    saveState: 'saved' as const,
    error: null,
    submitting: false,
    onChoose: vi.fn(),
    onSelectQuestion: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onReview: vi.fn(),
    onSubmit: vi.fn(),
  }

  it('renders a focused one-question recovery workspace with real context and progress', () => {
    const markup = render(
      <SmartRecoveryAttemptView {...attemptViewProps} currentIndex={0} />,
    )

    expect(markup).toContain('data-testid="recovery-attempt-page"')
    expect(markup).toContain('topbar--mobile-collapsible')
    expect(markup).toContain('Finding Percentage')
    expect(markup).toContain('Numerical Ability · Percentages')
    expect(markup).toContain('Targeted Recovery Set')
    expect(markup).toContain('Question 1 of 2')
    expect(markup).toContain('>50%</span>')
    expect(markup).toContain('Recovery progress: question 1 of 2')
    expect(markup).toContain('1 of 2 answered · Saved')
    expect(markup).toContain('aria-label="Question 1, answered"')
    expect(markup).toContain('aria-label="Question 2, unanswered"')
    expect(markup).toContain('aria-current="step"')
    expect(markup).toContain('What is 20% of 50?')
    expect(markup).not.toContain('Convert 0.25 to a percentage.')
    expect(markup).toContain('assessment-choice-label')
    expect(markup).toContain('>A</span>')
    expect(markup).toContain('assessment-choice-selected')
    expect(markup).toContain('✓')
    expect(markup).toContain('>Previous</button>')
    expect(markup).toContain('>Next</button>')
    expect(markup).not.toContain('Submit Recovery Set')
  })

  it('keeps Review & Submit separate from final submission without adding unsupported controls', () => {
    const finalQuestion = render(
      <SmartRecoveryAttemptView {...attemptViewProps} currentIndex={1} />,
    )
    const review = render(
      <SmartRecoveryAttemptView
        {...attemptViewProps}
        currentIndex={1}
        reviewing
      />,
    )

    expect(finalQuestion).toContain('Review &amp; Submit')
    expect(finalQuestion).not.toContain('Submit Recovery Set')
    expect(review).toContain('Review your Recovery Set')
    expect(review).toContain('Answered</dt><dd>1</dd>')
    expect(review).toContain('Unanswered</dt><dd>1</dd>')
    expect(review).toContain('Total</dt><dd>2</dd>')
    expect(review).toContain(
      '1 question is unanswered. Unanswered questions count as zero.',
    )
    expect(review).toContain('navigator above')
    expect(review).toContain('Submission is final.')
    expect(review).toContain('Submit Recovery Set')
    expect(review).toContain('Question 1')
    expect(review).toContain('Question 2')
    expect(review.match(/recovery-question-nav/g)).toHaveLength(1)
    expect(review).not.toContain('role="dialog"')
    expect(review).not.toMatch(/timer|pause|mark for review/i)
  })

  it('keeps prompts natural-case and active recovery progress Action Blue', () => {
    expect(
      hasRule('.smart-recovery-attempt-page .recovery-question-prompt', [
        /overflow-wrap:\s*anywhere/,
        /text-transform:\s*none/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-question-kicker', [
        /text-transform:\s*uppercase/,
      ]),
    ).toBe(true)
    expect(
      hasRule(
        '.smart-recovery-attempt-page .recovery-attempt-progress progress',
        [/accent-color:\s*var\(--action-primary\)/],
      ),
    ).toBe(true)
    for (const selector of [
      '.smart-recovery-attempt-page .recovery-attempt-progress progress::-webkit-progress-value',
      '.smart-recovery-attempt-page .recovery-attempt-progress progress::-moz-progress-bar',
    ]) {
      expect(
        hasRule(selector, [/background:\s*var\(--action-primary\)/]),
      ).toBe(true)
    }
    expect(stylesSource).toMatch(
      /--action-primary:\s*var\(--brand-blue\)/,
    )
    expect(
      hasRule('.assessment-question-nav .quiz-question-nav__item--answered', [
        /background:\s*var\(--color-success-bg\)/,
      ]),
    ).toBe(true)
  })

  it('keeps the attempt bounded, mobile-fluid, and internally scrollable', () => {
    expect(
      hasRule('.smart-recovery-attempt-page', [
        /width:\s*100%/,
        /max-width:\s*70rem/,
        /min-width:\s*0/,
        /margin-inline:\s*auto/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-attempt-context', [
        /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(18rem,\s*24rem\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.smart-recovery-attempt-page .recovery-question-nav', [
        /max-width:\s*100%/,
        /min-width:\s*0/,
        /overflow-x:\s*auto/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-question-fieldset', [
        /min-inline-size:\s*0/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.assessment-attempt-page .quiz-choice', [
        /min-height:\s*3\.25rem/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.assessment-attempt-page .quiz-choice:has(input:checked)', [
        /background:\s*var\(--brand-selection\)/,
        /border-color:\s*var\(--brand-blue\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.assessment-attempt-page .quiz-choice:has(input:focus-visible)', [
        /outline:\s*3px\s+solid\s+var\(--focus-ring\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.assessment-attempt-page .quiz-choice:has(input:disabled)', [
        /background:\s*var\(--color-locked-bg\)/,
        /cursor:\s*not-allowed/,
      ]),
    ).toBe(true)
    const attemptStylesStart = stylesSource.lastIndexOf(
      '/* Smart Recovery attempt polish */',
    )
    expect(attemptStylesStart).toBeGreaterThanOrEqual(0)
    const attemptStyles = stylesSource.slice(attemptStylesStart)
    const mobileStylesStart = attemptStyles.indexOf(
      '@media (max-width: 48rem)',
    )
    const compactStylesStart = attemptStyles.indexOf(
      '@media (max-width: 30rem)',
    )
    expect(mobileStylesStart).toBeGreaterThanOrEqual(0)
    expect(compactStylesStart).toBeGreaterThan(mobileStylesStart)
    const mobileStyles = attemptStyles.slice(
      mobileStylesStart,
      compactStylesStart,
    )
    expect(mobileStyles).toMatch(
      /@media \(max-width: 48rem\)[\s\S]*?\.recovery-attempt-context\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    )
    expect(attemptStyles.slice(compactStylesStart)).toContain(
      '.smart-recovery-attempt-page .recovery-submit-button',
    )
    expect(stylesSource).not.toContain(
      '.smart-recovery-attempt-page { overflow-x: hidden',
    )
  })

  it('renders Start Recovery on the overview and dashboard when available', () => {
    const onStart = vi.fn()
    const overview = render(
      <SmartRecoveryOverview summary={dashboard} onStartRecovery={onStart} />,
    )
    const card = render(
      <SmartRecoveryCardView summary={dashboard} onStartRecovery={onStart} />,
    )
    expect(overview).toContain('Start Recovery Set')
    expect(overview).toContain('Targeted · 8 questions')
    expect(overview).toContain('6 / 8')
    expect(overview).toContain('75%')
    expect(card).toContain('Start Recovery Set')
  })

  it('keeps overview guidance and dashboard copy distinct when no fresh set is available', () => {
    const unavailable: SmartRecoveryDashboard = {
      ...dashboard,
      recoveryAvailable: false,
      recommendedRecoveryQuestionCount: 0,
      selectedRecoverySkillCount: 0,
      recoveryUnavailableReason: 'insufficient_fresh_questions',
    }
    const overview = render(<SmartRecoveryOverview summary={unavailable} />)
    const card = render(<SmartRecoveryCardView summary={unavailable} />)

    for (const surface of [overview, card]) {
      expect(surface).not.toContain('Start Recovery Set')
      expect(surface).not.toContain('Continue Recovery Set')
      expect(surface).toContain('/results')
    }
    expect(overview).toContain('data-testid="smart-recovery-recommendation"')
    expect(overview).toContain('Build a clearer skill signal')
    expect(overview).toContain('at least 5 evidence items')
    expect(overview).toContain('Evidence snapshot')
    expect(overview).toContain('Eligible evidence')
    expect(overview).toContain('data-testid="latest-recovery-result"')

    expect(card).toContain('data-testid="smart-recovery-card"')
    expect(card).toContain('No current weak skill')
    expect(card).toContain('submitted evidence')
    expect(card).toContain('Latest recovery: 6/8 (75%)')
  })
  it('renders submitted recovery history and the latest result summary', () => {
    const markup = render(
      <SmartRecoveryOverview
        summary={dashboard}
        historyState={{
          status: 'loaded',
          data: history,
          error: null,
          reload: vi.fn(),
        }}
      />,
    )
    expect(markup).toContain('Recovery history')
    expect(markup).toContain('Improved')
    expect(markup).toContain('6 / 8')
    expect(markup).toContain('/results')
    expect(render(<SmartRecoveryCardView summary={dashboard} />)).toContain(
      'Latest recovery: 6/8 (75%)',
    )
  })

  it('renders recovery-history loading, empty, and error states accessibly', () => {
    const loading = render(
      <SmartRecoveryOverview
        summary={dashboard}
        historyState={{ status: 'loading', data: null, error: null, reload: vi.fn() }}
      />,
    )
    const empty = render(
      <SmartRecoveryOverview
        summary={dashboard}
        historyState={{
          status: 'loaded',
          data: { ...history, totalSubmittedAttempts: 0, attempts: [] },
          error: null,
          reload: vi.fn(),
        }}
      />,
    )
    const failed = render(
      <SmartRecoveryOverview
        summary={dashboard}
        historyState={{ status: 'error', data: null, error: 'History unavailable.', reload: vi.fn() }}
      />,
    )
    expect(loading).toContain('role="status"')
    expect(loading).toContain('aria-live="polite"')
    expect(loading).toContain('aria-busy="true"')
    expect(loading).toContain('/brand/pasawise-animated-loader.svg')
    expect(loading).toContain('class="sr-only">Loading recovery history')
    expect(empty).toContain('No recovery history yet')
    expect(empty).toContain('Complete a targeted Recovery Set')
    expect(failed).toContain('role="alert"')
    expect(failed).toContain('Try again')
  })

  it('renders recovery history as a chronological, skill-specific result list', () => {
    const latest = history.attempts[0]
    if (latest === undefined) throw new Error('Expected a history fixture.')
    const chronologicalHistory: RecoveryHistory = {
      ...history,
      totalSubmittedAttempts: 2,
      attempts: [
        latest,
        {
          ...latest,
          attempt: {
            ...latest.attempt,
            publicId:
              'recovery-attempt-99999999-9999-4999-8999-999999999999',
            startedAt: '2026-08-04T00:00:00.000Z',
            submittedAt: '2026-08-04T00:10:00.000Z',
          },
          scorePercent: 50,
          correctCount: 4,
          interpretation: {
            code: 'still_needs_practice',
            title: 'Keep Practicing',
            message: 'Continue focused practice.',
          },
          skillProgress: [
            {
              ...latest.skillProgress[0]!,
              skill: {
                slug: 'converting-percentages',
                title: 'Converting Percentages',
              },
            },
          ],
        },
      ],
    }
    const markup = render(
      <RecoveryHistorySection
        state={{
          status: 'loaded',
          data: chronologicalHistory,
          error: null,
          reload: vi.fn(),
        }}
      />,
    )

    expect(markup).toContain('Total Recovery Sets</dt><dd>2</dd>')
    expect(markup).toContain('Latest Result</dt><dd>75%</dd>')
    expect(markup).toContain('Skills Practiced</dt><dd>2</dd>')
    expect(markup).toContain('Score</dt><dd>6 / 8</dd>')
    expect(markup).toContain('Score</dt><dd>4 / 8</dd>')
    expect(markup).toContain('View Result')
    expect(markup.indexOf('Finding Percentage')).toBeLessThan(
      markup.indexOf('Converting Percentages'),
    )
  })

  it('renders Continue Recovery instead of creating a duplicate active attempt', () => {
    const active = {
      ...dashboard,
      activeRecoveryAttemptPublicId:
        'recovery-attempt-22222222-2222-4222-8222-222222222222',
    }
    const overview = render(<SmartRecoveryOverview summary={active} />)
    const card = render(<SmartRecoveryCardView summary={active} />)
    expect(overview).toContain('Continue Recovery Set')
    expect(card).toContain('Continue Recovery Set')
    expect(overview).toContain(
      'href="/smart-recovery/attempts/recovery-attempt-22222222-2222-4222-8222-222222222222"',
    )
    expect(overview).not.toContain('Start Recovery Set')
  })

  it('validates a safe resumable attempt and rejects pre-submit answer keys', () => {
    const safe = {
      success: true,
      data: {
        attempt: {
          publicId:
            'recovery-attempt-22222222-2222-4222-8222-222222222222',
          status: 'in_progress',
          questionCount: 1,
          answeredCount: 0,
          startedAt: '2026-08-06T00:00:00.000Z',
        },
        questions: [
          {
            publicId:
              'recovery-question-33333333-3333-4333-8333-333333333333',
            position: 1,
            prompt: 'What is 20% of 50?',
            difficulty: 'easy',
            selectedChoicePublicId: null,
            skill: { slug: 'finding-percentage', title: 'Finding Percentage' },
            subject: { slug: 'numerical-ability', title: 'Numerical Ability' },
            topic: { slug: 'percentages', title: 'Percentages' },
            choices: [
              {
                publicId:
                  'recovery-choice-44444444-4444-4444-8444-444444444444',
                text: '10',
                position: 1,
              },
            ],
          },
        ],
        answeredCount: 0,
        totalCount: 1,
      },
    } as const
    expect(recoveryAttemptResponseSchema.safeParse(safe).success).toBe(true)
    expect(
      recoveryAttemptResponseSchema.safeParse({
        ...safe,
        data: {
          ...safe.data,
          questions: [{ ...safe.data.questions[0], correctChoicePublicId: 'hidden' }],
        },
      }).success,
    ).toBe(false)
  })

  it('validates post-submit review and related-lesson result data', () => {
    const parsed = recoveryResultResponseSchema.safeParse({
      success: true,
      data: {
        formulaVersion: 2,
        attempt: {
          publicId:
            'recovery-attempt-22222222-2222-4222-8222-222222222222',
          status: 'submitted',
          formulaVersion: 2,
          startedAt: '2026-08-06T00:00:00.000Z',
          submittedAt: '2026-08-06T00:10:00.000Z',
        },
        interpretation: {
          code: 'improved',
          title: 'Improved',
          message: 'Your evidence improved.',
        },
        scorePercent: 100,
        correctCount: 1,
        questionCount: 1,
        skillsTrained: 1,
        strongestRecoverySkill: 'Finding Percentage',
        stillNeedsPractice: [],
        skillBreakdown: [
          {
            skill: { slug: 'finding-percentage', title: 'Finding Percentage' },
            questions: 1,
            correct: 1,
            accuracyPercent: 100,
            statusBefore: 'needs_more_practice',
            weightedAccuracyBefore: 0,
            evidenceCountBefore: 5,
            statusAfter: 'improving',
            weightedAccuracyAfter: 62.5,
            evidenceCountAfter: 6,
            percentagePointChange: 62.5,
            trend: 'improved',
            currentStatus: 'needs_more_practice',
            relatedLesson: {
              publicId: 'lesson-public-id',
              slug: 'finding-percentage',
              title: 'Finding Percentage',
              courseSlug: 'cse-professional',
            },
          },
        ],
        questions: [
          {
            publicId:
              'recovery-question-33333333-3333-4333-8333-333333333333',
            position: 1,
            prompt: 'What is 20% of 50?',
            skillTitle: 'Finding Percentage',
            selectedChoice: { publicId: 'choice', text: '10' },
            correctChoice: { publicId: 'choice', text: '10' },
            isCorrect: true,
            explanation: 'Twenty percent of fifty is ten.',
            mistakePattern: null,
            choices: [{ publicId: 'choice', text: '10', position: 1 }],
          },
        ],
      },
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) throw new Error('Expected a valid recovery result fixture.')
    expect(
      recoveryResultResponseSchema.safeParse({
        success: true,
        data: {
          ...parsed.data.data,
          formulaVersion: 1,
          attempt: { ...parsed.data.data.attempt, formulaVersion: 1 },
        },
      }).success,
    ).toBe(true)
  })

  it('presents a real recovery result, skill signals, and explicit answer states', () => {
    const resultFixture: RecoveryResult = {
      formulaVersion: 2,
      attempt: {
        publicId: 'recovery-attempt-result',
        status: 'submitted',
        formulaVersion: 2,
        startedAt: '2026-08-06T00:00:00.000Z',
        submittedAt: '2026-08-06T00:10:00.000Z',
      },
      interpretation: {
        code: 'still_needs_practice',
        title: 'More practice recommended',
        message: 'This submitted set shows where focused review can help.',
      },
      scorePercent: 33.33,
      correctCount: 1,
      questionCount: 3,
      skillsTrained: 1,
      strongestRecoverySkill: 'Finding Percentage',
      stillNeedsPractice: ['Finding Percentage'],
      skillBreakdown: [
        {
          skill: { slug: 'finding-percentage', title: 'Finding Percentage' },
          questions: 3,
          correct: 1,
          accuracyPercent: 33.33,
          statusBefore: 'needs_more_practice',
          weightedAccuracyBefore: 20,
          evidenceCountBefore: 5,
          statusAfter: 'needs_more_practice',
          weightedAccuracyAfter: 35,
          evidenceCountAfter: 8,
          percentagePointChange: 15,
          trend: 'improved',
          currentStatus: 'needs_more_practice',
          relatedLesson: {
            publicId: 'lesson-finding-percentage',
            slug: 'finding-percentage',
            title: 'Finding Percentage',
            courseSlug: 'cse-professional',
          },
        },
      ],
      questions: [
        {
          publicId: 'recovery-question-correct',
          position: 1,
          prompt: 'What is 20% of 50?',
          skillTitle: 'Finding Percentage',
          selectedChoice: { publicId: 'choice-10', text: '10' },
          correctChoice: { publicId: 'choice-10', text: '10' },
          isCorrect: true,
          explanation: 'Twenty percent of fifty is ten.',
          mistakePattern: null,
          choices: [],
        },
        {
          publicId: 'recovery-question-incorrect',
          position: 2,
          prompt: 'What is 25% of 80?',
          skillTitle: 'Finding Percentage',
          selectedChoice: { publicId: 'choice-incorrect', text: '25' },
          correctChoice: { publicId: 'choice-20', text: '20' },
          isCorrect: false,
          explanation: 'One fourth of eighty is twenty.',
          mistakePattern: 'calculation_error',
          choices: [],
        },
        {
          publicId: 'recovery-question-unanswered',
          position: 3,
          prompt: 'What is 10% of 90?',
          skillTitle: 'Finding Percentage',
          selectedChoice: null,
          correctChoice: { publicId: 'choice-9', text: '9' },
          isCorrect: false,
          explanation: 'Ten percent is one tenth, so the answer is nine.',
          mistakePattern: null,
          choices: [],
        },
      ],
    }
    const markup = render(<SmartRecoveryResultView result={resultFixture} />)

    expect(markup).toContain('data-testid="recovery-result-page"')
    expect(markup).toContain('topbar--mobile-collapsible')
    expect(markup).toContain('Finding Percentage')
    expect(markup).toContain('1 / 3')
    expect(markup).toContain('33.33%')
    expect(markup).toContain('More practice recommended')
    expect(markup).toContain('Correct</dt><dd>1</dd>')
    expect(markup).toContain('Incorrect</dt><dd>1</dd>')
    expect(markup).toContain('Unanswered</dt><dd>1</dd>')
    expect(markup).toContain('Total</dt><dd>3</dd>')
    expect(markup).toContain('What this result means')
    expect(markup).toContain('not a promise of mastery')
    expect(markup).toContain('eligible evidence accumulates')
    expect(markup).toContain('Before</dt>')
    expect(markup).toContain('After</dt>')
    expect(markup).toContain('Current signal</dt>')
    expect(markup).toContain('recovery-answer-status--correct')
    expect(markup).toContain('recovery-answer-status--incorrect')
    expect(markup).toContain('recovery-answer-status--unanswered')
    expect(markup).toContain('Your answer')
    expect(markup).toContain('Correct answer')
    expect(markup).toContain('Explanation')
    expect(markup).toContain('Calculation Error')
    expect(markup).toContain(
      'href="/smart-recovery/skills/finding-percentage"',
    )
    expect(markup).toContain('href="#recovery-answer-review"')
    expect(markup).toContain('href="/smart-recovery#recovery-history"')
    expect(markup).not.toMatch(/\bMastered\b|Skill fixed/i)
  })

  it('keeps review, result, and history responsive without page overflow hacks', () => {
    expect(
      hasRule('.smart-recovery-result-page', [
        /width:\s*100%/,
        /max-width:\s*76rem/,
        /min-width:\s*0/,
        /margin-inline:\s*auto/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.smart-recovery-result-page > .recovery-result-hero', [
        /max-width:\s*72rem/,
        /min-width:\s*0/,
        /margin-inline:\s*auto/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-result-hero', [
        /grid-template-columns:\s*minmax\(0,\s*1\.1fr\)\s+minmax\(19rem,\s*0\.9fr\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-answer-card--correct', [
        /border-inline-start-color:\s*var\(--color-success\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-answer-card--incorrect', [
        /border-inline-start-color:\s*var\(--color-danger\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-answer-card--unanswered', [
        /border-inline-start-color:\s*var\(--achievement\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.recovery-history-card', [
        /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/,
      ]),
    ).toBe(true)
    const flowStylesStart = stylesSource.lastIndexOf(
      '/* Smart Recovery review, result, and history polish */',
    )
    expect(flowStylesStart).toBeGreaterThanOrEqual(0)
    const flowStyles = stylesSource.slice(flowStylesStart)
    expect(flowStyles).toMatch(
      /@media \(max-width: 48rem\)[\s\S]*?\.recovery-result-hero,[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    )
    expect(flowStyles).toMatch(
      /@media \(max-width: 30rem\)[\s\S]*?\.recovery-result-metrics,[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    )
    for (const selector of [
      '.recovery-page',
      '.smart-recovery-attempt-page',
      '.smart-recovery-result-page',
    ]) {
      expect(hasRule(selector, [])).toBe(true)
      expect(hasRule(selector, [/overflow-x:\s*hidden/])).toBe(false)
    }
  })

  it('renders accessible loading states at the attempt and result routes', () => {
    const attempt = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[
          '/smart-recovery/attempts/recovery-attempt-22222222-2222-4222-8222-222222222222',
        ]}
      >
        <Routes>
          <Route
            path="smart-recovery/attempts/:attemptPublicId"
            element={<SmartRecoveryAttemptPage />}
          />
        </Routes>
      </MemoryRouter>,
    )
    const result = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[
          '/smart-recovery/attempts/recovery-attempt-22222222-2222-4222-8222-222222222222/results',
        ]}
      >
        <Routes>
          <Route
            path="smart-recovery/attempts/:attemptPublicId/results"
            element={<SmartRecoveryResultPage />}
          />
        </Routes>
      </MemoryRouter>,
    )
    for (const loadingMarkup of [attempt, result]) {
      expect(loadingMarkup).toContain('role="status"')
      expect(loadingMarkup).toContain('aria-live="polite"')
      expect(loadingMarkup).toContain('aria-busy="true"')
      expect(loadingMarkup).toContain(
        'src="/brand/pasawise-animated-loader.svg"',
      )
    }
    expect(attempt).toContain(
      'class="sr-only">Restoring your Recovery Set',
    )
    expect(result).toContain(
      'class="sr-only">Checking your Recovery Set results',
    )
  })
})

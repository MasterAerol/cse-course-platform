import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { SmartRecoveryCardView } from '../src/react-app/components/SmartRecoveryCard'
import { SmartRecoveryOverview } from '../src/react-app/components/SmartRecoveryUi'
import {
  recoveryAttemptResponseSchema,
  recoveryResultResponseSchema,
  type SmartRecoveryDashboard,
} from '../src/react-app/lib/smart-recovery-api'
import { SmartRecoveryAttemptPage } from '../src/react-app/pages/SmartRecoveryAttemptPage'
import { SmartRecoveryResultPage } from '../src/react-app/pages/SmartRecoveryResultPage'

const dashboard: SmartRecoveryDashboard = {
  taxonomyVersion: 1,
  formulaVersion: 1,
  calculatedAt: '2026-08-06T00:00:00.000Z',
  evidenceWindow: {
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
  },
  evidenceScope: {
    submittedGeneratedAttemptsOnly: true,
    fixedQuestionEvidenceIncluded: false,
    ambiguousGeneratorMappingsIncluded: false,
  },
  state: 'has_priorities',
  eligibleEvidenceCount: 5,
  excludedEvidenceCount: 0,
  skillsWithEvidence: 1,
  needsMorePractice: [],
  improving: [],
  strong: [],
  recoveryAvailable: true,
  activeRecoveryAttemptPublicId: null,
  recommendedRecoveryQuestionCount: 8,
  eligibleRecoverySkillCount: 1,
  recoveryUnavailableReason: null,
  latestRecoveryResult: {
    attemptPublicId: 'recovery-attempt-11111111-1111-4111-8111-111111111111',
    scorePercent: 75,
    correctCount: 6,
    questionCount: 8,
    submittedAt: '2026-08-05T00:00:00.000Z',
  },
}

function render(node: React.ReactNode): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
}

describe('Smart Recovery Phase D UI contracts', () => {
  it('renders Start Recovery on the overview and dashboard when available', () => {
    const onStart = vi.fn()
    const overview = render(
      <SmartRecoveryOverview summary={dashboard} onStartRecovery={onStart} />,
    )
    const card = render(
      <SmartRecoveryCardView summary={dashboard} onStartRecovery={onStart} />,
    )
    expect(overview).toContain('Start Recovery Set')
    expect(overview).toContain('8 questions across 1 priority skill')
    expect(overview).toContain('Latest result: 6/8 (75%)')
    expect(card).toContain('Start Recovery Set')
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
        attempt: {
          publicId:
            'recovery-attempt-22222222-2222-4222-8222-222222222222',
          status: 'submitted',
          startedAt: '2026-08-06T00:00:00.000Z',
          submittedAt: '2026-08-06T00:10:00.000Z',
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
    expect(attempt).toContain('aria-busy="true"')
    expect(attempt).toContain('aria-live="polite"')
    expect(result).toContain('aria-busy="true"')
    expect(result).toContain('Loading recovery results')
  })
})

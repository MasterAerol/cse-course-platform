import { describe, expect, it } from 'vitest'

import { subjectAssessmentResultSchema } from '../src/shared/subject-assessment-result.schema'
import {
  getSubjectAssessmentResultUrl,
  getSubjectAssessmentSubmitError,
} from '../src/react-app/lib/subject-assessment-submit'

const successResponse = {
  assessment: {
    title: 'Numerical Ability Subject Assessment',
    slug: 'numerical-ability-subject-assessment',
    passingScore: 70,
    passingTarget: 35,
  },
  attempt: {
    publicId: 'subject-attempt-test',
    attemptNumber: 1,
    status: 'submitted',
    startedAt: '2026-08-02 10:00:00',
    submittedAt: '2026-08-02 10:20:00',
  },
  totalPoints: 50,
  earnedPoints: 35,
  scorePercent: 70,
  passed: true,
  feedback: 'Passed',
  breakdown: {
    topics: [{
      topicSlug: 'percentages',
      topicTitle: 'Percentages',
      totalQuestions: 5,
      correctCount: 4,
      incorrectCount: 1,
      unansweredCount: 0,
      percentage: 80,
      status: 'Strong',
    }],
    strongestTopic: {
      topicSlug: 'percentages', topicTitle: 'Percentages', totalQuestions: 5,
      correctCount: 4, incorrectCount: 1, unansweredCount: 0,
      percentage: 80, status: 'Strong',
    },
    weakestTopic: {
      topicSlug: 'percentages', topicTitle: 'Percentages', totalQuestions: 5,
      correctCount: 4, incorrectCount: 1, unansweredCount: 0,
      percentage: 80, status: 'Strong',
    },
    correctCount: 35,
    incorrectCount: 15,
    unansweredCount: 0,
  },
  resultUrl: '/assessment-attempts/subject-attempt-test/results',
} as const

describe('subject assessment submit response', () => {
  it('accepts the Worker success shape and navigates to its result URL', () => {
    const parsed = subjectAssessmentResultSchema.parse(successResponse)
    expect(getSubjectAssessmentResultUrl(parsed)).toBe(
      '/assessment-attempts/subject-attempt-test/results',
    )
  })

  it('rejects the obsolete frontend breakdown field names', () => {
    const malformed = {
      ...successResponse,
      breakdown: {
        ...successResponse.breakdown,
        topics: [{ topicSlug: 'percentages', topicTitle: 'Percentages', correct: 4, total: 5, percentage: 80, category: 'Strong' }],
      },
    }
    expect(subjectAssessmentResultSchema.safeParse(malformed).success).toBe(false)
  })

  it('preserves a structured API error message for rendering', () => {
    expect(
      getSubjectAssessmentSubmitError(
        new Error('This assessment attempt belongs to another learner.'),
      ),
    ).toBe('This assessment attempt belongs to another learner.')
  })
})

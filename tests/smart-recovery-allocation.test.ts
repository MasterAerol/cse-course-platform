import { describe, expect, it } from 'vitest'

import {
  RECOVERY_MAXIMUM_QUESTIONS_PER_SKILL,
  allocateRecoveryQuestions,
  generateRecoveryQuestions,
  getRecoveryGeneratorEligibility,
  recommendedRecoveryQuestionCount,
  type RecentRecoveryIdentity,
} from '../src/worker/domain/smart-recovery-attempt'
import type { SkillWeaknessSummary } from '../src/worker/domain/smart-recovery-weakness'

const slugs = [
  'finding-percentage',
  'finding-base',
  'finding-rate',
  'equivalent-fractions',
  'simplifying-fractions',
] as const

function weakness(
  slug: (typeof slugs)[number],
  accuracyPercent: number,
  evidenceCount = 10,
): SkillWeaknessSummary {
  return {
    skill: {
      slug,
      title: slug,
      description: null,
      taxonomyVersion: 1,
      subjectSlug: 'numerical-ability',
      subjectTitle: 'Numerical Ability',
      topicSlug: 'percentages',
      topicTitle: 'Percentages',
      relatedLessonSlug: null,
      relatedLessonTitle: null,
    },
    status: 'needs_more_practice',
    trend: 'stable',
    evidenceCount,
    answeredCount: evidenceCount,
    correctCount: Math.floor((evidenceCount * accuracyPercent) / 100),
    incorrectCount:
      evidenceCount - Math.floor((evidenceCount * accuracyPercent) / 100),
    unansweredCount: 0,
    accuracyPercent,
    recentAccuracyPercent: accuracyPercent,
    previousAccuracyPercent: accuracyPercent,
    lastPracticedAt: '2026-08-01T00:00:00.000Z',
    mistakePatterns: [],
  }
}

describe('Smart Recovery allocation', () => {
  it.each([
    [5, [6, 5, 4, 3, 2], 20],
    [4, [7, 5, 4, 4], 20],
    [3, [8, 7, 5], 20],
    [2, [8, 8], 16],
    [1, [8], 8],
    [0, [], 0],
  ] as const)(
    'allocates the approved plan for %i eligible skills',
    (skillCount, expectedCounts, expectedTotal) => {
      const input = slugs
        .slice(0, skillCount)
        .map((slug, index) => weakness(slug, 20 + index * 5))
      const allocation = allocateRecoveryQuestions(input)
      expect(allocation.map((item) => item.questionCount)).toEqual(
        expectedCounts,
      )
      expect(
        allocation.reduce((total, item) => total + item.questionCount, 0),
      ).toBe(expectedTotal)
      expect(
        allocation.every(
          (item) =>
            item.questionCount <= RECOVERY_MAXIMUM_QUESTIONS_PER_SKILL,
        ),
      ).toBe(true)
      expect(recommendedRecoveryQuestionCount(skillCount)).toBe(expectedTotal)
    },
  )

  it('uses weakness priority and skill slug as a stable tie-breaker', () => {
    const input = [
      weakness('finding-rate', 30),
      weakness('finding-base', 30),
      weakness('finding-percentage', 10),
    ]
    expect(
      allocateRecoveryQuestions(input).map((item) => item.skill.skill.slug),
    ).toEqual(['finding-percentage', 'finding-base', 'finding-rate'])
  })

  it('excludes broad mixed generators from recovery eligibility', () => {
    expect(getRecoveryGeneratorEligibility('mixed-number-series')).toEqual([])
    expect(getRecoveryGeneratorEligibility('finding-percentage')).toHaveLength(1)
  })
})

describe('Smart Recovery deterministic generation', () => {
  const allocation = allocateRecoveryQuestions([
    weakness('finding-percentage', 25),
  ])

  it('reproduces the same set for the same attempt seed', () => {
    const first = generateRecoveryQuestions({
      attemptSeed: 'attempt-seed-a',
      allocations: allocation,
    })
    const second = generateRecoveryQuestions({
      attemptSeed: 'attempt-seed-a',
      allocations: allocation,
    })
    expect(second.map((item) => item.question.seed)).toEqual(
      first.map((item) => item.question.seed),
    )
    expect(second.map((item) => item.question.prompt)).toEqual(
      first.map((item) => item.question.prompt),
    )
  })

  it('uses fresh seeds for a different attempt seed', () => {
    const first = generateRecoveryQuestions({
      attemptSeed: 'attempt-seed-a',
      allocations: allocation,
    })
    const second = generateRecoveryQuestions({
      attemptSeed: 'attempt-seed-b',
      allocations: allocation,
    })
    expect(second.map((item) => item.question.seed)).not.toEqual(
      first.map((item) => item.question.seed),
    )
  })

  it('avoids recent seeds, prompts, and canonical signatures', () => {
    const first = generateRecoveryQuestions({
      attemptSeed: 'attempt-seed-recent',
      allocations: allocation,
    })
    const recent: RecentRecoveryIdentity[] = first.map(({ question }) => ({
      generatorSlug: question.generatorSlug,
      generatorVersion: question.generatorVersion,
      generatorSeed: question.seed,
      canonicalSignature: question.metadata.canonicalSignature,
      normalizedPrompt: question.prompt.trim().toLowerCase(),
    }))
    const replacement = generateRecoveryQuestions({
      attemptSeed: 'attempt-seed-recent',
      allocations: allocation,
      recentIdentities: recent,
    })
    const recentSeeds = new Set(recent.map((item) => item.generatorSeed))
    expect(
      replacement.every((item) => !recentSeeds.has(item.question.seed)),
    ).toBe(true)
  })

  it('produces complete validated questions with exactly one correct choice', () => {
    const questions = generateRecoveryQuestions({
      attemptSeed: 'attempt-seed-complete',
      allocations: allocation,
    })
    expect(questions).toHaveLength(8)
    for (const item of questions) {
      expect(item.question.prompt.trim()).not.toBe('')
      expect(item.question.choices).toHaveLength(4)
      expect(
        item.question.choices.filter((choice) => choice.isCorrect),
      ).toHaveLength(1)
      expect(item.question.metadata.canonicalSignature.trim()).not.toBe('')
    }
  })

  it('fails safely when the bounded generation budget is exhausted', () => {
    expect(() =>
      generateRecoveryQuestions({
        attemptSeed: 'attempt-seed-fail',
        allocations: allocation,
        maximumRetries: 0,
      }),
    ).toThrow('Unable to generate a fresh recovery question')
  })
})

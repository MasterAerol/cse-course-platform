import { describe, expect, it } from 'vitest'

import { evaluateRecoveryEligibility } from '../src/worker/domain/smart-recovery-eligibility'
import {
  generatorSkillMappings,
  skillDefinitions,
} from '../src/worker/domain/smart-recovery-skills'
import type {
  SkillWeaknessSummary,
  WeaknessStatus,
} from '../src/worker/domain/smart-recovery-weakness'

const selectedPrioritySlugs = [
  'finding-percentage',
  'finding-base',
  'finding-rate',
  'equivalent-fractions',
  'simplifying-fractions',
] as const

function summary(
  slug: string,
  status: WeaknessStatus,
  accuracyPercent: number,
  index: number,
): SkillWeaknessSummary {
  const skill = skillDefinitions.find((item) => item.slug === slug)
  if (skill === undefined) throw new Error('Missing skill fixture: ' + slug)
  return {
    skill: {
      slug,
      title: skill.title,
      description: skill.description ?? null,
      taxonomyVersion: skill.taxonomyVersion,
      subjectSlug: skill.subjectSlug,
      subjectTitle: skill.subjectSlug,
      topicSlug: skill.topicSlug,
      topicTitle: skill.topicSlug,
      relatedLessonSlug: skill.relatedLessonSlug ?? null,
      relatedLessonTitle: null,
    },
    status,
    trend: 'stable',
    evidenceCount: 10,
    answeredCount: 10,
    correctCount: Math.floor(accuracyPercent / 10),
    incorrectCount: 10 - Math.floor(accuracyPercent / 10),
    unansweredCount: 0,
    accuracyPercent,
    recentAccuracyPercent: accuracyPercent,
    previousAccuracyPercent: accuracyPercent,
    lastPracticedAt: new Date(Date.UTC(2026, 7, 1, 0, 0, index)).toISOString(),
    mistakePatterns: [],
  }
}

function productionScaleObservedSkills(): SkillWeaknessSummary[] {
  const directSlugs = generatorSkillMappings
    .filter((mapping) => mapping.mappingKind === 'direct')
    .map((mapping) => mapping.skillSlug)
  const weakSlugs = [
    ...selectedPrioritySlugs,
    ...directSlugs.filter(
      (slug) => !selectedPrioritySlugs.includes(
        slug as (typeof selectedPrioritySlugs)[number],
      ),
    ),
  ].slice(0, 201)
  const remainingSlugs = skillDefinitions
    .map((skill) => skill.slug)
    .filter((slug) => !weakSlugs.includes(slug))
    .slice(0, 59)
  if (weakSlugs.length !== 201 || remainingSlugs.length !== 59) {
    throw new Error('The production-scale eligibility fixture is incomplete.')
  }
  return [
    ...weakSlugs.map((slug, index) =>
      summary(slug, 'needs_more_practice', index < 5 ? 10 + index : 40, index),
    ),
    ...remainingSlugs.slice(0, 20).map((slug, index) =>
      summary(slug, 'not_enough_data', 50, 201 + index),
    ),
    ...remainingSlugs.slice(20, 40).map((slug, index) =>
      summary(slug, 'improving', 70, 221 + index),
    ),
    ...remainingSlugs.slice(40).map((slug, index) =>
      summary(slug, 'strong', 90, 241 + index),
    ),
  ]
}

describe('shared Smart Recovery eligibility', () => {
  it('turns 201 eligible weaknesses into one 20-question set for only the top five', () => {
    const result = evaluateRecoveryEligibility({
      observedSkills: productionScaleObservedSkills(),
      hasEnoughEvidence: true,
      attemptSeed: 'production-scale-summary',
    })

    expect(result.recoveryAvailable).toBe(true)
    expect(result.unavailableReason).toBeNull()
    expect(result.eligibleSkills).toHaveLength(201)
    expect(result.selectedSkills).toHaveLength(5)
    expect(result.generatedQuestions).toHaveLength(20)
    expect(result.recommendedQuestionCount).toBe(20)
    expect(result.questionPlan).toMatchObject({
      plannedQuestionCount: 20,
      feasibleQuestionCount: 20,
      available: true,
      unavailableReason: null,
    })
    expect(result.questionPlan?.diagnostics.map((item) => item.requestedQuestionCount)).toEqual([6, 5, 4, 3, 2])
    expect(result.diagnostics).toMatchObject({
      statusCounts: {
        not_enough_data: 20,
        needs_more_practice: 201,
        improving: 20,
        strong: 19,
        neutral: 0,
      },
      generatableSkillCount: 201,
      selectedSkillCount: 5,
      excludedSkillCount: 0,
      ambiguousEvidenceCount: 0,
      missingCanonicalSkillEvidenceCount: 0,
      missingGeneratorEligibilityCount: 0,
    })
  })

  it('reports exhausted generation as insufficient fresh questions', () => {
    const result = evaluateRecoveryEligibility({
      observedSkills: [
        summary('finding-percentage', 'needs_more_practice', 20, 0),
      ],
      hasEnoughEvidence: true,
      attemptSeed: 'freshness-exhausted',
      maximumGenerationRetries: 0,
    })

    expect(result.recoveryAvailable).toBe(false)
    expect(result.unavailableReason).toBe('insufficient_fresh_questions')
    expect(result.recommendedQuestionCount).toBe(8)
    expect(result.selectedSkills).toHaveLength(1)
    expect(result.questionPlan).toMatchObject({
      plannedQuestionCount: 8,
      feasibleQuestionCount: 0,
      available: false,
      unavailableReason: 'insufficient_fresh_questions',
    })
    expect(result.questionPlan?.diagnostics[0]).toMatchObject({
      requestedQuestionCount: 8,
      candidateAttemptsMade: 0,
      finalFeasibleCount: 0,
      blockingReason: 'insufficient_retry_budget',
    })
  })
})
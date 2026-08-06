import { describe, expect, it } from 'vitest'

import type { RecentRecoveryIdentity } from '../src/worker/domain/smart-recovery-attempt'

import {
  evaluateRecoveryAvailability,
  evaluateRecoveryEligibility,
} from '../src/worker/domain/smart-recovery-eligibility'
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
  it('uses metadata-only availability for the production-scale summary', () => {
    const startedAt = performance.now()
    const result = evaluateRecoveryAvailability({
      observedSkills: productionScaleObservedSkills(),
      hasEnoughEvidence: true,
    })
    const durationMs = performance.now() - startedAt

    expect(result.recoveryAvailable).toBe(true)
    expect(result.eligibleSkills).toHaveLength(201)
    expect(result.selectedSkills).toHaveLength(5)
    expect(result.recommendedQuestionCount).toBe(20)
    expect('generatedQuestions' in result).toBe(false)
    expect('questionPlan' in result).toBe(false)
    expect(durationMs).toBeLessThan(100)
  })
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

  it('rotates a poor second recovery set away from the immediately trained five', () => {
    const observedSkills = productionScaleObservedSkills()
    const first = evaluateRecoveryEligibility({
      observedSkills,
      hasEnoughEvidence: true,
      attemptSeed: 'rotation-first',
    })
    const recentlyTrainedSkillSlugs = first.selectedSkills.map(
      (allocation) => allocation.skill.skill.slug,
    )
    const recentIdentities: RecentRecoveryIdentity[] = first.generatedQuestions.map(
      ({ question }) => ({
        generatorSlug: question.generatorSlug,
        generatorVersion: question.generatorVersion,
        generatorSeed: question.seed,
        canonicalSignature: question.metadata.canonicalSignature,
        normalizedPrompt: question.prompt.trim().toLowerCase(),
      }),
    )

    const summary = evaluateRecoveryAvailability({
      observedSkills,
      hasEnoughEvidence: true,
      recentlyTrainedSkillSlugs,
    })
    const second = evaluateRecoveryEligibility({
      observedSkills,
      hasEnoughEvidence: true,
      attemptSeed: 'rotation-second',
      recentlyTrainedSkillSlugs,
      recentIdentities,
    })

    expect(summary.recoveryAvailable).toBe(true)
    expect(summary.selectedSkills).toHaveLength(5)
    expect(summary.diagnostics).toMatchObject({
      recentlyTrainedSkillCount: 5,
      rotationCandidateSkillCount: 196,
    })
    expect(second.recoveryAvailable).toBe(true)
    expect(second.selectedSkills).toHaveLength(5)
    expect(second.generatedQuestions).toHaveLength(20)
    expect(
      second.selectedSkills.every(
        (allocation) =>
          !recentlyTrainedSkillSlugs.includes(allocation.skill.skill.slug),
      ),
    ).toBe(true)
    const firstSignatures = new Set(
      first.generatedQuestions.map(
        ({ question }) => question.metadata.canonicalSignature,
      ),
    )
    expect(
      second.generatedQuestions.every(
        ({ question }) => !firstSignatures.has(question.metadata.canonicalSignature),
      ),
    ).toBe(true)
  })

  it('searches beyond freshness-blocked top-five candidates', () => {
    const observedSkills = productionScaleObservedSkills()
    const initial = evaluateRecoveryEligibility({
      observedSkills,
      hasEnoughEvidence: true,
      attemptSeed: 'blocked-candidate-search',
      maximumGenerationRetries: 1,
    })
    const recentIdentities: RecentRecoveryIdentity[] = initial.generatedQuestions.map(
      ({ question }) => ({
        generatorSlug: question.generatorSlug,
        generatorVersion: question.generatorVersion,
        generatorSeed: question.seed,
        canonicalSignature: question.metadata.canonicalSignature,
        normalizedPrompt: question.prompt.trim().toLowerCase(),
      }),
    )
    const blocked = new Set(
      initial.selectedSkills.map((allocation) => allocation.skill.skill.slug),
    )

    const rotated = evaluateRecoveryEligibility({
      observedSkills,
      hasEnoughEvidence: true,
      attemptSeed: 'blocked-candidate-search',
      recentIdentities,
      maximumGenerationRetries: 1,
    })

    expect(rotated.recoveryAvailable).toBe(true)
    expect(rotated.selectedSkills).toHaveLength(5)
    expect(rotated.generatedQuestions).toHaveLength(20)
    expect(
      rotated.selectedSkills.every(
        (allocation) => !blocked.has(allocation.skill.skill.slug),
      ),
    ).toBe(true)
    expect(
      rotated.questionPlan?.diagnostics.filter(
        (diagnostic) => diagnostic.blockingReason !== null,
      ).length,
    ).toBeGreaterThanOrEqual(5)
  })

  it('marks an exhausted immediately trained single skill unavailable', () => {
    const onlySkill = [
      summary('finding-percentage', 'needs_more_practice', 10, 0),
    ]
    const result = evaluateRecoveryAvailability({
      observedSkills: onlySkill,
      hasEnoughEvidence: true,
      recentlyTrainedSkillSlugs: ['finding-percentage'],
    })

    expect(result.recoveryAvailable).toBe(false)
    expect(result.unavailableReason).toBe('insufficient_fresh_questions')
    expect(result.selectedSkills).toHaveLength(0)
    expect(result.recommendedQuestionCount).toBe(0)
  })

  it('skips two recently trained skills and selects three fresh skills', () => {
    const observedSkills = selectedPrioritySlugs.map((slug, index) =>
      summary(slug, 'needs_more_practice', 10 + index, index),
    )
    const result = evaluateRecoveryAvailability({
      observedSkills,
      hasEnoughEvidence: true,
      recentlyTrainedSkillSlugs: selectedPrioritySlugs.slice(0, 2),
    })

    expect(result.recoveryAvailable).toBe(true)
    expect(result.selectedSkills.map((item) => item.skill.skill.slug)).toEqual(
      [...selectedPrioritySlugs.slice(2)],
    )
    expect(result.recommendedQuestionCount).toBe(20)
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
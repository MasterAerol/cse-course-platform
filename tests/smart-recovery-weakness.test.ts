import { describe, expect, it } from 'vitest'

import {
  SMART_RECOVERY_EVIDENCE_WINDOW,
  calculateEvidenceSourceBreakdown,
  calculateSkillWeakness,
  normalizeGeneratedEvidence,
  type GeneratedEvidenceRecord,
  type NormalizedSkillEvidence,
  type SkillCatalogEntry,
} from '../src/worker/domain/smart-recovery-weakness'
import { ambiguousGeneratorMappings } from '../src/worker/domain/smart-recovery-skills'

const calculatedAt = new Date('2026-08-06T00:00:00.000Z')
const skill: SkillCatalogEntry = {
  slug: 'finding-percentage',
  title: 'Finding Percentage',
  description: 'Questions that exercise Finding Percentage.',
  taxonomyVersion: 1,
  subjectSlug: 'numerical-ability',
  subjectTitle: 'Numerical Ability',
  topicSlug: 'percentages',
  topicTitle: 'Percentages',
  relatedLessonSlug: null,
  relatedLessonTitle: null,
}

function normalized(
  index: number,
  correct: boolean,
  options: Partial<NormalizedSkillEvidence> = {},
): NormalizedSkillEvidence {
  return {
    userId: 1,
    skillSlug: skill.slug,
    sourceType: 'generated_practice',
    attemptPublicId: `attempt-${Math.floor(index / 5)}`,
    attemptSubmittedAt: new Date(
      calculatedAt.getTime() - index * 24 * 60 * 60 * 1000,
    ).toISOString(),
    snapshotPublicId: `snapshot-${index}`,
    generatorSlug: skill.slug,
    generatorVersion: 1,
    generatorSeed: `seed-${index}`,
    wasAnswered: true,
    wasCorrect: correct,
    distractorType: correct ? null : 'wrong-base',
    subjectSlug: skill.subjectSlug,
    topicSlug: skill.topicSlug,
    ...options,
  }
}

function record(
  generatorSlug: string,
  generatorVersion = 1,
): GeneratedEvidenceRecord {
  return {
    userId: 1,
    sourceType: 'generated_practice',
    attemptPublicId: 'attempt-1',
    attemptSubmittedAt: '2026-08-05T00:00:00.000Z',
    snapshotPublicId: `snapshot-${generatorSlug}`,
    generatorSlug,
    generatorVersion,
    generatorSeed: 'seed-1',
    selectedAnswer: 'Wrong',
    correctAnswer: 'Correct',
    isCorrect: 0,
    selectedDistractorType: 'wrong-base',
    subjectSlug: skill.subjectSlug,
    topicSlug: skill.topicSlug,
  }
}

describe('Smart Recovery formula v1', () => {
  it('does not label a learner weak from one mistake', () => {
    const result = calculateSkillWeakness(
      skill,
      [normalized(0, false)],
      calculatedAt,
    )
    expect(result).toMatchObject({
      status: 'not_enough_data',
      evidenceCount: 1,
      accuracyPercent: 0,
    })
  })

  it('labels repeated submitted mistakes as needs more practice', () => {
    const evidence = Array.from({ length: 5 }, (_, index) =>
      normalized(index, false),
    )
    const result = calculateSkillWeakness(skill, evidence, calculatedAt)
    expect(result).toMatchObject({
      status: 'needs_more_practice',
      evidenceCount: 5,
      answeredCount: 5,
      correctCount: 0,
      accuracyPercent: 0,
    })
    expect(result.mistakePatterns[0]).toEqual({
      distractorType: 'wrong-base',
      count: 5,
      percentOfClassifiedMistakes: 100,
    })
  })

  it('detects recent improvement over older evidence deterministically', () => {
    const evidence = [
      ...Array.from({ length: 5 }, (_, index) => normalized(index, true)),
      ...Array.from({ length: 5 }, (_, index) =>
        normalized(index + 5, false),
      ),
    ]
    const result = calculateSkillWeakness(skill, evidence, calculatedAt)
    expect(result).toMatchObject({
      status: 'improving',
      trend: 'improving',
      recentAccuracyPercent: 100,
      previousAccuracyPercent: 0,
      accuracyPercent: 60,
    })
  })

  it('reports unanswered submitted snapshots separately and scores them as zero', () => {
    const evidence = Array.from({ length: 5 }, (_, index) =>
      normalized(index, false, {
        wasAnswered: false,
        distractorType: null,
      }),
    )
    const result = calculateSkillWeakness(skill, evidence, calculatedAt)
    expect(result).toMatchObject({
      status: 'needs_more_practice',
      answeredCount: 0,
      incorrectCount: 0,
      unansweredCount: 5,
      accuracyPercent: 0,
    })
    expect(result.mistakePatterns).toEqual([])
  })

  it('excludes old evidence and duplicate snapshot identities from the window', () => {
    const duplicate = normalized(0, false)
    const old = normalized(200, false)
    const result = calculateSkillWeakness(
      skill,
      [duplicate, duplicate, old],
      calculatedAt,
    )
    expect(result.evidenceCount).toBe(1)
  })

  it('uses source weights and returns a complete source breakdown', () => {
    const evidence = [
      normalized(0, true, { sourceType: 'generated_practice' }),
      normalized(1, false, { sourceType: 'subject_assessment' }),
      normalized(2, false, { sourceType: 'mock_exam' }),
      normalized(3, true, { sourceType: 'generated_practice' }),
      normalized(4, true, { sourceType: 'subject_assessment' }),
    ]
    const result = calculateSkillWeakness(skill, evidence, calculatedAt)
    expect(result.accuracyPercent).toBe(54.2)
    expect(calculateEvidenceSourceBreakdown(skill.slug, evidence, calculatedAt))
      .toEqual([
        expect.objectContaining({ sourceType: 'generated_practice', evidenceCount: 2 }),
        expect.objectContaining({ sourceType: 'subject_assessment', evidenceCount: 2 }),
        expect.objectContaining({ sourceType: 'mock_exam', evidenceCount: 1 }),
      ])
  })

  it('normalizes only direct mappings with matching canonical context', () => {
    const catalog = new Map([[skill.slug, skill]])
    const direct = normalizeGeneratedEvidence([record(skill.slug)], catalog)
    expect(direct).toMatchObject({ excludedCount: 0 })
    expect(direct.evidence[0]).toMatchObject({
      skillSlug: skill.slug,
      wasAnswered: true,
      wasCorrect: false,
      distractorType: 'wrong-base',
    })

    const broad = ambiguousGeneratorMappings[0]
    expect(broad).toBeDefined()
    if (broad === undefined) throw new Error('Expected a broad mapping fixture.')
    const broadSkill = { ...skill, slug: broad.skillSlug }
    const excluded = normalizeGeneratedEvidence(
      [record(broad.generatorSlug, broad.generatorVersion)],
      new Map([[broad.skillSlug, broadSkill]]),
    )
    expect(excluded).toEqual({ evidence: [], excludedCount: 1 })

    const mismatched = normalizeGeneratedEvidence(
      [record(skill.slug)],
      new Map([[skill.slug, { ...skill, topicSlug: 'different-topic' }]]),
    )
    expect(mismatched).toEqual({ evidence: [], excludedCount: 1 })
  })

  it('keeps the approved evidence window constants explicit', () => {
    expect(SMART_RECOVERY_EVIDENCE_WINDOW).toMatchObject({
      lookbackDays: 180,
      maximumItemsPerSkill: 20,
      minimumEvidenceItems: 5,
      recentItemCount: 5,
      recentWeightMultiplier: 1.5,
      needsMorePracticeBelowPercent: 60,
      strongAtOrAbovePercent: 80,
    })
  })
})

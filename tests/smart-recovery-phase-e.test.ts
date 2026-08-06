import { describe, expect, it } from 'vitest'

import {
  buildRecoveryAttemptProgress,
} from '../src/worker/domain/smart-recovery-history'
import {
  calculateRecoverySkillProgress,
  interpretRecoveryResult,
} from '../src/worker/domain/smart-recovery-progress'
import {
  SMART_RECOVERY_EVIDENCE_WINDOW,
  SMART_RECOVERY_FORMULA_VERSION,
  calculateSkillWeakness,
  normalizeGeneratedEvidence,
  type GeneratedEvidenceRecord,
  type NormalizedSkillEvidence,
  type SkillCatalogEntry,
} from '../src/worker/domain/smart-recovery-weakness'

const skill: SkillCatalogEntry = {
  slug: 'finding-percentage',
  title: 'Finding Percentage',
  description: null,
  taxonomyVersion: 1,
  subjectSlug: 'numerical-ability',
  subjectTitle: 'Numerical Ability',
  topicSlug: 'percentages',
  topicTitle: 'Percentages',
  relatedLessonSlug: null,
  relatedLessonTitle: null,
}

function evidence(
  snapshot: string,
  submittedAt: string,
  correct: boolean,
  options: Partial<NormalizedSkillEvidence> = {},
): NormalizedSkillEvidence {
  return {
    userId: 1,
    skillSlug: skill.slug,
    sourceType: 'generated_practice',
    attemptPublicId: 'practice-attempt',
    attemptSubmittedAt: submittedAt,
    snapshotPublicId: snapshot,
    generatorSlug: 'finding-percentage',
    generatorVersion: 1,
    generatorSeed: `seed-${snapshot}`,
    wasAnswered: true,
    wasCorrect: correct,
    distractorType: correct ? null : 'wrong-base',
    subjectSlug: skill.subjectSlug,
    topicSlug: skill.topicSlug,
    relatedLessonSlug: null,
    ...options,
  }
}

describe('Smart Recovery Phase E formula v2', () => {
  it('makes the approved source weights and latest-50 window explicit', () => {
    expect(SMART_RECOVERY_FORMULA_VERSION).toBe(2)
    expect(SMART_RECOVERY_EVIDENCE_WINDOW).toMatchObject({
      maximumItemsPerSkill: 50,
      sourceWeights: {
        generated_practice: 0.75,
        subject_assessment: 1.25,
        mock_exam: 1.25,
        recovery: 1.25,
      },
    })
  })

  it('normalizes recovery from its immutable snapshot skill and context', () => {
    const record: GeneratedEvidenceRecord = {
      userId: 1,
      sourceType: 'recovery',
      attemptPublicId: 'recovery-attempt',
      attemptSubmittedAt: '2026-08-06T01:00:00.000Z',
      snapshotPublicId: 'recovery-snapshot',
      skillSlug: skill.slug,
      generatorSlug: 'finding-percentage',
      generatorVersion: 1,
      generatorSeed: 'recovery-seed',
      selectedAnswer: 'Wrong',
      correctAnswer: 'Correct',
      isCorrect: 0,
      selectedDistractorType: 'wrong-base',
      subjectSlug: skill.subjectSlug,
      topicSlug: skill.topicSlug,
      relatedLessonSlug: null,
    }
    const normalized = normalizeGeneratedEvidence(
      [record],
      new Map([[skill.slug, skill]]),
    )
    expect(normalized).toMatchObject({
      excludedCount: 0,
      evidence: [
        {
          sourceType: 'recovery',
          skillSlug: 'finding-percentage',
          wasAnswered: true,
          wasCorrect: false,
        },
      ],
    })
  })

  it('uses recovery weight 1.25 and deduplicates an immutable snapshot', () => {
    const calculatedAt = new Date('2026-08-06T02:00:00.000Z')
    const items = [
      evidence('practice-correct', '2026-08-06T01:00:00.000Z', true),
      evidence('recovery-wrong', '2026-08-06T01:01:00.000Z', false, {
        sourceType: 'recovery',
        attemptPublicId: 'recovery-attempt',
      }),
    ]
    const result = calculateSkillWeakness(
      skill,
      [...items, items[1]],
      calculatedAt,
    )
    expect(result).toMatchObject({ evidenceCount: 2, accuracyPercent: 37.5 })
  })

  it('calculates strict before and inclusive after status at submission', () => {
    const recoveryAttempt = 'recovery-attempt'
    const submittedAt = '2026-08-06T01:00:00.000Z'
    const items = [
      ...Array.from({ length: 5 }, (_, index) =>
        evidence(
          `before-${index}`,
          `2026-08-0${index + 1}T00:00:00.000Z`,
          false,
        ),
      ),
      ...Array.from({ length: 8 }, (_, index) =>
        evidence(`recovery-${index}`, submittedAt, true, {
          sourceType: 'recovery',
          attemptPublicId: recoveryAttempt,
        }),
      ),
    ]
    const progress = calculateRecoverySkillProgress(
      skill,
      items,
      recoveryAttempt,
      submittedAt,
    )
    expect(progress).toMatchObject({
      statusBefore: 'needs_more_practice',
      weightedAccuracyBefore: 0,
      evidenceCountBefore: 5,
      statusAfter: 'improving',
      evidenceCountAfter: 13,
      trend: 'improved',
    })
    expect(progress.weightedAccuracyAfter).toBeGreaterThan(60)
  })

  it('caps the combined source window at 50 distinct evidence items', () => {
    const calculatedAt = new Date('2026-08-06T02:00:00.000Z')
    const items = Array.from({ length: 60 }, (_, index) =>
      evidence(
        `snapshot-${index}`,
        new Date(calculatedAt.getTime() - index * 60_000).toISOString(),
        true,
        { sourceType: index % 2 === 0 ? 'recovery' : 'mock_exam' },
      ),
    )
    expect(calculateSkillWeakness(skill, items, calculatedAt).evidenceCount).toBe(
      50,
    )
  })

  it('builds deterministic learner-safe result interpretations', () => {
    const progress = calculateRecoverySkillProgress(
      skill,
      Array.from({ length: 5 }, (_, index) =>
        evidence(`weak-${index}`, `2026-08-0${index + 1}T00:00:00.000Z`, false),
      ),
      'missing-recovery-attempt',
      '2026-08-06T01:00:00.000Z',
    )
    expect(interpretRecoveryResult(40, [progress]).code).toBe(
      'still_needs_practice',
    )
    expect(interpretRecoveryResult(90, [{ ...progress, statusAfter: 'not_enough_data' }]).code)
      .toBe('strong_recovery_result')
  })

  it('builds a stable history/result progress summary from shared evidence', () => {
    const submittedAt = '2026-08-06T01:00:00.000Z'
    const prior = Array.from({ length: 5 }, (_, index) =>
      evidence(`prior-${index}`, `2026-08-0${index + 1}T00:00:00.000Z`, false),
    )
    const recovery = Array.from({ length: 8 }, (_, index) =>
      evidence(`result-${index}`, submittedAt, true, {
        sourceType: 'recovery',
        attemptPublicId: 'recovery-result',
      }),
    )
    const summary = buildRecoveryAttemptProgress(
      {
        attemptPublicId: 'recovery-result',
        attemptFormulaVersion: 2,
        startedAt: '2026-08-06T00:30:00.000Z',
        submittedAt,
        scorePercent: 100,
        correctCount: 8,
        questionCount: 8,
        skills: [{ skill, questions: 8, correct: 8 }],
      },
      [...prior, ...recovery],
    )
    expect(summary).toMatchObject({
      interpretation: { code: 'improved' },
      skillProgress: [
        {
          progress: {
            evidenceCountBefore: 5,
            evidenceCountAfter: 13,
            trend: 'improved',
          },
        },
      ],
    })
  })
})

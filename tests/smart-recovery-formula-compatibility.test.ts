import { describe, expect, it } from 'vitest'

import { buildRecoveryAttemptProgress } from '../src/worker/domain/smart-recovery-history'
import {
  SMART_RECOVERY_FORMULA_VERSION,
  getWeaknessFormulaDefinition,
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
  snapshotPublicId: string,
  attemptSubmittedAt: string,
  wasCorrect: boolean,
  sourceType: NormalizedSkillEvidence['sourceType'] = 'generated_practice',
  attemptPublicId = 'practice-attempt',
): NormalizedSkillEvidence {
  return {
    userId: 1,
    skillSlug: skill.slug,
    sourceType,
    attemptPublicId,
    attemptSubmittedAt,
    snapshotPublicId,
    generatorSlug: 'finding-percentage',
    generatorVersion: 1,
    generatorSeed: `seed-${snapshotPublicId}`,
    wasAnswered: true,
    wasCorrect,
    distractorType: wasCorrect ? null : 'wrong-base',
    subjectSlug: skill.subjectSlug,
    topicSlug: skill.topicSlug,
    relatedLessonSlug: null,
  }
}

describe('Smart Recovery formula compatibility', () => {
  it('keeps v2 current while retaining the exact implemented v1 contract', () => {
    expect(SMART_RECOVERY_FORMULA_VERSION).toBe(2)
    expect(getWeaknessFormulaDefinition(1)).toMatchObject({
      version: 1,
      supportedSources: [
        'generated_practice',
        'subject_assessment',
        'mock_exam',
      ],
      evidenceWindow: {
        maximumItemsPerSkill: 20,
        sourceWeights: {
          generated_practice: 1,
          subject_assessment: 1.25,
          mock_exam: 1.5,
        },
      },
    })
    expect(getWeaknessFormulaDefinition(2)).toMatchObject({
      version: 2,
      supportedSources: [
        'generated_practice',
        'subject_assessment',
        'mock_exam',
        'recovery',
      ],
      evidenceWindow: {
        maximumItemsPerSkill: 50,
        sourceWeights: {
          generated_practice: 0.75,
          subject_assessment: 1.25,
          mock_exam: 1.25,
          recovery: 1.25,
        },
      },
    })
  })

  it('calculates historical progress with the attempt recorded formula', () => {
    const submittedAt = '2026-08-06T01:00:00.000Z'
    const prior = Array.from({ length: 5 }, (_, index) =>
      evidence(
        `prior-${index}`,
        `2026-08-0${index + 1}T00:00:00.000Z`,
        false,
      ),
    )
    const recovery = Array.from({ length: 8 }, (_, index) =>
      evidence(
        `recovery-${index}`,
        submittedAt,
        true,
        'recovery',
        'recovery-attempt',
      ),
    )
    const input = {
      attemptPublicId: 'recovery-attempt',
      startedAt: '2026-08-06T00:30:00.000Z',
      submittedAt,
      scorePercent: 100,
      correctCount: 8,
      questionCount: 8,
      skills: [{ skill, questions: 8, correct: 8 }],
    }

    const v1 = buildRecoveryAttemptProgress(
      { ...input, attemptFormulaVersion: 1 },
      [...prior, ...recovery],
    )
    const v2 = buildRecoveryAttemptProgress(
      { ...input, attemptFormulaVersion: 2 },
      [...prior, ...recovery],
    )

    expect(v1).toMatchObject({
      attempt: { formulaVersion: 1 },
      interpretation: { code: 'still_needs_practice' },
      skillProgress: [{
        progress: {
          evidenceCountBefore: 5,
          evidenceCountAfter: 5,
          weightedAccuracyBefore: 0,
          weightedAccuracyAfter: 0,
        },
      }],
    })
    expect(v2).toMatchObject({
      attempt: { formulaVersion: 2 },
      interpretation: { code: 'improved' },
      skillProgress: [{
        progress: {
          evidenceCountBefore: 5,
          evidenceCountAfter: 13,
        },
      }],
    })
  })

  it('fails closed for an unsupported historical formula version', () => {
    expect(() =>
      buildRecoveryAttemptProgress(
        {
          attemptPublicId: 'future-attempt',
          attemptFormulaVersion: 99,
          startedAt: '2026-08-06T00:30:00.000Z',
          submittedAt: '2026-08-06T01:00:00.000Z',
          scorePercent: 0,
          correctCount: 0,
          questionCount: 1,
          skills: [{ skill, questions: 1, correct: 0 }],
        },
        [],
      ),
    ).toThrow('Unsupported Smart Recovery formula version: 99.')
  })

})

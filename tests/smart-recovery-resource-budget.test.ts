import { describe, expect, it } from 'vitest'

import {
  analyzeLearnerRecoveryEvidence,
  type NormalizedSkillEvidence,
  type SkillCatalogEntry,
} from '../src/worker/domain/smart-recovery-weakness'
import { buildRecoveryAttemptProgress } from '../src/worker/domain/smart-recovery-history'

const NOW = new Date('2026-08-06T12:00:00.000Z')
const SKILL_COUNT = 290
const OBSERVED_SKILL_COUNT = 260
const EVIDENCE_COUNT = 1_631
const NEEDS_PRACTICE_COUNT = 201

function skill(index: number): SkillCatalogEntry {
  return {
    slug: `scale-skill-${index}`,
    title: `Scale Skill ${index}`,
    description: null,
    taxonomyVersion: 1,
    subjectSlug: 'numerical-ability',
    subjectTitle: 'Numerical Ability',
    topicSlug: 'scale-topic',
    topicTitle: 'Scale Topic',
    relatedLessonSlug: 'scale-lesson',
    relatedLessonTitle: 'Scale Lesson',
  }
}

function evidenceItem(input: {
  index: number
  skillIndex: number
  itemIndex: number
  sourceType?: NormalizedSkillEvidence['sourceType']
  attemptPublicId?: string
  submittedAt?: string
  correct: boolean
}): NormalizedSkillEvidence {
  return {
    userId: 1,
    skillSlug: `scale-skill-${input.skillIndex}`,
    sourceType: input.sourceType ?? 'generated_practice',
    attemptPublicId: input.attemptPublicId ?? `generated-attempt-${input.index}`,
    attemptSubmittedAt:
      input.submittedAt ??
      new Date(NOW.getTime() - (input.index + 30) * 60_000).toISOString(),
    snapshotPublicId: `scale-snapshot-${input.index}`,
    generatorSlug: `scale-skill-${input.skillIndex}`,
    generatorVersion: 1,
    generatorSeed: String(input.index),
    wasAnswered: true,
    wasCorrect: input.correct,
    distractorType: input.correct ? null : 'scale_mistake',
    subjectSlug: 'numerical-ability',
    topicSlug: 'scale-topic',
    relatedLessonSlug: 'scale-lesson',
  }
}

function productionScaleFixture(): {
  skills: SkillCatalogEntry[]
  evidence: NormalizedSkillEvidence[]
} {
  const skills = Array.from({ length: SKILL_COUNT }, (_, index) => skill(index))
  const evidence: NormalizedSkillEvidence[] = []
  let evidenceIndex = 0
  for (let skillIndex = 0; skillIndex < OBSERVED_SKILL_COUNT; skillIndex += 1) {
    const itemCount = skillIndex < 51 ? 7 : 6
    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
      const correct =
        skillIndex < NEEDS_PRACTICE_COUNT
          ? false
          : skillIndex < 231
            ? itemIndex < 4
            : true
      evidence.push(evidenceItem({
        index: evidenceIndex,
        skillIndex,
        itemIndex,
        correct,
      }))
      evidenceIndex += 1
    }
  }
  for (let index = 0; index < 20; index += 1) {
    evidence.push(evidenceItem({
      index: evidenceIndex,
      skillIndex: index % 5,
      itemIndex: index,
      sourceType: 'recovery',
      attemptPublicId: 'production-scale-recovery',
      submittedAt: NOW.toISOString(),
      correct: false,
    }))
    evidenceIndex += 1
  }
  return { skills, evidence }
}

describe('Smart Recovery production-scale resource budget', () => {
  it('analyzes 290 skills and 1,631 evidence items in one bounded pass', () => {
    const fixture = productionScaleFixture()
    expect(fixture.evidence).toHaveLength(EVIDENCE_COUNT)

    const startedAt = performance.now()
    const analysis = analyzeLearnerRecoveryEvidence(
      fixture.skills,
      fixture.evidence,
      NOW,
    )
    const durationMs = performance.now() - startedAt

    expect(analysis.metrics).toEqual({
      inputEvidenceCount: EVIDENCE_COUNT,
      boundedEvidenceCount: EVIDENCE_COUNT,
      skillsProcessed: SKILL_COUNT,
      formulaEvaluationCount: SKILL_COUNT,
    })
    expect(analysis.summaries.filter((item) => item.evidenceCount > 0)).toHaveLength(
      OBSERVED_SKILL_COUNT,
    )
    expect(analysis.statusCounts.needs_more_practice).toBe(NEEDS_PRACTICE_COUNT)
    expect(Math.max(...Array.from(analysis.evidenceBySkill.values(), (items) => items.length))).toBeLessThanOrEqual(50)
    const boundedOverview = {
      statusCounts: analysis.statusCounts,
      needsMorePractice: analysis.summaries
        .filter((item) => item.status === 'needs_more_practice')
        .slice(0, 3),
      improving: analysis.summaries
        .filter((item) => item.status === 'improving')
        .slice(0, 3),
      strong: analysis.summaries
        .filter((item) => item.status === 'strong')
        .slice(0, 3),
    }
    expect(new TextEncoder().encode(JSON.stringify(boundedOverview)).byteLength).toBeLessThan(32_768)
    expect(durationMs).toBeLessThan(500)  })

  it('calculates submitted recovery history from five grouped skill arrays', () => {
    const fixture = productionScaleFixture()
    const analysis = analyzeLearnerRecoveryEvidence(
      fixture.skills,
      fixture.evidence,
      NOW,
    )
    const startedAt = performance.now()
    const history = buildRecoveryAttemptProgress(
      {
        attemptPublicId: 'production-scale-recovery',
        attemptFormulaVersion: 2,
        startedAt: new Date(NOW.getTime() - 10 * 60_000).toISOString(),
        submittedAt: NOW.toISOString(),
        scorePercent: 0,
        correctCount: 0,
        questionCount: 20,
        skills: fixture.skills.slice(0, 5).map((entry) => ({
          skill: entry,
          questions: 4,
          correct: 0,
        })),
      },
      analysis.evidenceBySkill,
    )
    const durationMs = performance.now() - startedAt

    expect(history.skillsTrained).toBe(5)
    expect(history.questionCount).toBe(20)
    expect(history.skillProgress).toHaveLength(5)
    expect(durationMs).toBeLessThan(100)
  })
})
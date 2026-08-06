import { describe, expect, it } from 'vitest'

import {
  calculateSkillWeakness,
  type NormalizedSkillEvidence,
  type SkillCatalogEntry,
} from '../src/worker/domain/smart-recovery-weakness'

const now = new Date('2026-08-06T00:00:00.000Z')
const skill: SkillCatalogEntry = {
  slug: 'finding-rate',
  title: 'Finding Rate',
  description: null,
  taxonomyVersion: 1,
  subjectSlug: 'numerical-ability',
  subjectTitle: 'Numerical Ability',
  topicSlug: 'percentages',
  topicTitle: 'Percentages',
  relatedLessonSlug: null,
  relatedLessonTitle: null,
}

function item(index: number, wasCorrect: boolean): NormalizedSkillEvidence {
  return {
    userId: 1,
    skillSlug: skill.slug,
    sourceType: 'generated_practice',
    attemptPublicId: `attempt-${index}`,
    attemptSubmittedAt: new Date(now.getTime() - index * 86_400_000).toISOString(),
    snapshotPublicId: `snapshot-${index}`,
    generatorSlug: skill.slug,
    generatorVersion: 1,
    generatorSeed: `seed-${index}`,
    wasAnswered: true,
    wasCorrect,
    distractorType: wasCorrect ? null : 'divide-instead-of-multiply',
    subjectSlug: skill.subjectSlug,
    topicSlug: skill.topicSlug,
  }
}

describe('Smart Recovery learner statuses', () => {
  it('marks sufficient consistently correct evidence as strong', () => {
    const result = calculateSkillWeakness(
      skill,
      Array.from({ length: 5 }, (_, index) => item(index, true)),
      now,
    )
    expect(result).toMatchObject({
      status: 'strong',
      accuracyPercent: 100,
      correctCount: 5,
    })
  })

  it('detects declining recent performance and does not report it as strong', () => {
    const evidence = [
      ...Array.from({ length: 5 }, (_, index) => item(index, false)),
      ...Array.from({ length: 5 }, (_, index) => item(index + 5, true)),
    ]
    const result = calculateSkillWeakness(skill, evidence, now)
    expect(result).toMatchObject({
      status: 'needs_more_practice',
      trend: 'declining',
      recentAccuracyPercent: 0,
      previousAccuracyPercent: 100,
      accuracyPercent: 40,
    })
  })

  it('caps one skill at the latest 20 unique evidence items', () => {
    const evidence = Array.from({ length: 25 }, (_, index) =>
      item(index, index >= 20),
    )
    const result = calculateSkillWeakness(skill, evidence, now)
    expect(result.evidenceCount).toBe(20)
    expect(result.correctCount).toBe(0)
  })
})

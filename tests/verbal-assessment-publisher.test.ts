import { describe, expect, it } from 'vitest'

import { adminSubjectAssessmentInputSchema } from '../src/worker/schemas/subject-assessment.schemas'
import { generatorPools, requiredTopics, verbalAbilityBlueprintV1 } from '../scripts/verbal-ability-assessment-blueprint.mjs'
import { baseInput, confirmation, passwordEnvironmentName } from '../scripts/verbal-ability-assessment-publisher-config.mjs'

describe('Verbal Ability assessment publisher', () => {
  it('builds the exact draft/published admin payload accepted by the shared schema', () => {
    const input = {
      title: 'Verbal Ability Subject Assessment', slug: 'verbal-ability-subject-assessment',
      description: 'A comprehensive mixed assessment covering all completed Verbal Ability topics.',
      position: 11, passingScore: 70, questionCount: 50, maximumAttempts: null,
      timeLimitMinutes: null, showExplanations: true, status: 'draft' as const,
      blueprint: verbalAbilityBlueprintV1,
    }
    expect(adminSubjectAssessmentInputSchema.safeParse(input).success).toBe(true)
    expect(requiredTopics).toHaveLength(10)
    expect(generatorPools).toHaveLength(10)
    expect(generatorPools.every((pool) => pool.length === 9)).toBe(true)
  })

  it('exposes the guarded publisher identity without embedding a credential', () => {
    expect(confirmation).toBe('create-validate-publish-verbal-ability-assessment')
    expect(passwordEnvironmentName).toBe('CSE_VERBAL_ASSESSMENT_ADMIN_PASSWORD')
    expect(baseInput).toMatchObject({ slug: 'verbal-ability-subject-assessment', position: 11, questionCount: 50, passingScore: 70, maximumAttempts: null, timeLimitMinutes: null, showExplanations: true })
    expect(baseInput).not.toHaveProperty('password')
  })
})
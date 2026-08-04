import { verbalAbilityBlueprintV1 as blueprint } from './verbal-ability-assessment-blueprint.mjs'

export const confirmation = 'create-validate-publish-verbal-ability-assessment'
export const passwordEnvironmentName = 'CSE_VERBAL_ASSESSMENT_ADMIN_PASSWORD'
export const assessmentSlug = 'verbal-ability-subject-assessment'
export const baseInput = {
  title: 'Verbal Ability Subject Assessment',
  slug: assessmentSlug,
  description: 'A comprehensive mixed assessment covering all completed Verbal Ability topics.',
  position: 11,
  passingScore: 70,
  questionCount: 50,
  maximumAttempts: null,
  timeLimitMinutes: null,
  showExplanations: true,
  blueprint,
}
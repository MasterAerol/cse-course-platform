import type { verbalAbilityBlueprintV1 } from './verbal-ability-assessment-blueprint.mjs'
export const confirmation: 'create-validate-publish-verbal-ability-assessment'
export const passwordEnvironmentName: 'CSE_VERBAL_ASSESSMENT_ADMIN_PASSWORD'
export const assessmentSlug: 'verbal-ability-subject-assessment'
export const baseInput: {
  title: string; slug: typeof assessmentSlug; description: string; position: number
  passingScore: number; questionCount: number; maximumAttempts: null
  timeLimitMinutes: null; showExplanations: boolean; blueprint: typeof verbalAbilityBlueprintV1
}
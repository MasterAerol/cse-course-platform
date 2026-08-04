import { generalInformationBlueprintV1 as blueprint } from './general-information-assessment-blueprint.mjs'

export const confirmation = 'create-validate-publish-general-information-assessment'
export const passwordEnvironmentName = 'CSE_GENERAL_INFORMATION_ASSESSMENT_ADMIN_PASSWORD'
export const assessmentSlug = 'general-information-subject-assessment'
export const shouldRestorePublishedStatus = (status) => status === 'published'
export const baseInput = {
  title: 'General Information Subject Assessment',
  slug: assessmentSlug,
  description: 'A comprehensive mixed assessment covering the completed General Information topics.',
  position: 5,
  passingScore: 70,
  questionCount: 40,
  maximumAttempts: null,
  timeLimitMinutes: null,
  showExplanations: true,
  blueprint,
}

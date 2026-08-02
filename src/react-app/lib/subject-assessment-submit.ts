import type { SubjectAssessmentResult } from '../../shared/subject-assessment-result.schema'

export function getSubjectAssessmentResultUrl(
  result: SubjectAssessmentResult,
): string {
  return result.resultUrl
}

export function getSubjectAssessmentSubmitError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Assessment could not be submitted.'
}

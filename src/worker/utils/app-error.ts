import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ValidationField =
  | 'accessExpiresAt'
  | 'courseSlug'
  | 'accessDurationDays'
  | 'blockId'
  | 'blockType'
  | 'choices'
  | 'content'
  | 'courseId'
  | 'description'
  | 'difficulty'
  | 'entityType'
  | 'estimatedMinutes'
  | 'firstName'
  | 'generatorSlug'
  | 'generatorVersion'
  | 'instructions'
  | 'isPreview'
  | 'lastName'
  | 'email'
  | 'lessonId'
  | 'attemptPublicId'
  | 'maximumAttempts'
  | 'passingScore'
  | 'points'
  | 'position'
  | 'questionId'
  | 'quizId'
  | 'practiceQuestionId'
  | 'practiceSetId'
  | 'lessonPublicId'
  | 'password'
  | 'questionCount'
  | 'requiresPrevious'
  | 'selectedChoiceId'
  | 'shortDescription'
  | 'slug'
  | 'status'
  | 'subjectId'
  | 'summary'
  | 'thumbnailKey'
  | 'timeLimitMinutes'
  | 'title'
  | 'topicId'
  | 'updatedAt'

export type ValidationFieldErrors = Partial<
  Record<ValidationField, string[]>
>

export interface ValidationErrorDetails {
  fieldErrors: ValidationFieldErrors
}

export type ApiErrorDetails = ValidationErrorDetails | null

export class AppError extends Error {
  readonly code: string
  readonly status: ContentfulStatusCode
  readonly details: ApiErrorDetails

  constructor(
    status: ContentfulStatusCode,
    code: string,
    message: string,
    details: ApiErrorDetails = null,
  ) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
  }
}

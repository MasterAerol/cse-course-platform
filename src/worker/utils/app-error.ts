import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ValidationField =
  | 'accessExpiresAt'
  | 'courseSlug'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'password'

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

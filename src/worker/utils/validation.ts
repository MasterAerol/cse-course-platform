import type { Context } from 'hono'
import type { ZodError, ZodType } from 'zod'

import type { AppEnv } from '../types/app'
import {
  AppError,
  type ValidationField,
  type ValidationFieldErrors,
} from './app-error'

const validationFields = new Set<ValidationField>([
  'accessExpiresAt',
  'courseSlug',
  'firstName',
  'lastName',
  'email',
  'password',
])

function isValidationField(value: unknown): value is ValidationField {
  return typeof value === 'string' && validationFields.has(value as ValidationField)
}

function collectFieldErrors(error: ZodError): ValidationFieldErrors {
  const fieldErrors: ValidationFieldErrors = {}

  for (const issue of error.issues) {
    const field = issue.path[0]

    if (!isValidationField(field)) {
      continue
    }

    const messages = fieldErrors[field] ?? []

    if (!messages.includes(issue.message)) {
      messages.push(issue.message)
    }

    fieldErrors[field] = messages
  }

  return fieldErrors
}

export async function parseJsonBody<T>(
  context: Context<AppEnv>,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown

  try {
    body = await context.req.json<unknown>()
  } catch {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'The request body must be valid JSON.',
    )
  }

  const result = schema.safeParse(body)

  return parseValidationResult(result)
}

export function parseValidatedInput<T>(
  result: ReturnType<ZodType<T>['safeParse']>,
): T {
  return parseValidationResult(result)
}

function parseValidationResult<T>(
  result: ReturnType<ZodType<T>['safeParse']>,
): T {
  if (!result.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'The request contains invalid fields.',
      {
        fieldErrors: collectFieldErrors(result.error),
      },
    )
  }

  return result.data
}

import type { Context } from 'hono'
import type { ZodError, ZodType } from 'zod'

import type { AppEnv } from '../types/app'
import {
  AppError,
  type ValidationField,
  type ValidationFieldErrors,
} from './app-error'

export const MAXIMUM_JSON_BODY_BYTES = 256 * 1024

function requestBodyTooLarge(): AppError {
  return new AppError(
    413,
    'REQUEST_BODY_TOO_LARGE',
    'The request body is too large.',
  )
}

async function readBoundedJsonBody(request: Request): Promise<string> {
  const contentLength = request.headers.get('content-length')

  if (contentLength !== null) {
    const declaredBytes = Number(contentLength)

    if (Number.isFinite(declaredBytes) && declaredBytes > MAXIMUM_JSON_BODY_BYTES) {
      throw requestBodyTooLarge()
    }
  }

  if (request.body === null) {
    return ''
  }

  const bodyStream = request.body as ReadableStream<Uint8Array>
  const reader = bodyStream.getReader()
  const decoder = new TextDecoder()
  const chunks: string[] = []
  let receivedBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        chunks.push(decoder.decode())
        return chunks.join('')
      }

      receivedBytes += value.byteLength
      if (receivedBytes > MAXIMUM_JSON_BODY_BYTES) {
        await reader.cancel().catch(() => undefined)
        throw requestBodyTooLarge()
      }
      chunks.push(decoder.decode(value, { stream: true }))
    }
  } finally {
    reader.releaseLock()
  }
}

const validationFields = new Set<ValidationField>([
  'accessExpiresAt',
  'accessDurationDays',
  'blockId',
  'blockType',
  'choices',
  'content',
  'courseId',
  'courseSlug',
  'description',
  'difficulty',
  'entityType',
  'estimatedMinutes',
  'firstName',
  'generatorSlug',
  'generatorVersion',
  'instructions',
  'isPreview',
  'lastName',
  'email',
  'lessonId',
  'attemptPublicId',
  'maximumAttempts',
  'passingScore',
  'points',
  'position',
  'questionId',
  'quizId',
  'practiceQuestionId',
  'practiceSetId',
  'lessonPublicId',
  'password',
  'questionCount',
  'requiresPrevious',
  'selectedChoiceId',
  'shortDescription',
  'slug',
  'status',
  'subjectId',
  'summary',
  'thumbnailKey',
  'timeLimitMinutes',
  'title',
  'topicId',
  'updatedAt',
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
    const text = await readBoundedJsonBody(context.req.raw)

    body = JSON.parse(text) as unknown
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error
    }

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

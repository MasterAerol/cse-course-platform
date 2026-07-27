import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

import type { AppEnv } from '../types/app'
import type { ApiErrorDetails } from './app-error'

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    requestId: string
    details: ApiErrorDetails
  }
}

export function successResponse<T>(
  context: Context<AppEnv>,
  data: T,
  status: ContentfulStatusCode = 200,
): Response {
  const body: ApiSuccess<T> = {
    success: true,
    data,
  }

  return context.json(body, status)
}

export function errorResponse(
  context: Context<AppEnv>,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  details: ApiErrorDetails = null,
): Response {
  const body: ApiError = {
    success: false,
    error: {
      code,
      message,
      requestId: context.get('requestId'),
      details,
    },
  }

  return context.json(body, status)
}

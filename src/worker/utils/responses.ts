import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

import type { AppEnv } from '../types/app'

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    requestId: string
    details: null
  }
}

export function errorResponse(
  context: Context<AppEnv>,
  status: ContentfulStatusCode,
  code: string,
  message: string,
): Response {
  const body: ApiError = {
    success: false,
    error: {
      code,
      message,
      requestId: context.get('requestId'),
      details: null,
    },
  }

  return context.json(body, status)
}

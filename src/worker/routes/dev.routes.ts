import { Hono } from 'hono'

import { checkDatabaseConnection } from '../services/database.service'
import type { AppEnv } from '../types/app'
import { errorResponse } from '../utils/responses'

export const devRoutes = new Hono<AppEnv>()

devRoutes.get('/database-check', async (context) => {
  if (context.env.ENVIRONMENT !== 'development') {
    return errorResponse(
      context,
      404,
      'NOT_FOUND',
      'The requested resource was not found.',
    )
  }

  const result = await checkDatabaseConnection(context.env.DB)

  return context.json({
    success: true,
    data: result,
  })
})

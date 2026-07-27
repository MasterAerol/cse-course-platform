import { Hono } from 'hono'

import { devRoutes } from './routes/dev.routes'
import { healthRoutes } from './routes/health.routes'
import type { AppEnv } from './types/app'
import { errorResponse } from './utils/responses'

export const app = new Hono<AppEnv>()

app.use('*', async (context, next) => {
  const requestId = crypto.randomUUID()
  context.set('requestId', requestId)
  context.header('x-request-id', requestId)
  await next()
})

app.route('/api/health', healthRoutes)
app.route('/api/dev', devRoutes)

app.notFound((context) =>
  errorResponse(
    context,
    404,
    'NOT_FOUND',
    'The requested resource was not found.',
  ),
)

app.onError((error, context) => {
  console.error('Unhandled Worker error', {
    requestId: context.get('requestId'),
    message: error.message,
  })

  return errorResponse(
    context,
    500,
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred.',
  )
})

export default app

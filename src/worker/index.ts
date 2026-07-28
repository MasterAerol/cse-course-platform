import { Hono } from 'hono'

import { adminRoutes } from './routes/admin.routes'
import { authRoutes } from './routes/auth.routes'
import { courseRoutes } from './routes/course.routes'
import { devRoutes } from './routes/dev.routes'
import { healthRoutes } from './routes/health.routes'
import { practiceRoutes } from './routes/practice.routes'
import { quizRoutes } from './routes/quiz.routes'
import { studentRoutes } from './routes/student.routes'
import type { AppEnv } from './types/app'
import { AppError } from './utils/app-error'
import { errorResponse } from './utils/responses'

export const app = new Hono<AppEnv>()

app.use('*', async (context, next) => {
  const requestId = crypto.randomUUID()
  context.set('requestId', requestId)
  context.header('x-request-id', requestId)
  await next()
})

app.route('/api/health', healthRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/courses', courseRoutes)
app.route('/api/student', studentRoutes)
app.route('/api/student', practiceRoutes)
app.route('/api/student', quizRoutes)
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
  if (error instanceof AppError) {
    return errorResponse(
      context,
      error.status,
      error.code,
      error.message,
      error.details,
    )
  }

  console.error(
    JSON.stringify({
      message: 'Unhandled Worker error',
      requestId: context.get('requestId'),
      error: error.message,
      path: context.req.path,
    }),
  )

  return errorResponse(
    context,
    500,
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred.',
  )
})

export default app

import { Hono } from 'hono'

import {
  applyApiSecurityHeaders,
  requireSameOriginMutation,
} from './middleware/security.middleware'
import { adminRoutes } from './routes/admin.routes'
import { authRoutes } from './routes/auth.routes'
import { configRoutes } from './routes/config.routes'
import { courseRoutes } from './routes/course.routes'
import { devRoutes } from './routes/dev.routes'
import { healthRoutes } from './routes/health.routes'
import { practiceRoutes } from './routes/practice.routes'
import { quizRoutes } from './routes/quiz.routes'
import { smartRecoveryRoutes } from './routes/smart-recovery.routes'
import { studentRoutes } from './routes/student.routes'
import { subjectAssessmentRoutes } from './routes/subject-assessment.routes'
import { mockExamRoutes } from './routes/mock-exam.routes'
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

app.use('/api/*', applyApiSecurityHeaders)
app.use('/api/*', requireSameOriginMutation)

app.route('/api/health', healthRoutes)
app.route('/api/config', configRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/courses', courseRoutes)
app.route('/api/student', studentRoutes)
app.route('/api/student', practiceRoutes)
app.route('/api/student', quizRoutes)
app.route('/api/student', smartRecoveryRoutes)
app.route('/api/student', subjectAssessmentRoutes)
app.route('/api/student', mockExamRoutes)
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
      errorName: error.name,
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

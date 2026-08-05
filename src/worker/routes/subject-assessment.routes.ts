import { Hono } from 'hono'

import { requireAuthentication } from '../middleware/auth.middleware'
import { requireLearnerMutationRateLimit } from '../middleware/rate-limit.middleware'
import {
  saveSubjectAssessmentAnswerSchema,
  subjectAssessmentAnswerParamsSchema,
  subjectAssessmentAttemptParamsSchema,
  subjectAssessmentSlugParamsSchema,
} from '../schemas/subject-assessment.schemas'
import {
  getSubjectAssessmentAttempt,
  getSubjectAssessmentResult,
  getSubjectAssessmentReview,
  getSubjectAssessmentSummary,
  saveSubjectAssessmentAnswer,
  startSubjectAssessmentAttempt,
  submitSubjectAssessmentAttempt,
} from '../services/subject-assessment.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import { parseJsonBody, parseValidatedInput } from '../utils/validation'

export const subjectAssessmentRoutes = new Hono<AppEnv>()
subjectAssessmentRoutes.use('*', requireAuthentication)
subjectAssessmentRoutes.use('*', requireLearnerMutationRateLimit)

subjectAssessmentRoutes.get('/subject-assessments/:assessmentSlug', async (context) => {
  const { assessmentSlug } = parseValidatedInput(subjectAssessmentSlugParamsSchema.safeParse(context.req.param()))
  return successResponse(context, await getSubjectAssessmentSummary(context.env.DB, context.get('authUser').internalUserId, assessmentSlug))
})

subjectAssessmentRoutes.post('/subject-assessments/:assessmentSlug/attempts', async (context) => {
  const { assessmentSlug } = parseValidatedInput(subjectAssessmentSlugParamsSchema.safeParse(context.req.param()))
  return successResponse(context, await startSubjectAssessmentAttempt(context.env.DB, context.get('authUser').internalUserId, assessmentSlug), 201)
})

subjectAssessmentRoutes.get('/subject-assessment-attempts/:attemptPublicId', async (context) => {
  const { attemptPublicId } = parseValidatedInput(subjectAssessmentAttemptParamsSchema.safeParse(context.req.param()))
  return successResponse(context, await getSubjectAssessmentAttempt(context.env.DB, context.get('authUser').internalUserId, attemptPublicId))
})

subjectAssessmentRoutes.put('/subject-assessment-attempts/:attemptPublicId/answers/:snapshotPublicId', async (context) => {
  const params = parseValidatedInput(subjectAssessmentAnswerParamsSchema.safeParse(context.req.param()))
  const input = await parseJsonBody(context, saveSubjectAssessmentAnswerSchema)
  return successResponse(context, await saveSubjectAssessmentAnswer(context.env.DB, context.get('authUser').internalUserId, { ...params, ...input }))
})

subjectAssessmentRoutes.post('/subject-assessment-attempts/:attemptPublicId/submit', async (context) => {
  const { attemptPublicId } = parseValidatedInput(subjectAssessmentAttemptParamsSchema.safeParse(context.req.param()))
  return successResponse(context, await submitSubjectAssessmentAttempt(context.env.DB, context.get('authUser').internalUserId, attemptPublicId))
})

subjectAssessmentRoutes.get('/subject-assessment-attempts/:attemptPublicId/results', async (context) => {
  const { attemptPublicId } = parseValidatedInput(subjectAssessmentAttemptParamsSchema.safeParse(context.req.param()))
  return successResponse(context, await getSubjectAssessmentResult(context.env.DB, context.get('authUser').internalUserId, attemptPublicId))
})

subjectAssessmentRoutes.get('/subject-assessment-attempts/:attemptPublicId/review', async (context) => {
  const { attemptPublicId } = parseValidatedInput(subjectAssessmentAttemptParamsSchema.safeParse(context.req.param()))
  return successResponse(context, await getSubjectAssessmentReview(context.env.DB, context.get('authUser').internalUserId, attemptPublicId))
})

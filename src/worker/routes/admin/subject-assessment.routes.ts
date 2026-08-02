import { Hono } from 'hono'

import {
  adminSubjectAssessmentInputSchema,
  subjectAssessmentSlugParamsSchema,
} from '../../schemas/subject-assessment.schemas'
import {
  getAdminSubjectAssessment,
  saveAdminSubjectAssessment,
  validateAdminSubjectAssessment,
} from '../../services/subject-assessment.service'
import type { AppEnv } from '../../types/app'
import { successResponse } from '../../utils/responses'
import { parseJsonBody, parseValidatedInput } from '../../utils/validation'

export const adminSubjectAssessmentRoutes = new Hono<AppEnv>()

adminSubjectAssessmentRoutes.get('/subject-assessments/:assessmentSlug', async (context) => {
  const { assessmentSlug } = parseValidatedInput(subjectAssessmentSlugParamsSchema.safeParse(context.req.param()))
  return successResponse(context, await getAdminSubjectAssessment(context.env.DB, assessmentSlug))
})

adminSubjectAssessmentRoutes.put('/subject-assessments/:assessmentSlug', async (context) => {
  const { assessmentSlug } = parseValidatedInput(subjectAssessmentSlugParamsSchema.safeParse(context.req.param()))
  const input = await parseJsonBody(context, adminSubjectAssessmentInputSchema)
  if (input.slug !== assessmentSlug) {
    return context.json({ success: false, error: { code: 'ASSESSMENT_SLUG_MISMATCH', message: 'The route and body assessment slugs must match.' } }, 400)
  }
  return successResponse(context, await saveAdminSubjectAssessment(context.env.DB, context.get('authUser'), input))
})

adminSubjectAssessmentRoutes.post('/subject-assessments/:assessmentSlug/validate', async (context) => {
  const { assessmentSlug } = parseValidatedInput(subjectAssessmentSlugParamsSchema.safeParse(context.req.param()))
  return successResponse(context, await validateAdminSubjectAssessment(context.env.DB, assessmentSlug))
})

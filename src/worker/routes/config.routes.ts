import { Hono } from 'hono'

import { getConfiguredCseExamDates } from '../config/exam-target'
import { getGoogleClientId } from '../config/google'
import { getRegistrationMode } from '../config/registration'
import { isEffectivePublicSignupEnabled } from '../services/commercial.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'

export const configRoutes = new Hono<AppEnv>()

configRoutes.get('/', async (context) => {
  const registrationMode = getRegistrationMode(context.env)
  const registrationEnabled = await isEffectivePublicSignupEnabled(
    context.env.DB,
    registrationMode,
  )
  return successResponse(context, {
    registrationMode: registrationEnabled ? 'open' : 'closed',
    googleClientId: getGoogleClientId(context.env),
    cseExamDates: getConfiguredCseExamDates(),
  })
})

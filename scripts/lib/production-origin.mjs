export const CANONICAL_PRODUCTION_ORIGIN = 'https://pasawise.com'
export const TRANSITION_WORKERS_DEV_ORIGIN =
  'https://cse-course-platform.master-course.workers.dev'

export const CANONICAL_HEALTH_URL =
  `${CANONICAL_PRODUCTION_ORIGIN}/api/health`
export const TRANSITION_HEALTH_URL =
  `${TRANSITION_WORKERS_DEV_ORIGIN}/api/health`

export const GOOGLE_AUTHORIZED_JAVASCRIPT_ORIGINS = Object.freeze([
  CANONICAL_PRODUCTION_ORIGIN,
  TRANSITION_WORKERS_DEV_ORIGIN,
  'http://localhost:5173',
])
